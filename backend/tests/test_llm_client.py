"""Unit tests for LLM client provider error handling and logging."""

from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.core.config import settings
from app.services.llm_client import (
    LLMRateLimitError,
    call_gemini_with_fallback,
    call_openrouter,
)


@pytest.fixture(autouse=True)
def _isolate_llm_cooldown_state():
    """Prevent real Redis writes from polluting cooldown state between tests.

    Tests that need specific cooldown behaviour override these patches locally
    with their own ``with patch(...)`` context managers.
    """
    with patch("app.services.llm_client.mark_model_cooldown"), patch(
        "app.services.llm_client.get_model_cooldown_remaining", return_value=0
    ):
        yield


def _mock_httpx_client_with_response(response: httpx.Response) -> MagicMock:
    client = MagicMock()
    client.post.return_value = response
    context_manager = MagicMock()
    context_manager.__enter__.return_value = client
    context_manager.__exit__.return_value = False
    return context_manager


def test_call_openrouter_logs_full_body_when_choices_missing(caplog, monkeypatch):
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-openrouter-key")

    response = httpx.Response(
        200,
        json={"error": "unexpected payload"},
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )

    with patch(
        "app.services.llm_client.httpx.Client",
        return_value=_mock_httpx_client_with_response(response),
    ):
        with pytest.raises(KeyError, match="choices"):
            call_openrouter(model_id="openai/gpt-4o-mini", contents=["hello"])

    assert "missing or empty 'choices' in response" in caplog.text
    assert '"error":"unexpected payload"' in caplog.text


def test_call_openrouter_caps_default_max_tokens_for_minimax(monkeypatch):
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-openrouter-key")

    response = httpx.Response(
        200,
        json={"choices": [{"message": {"content": "{}"}}]},
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )

    with patch(
        "app.services.llm_client.httpx.Client",
        return_value=_mock_httpx_client_with_response(response),
    ) as client_factory:
        call_openrouter(model_id="minimax/minimax-01", contents=["hello"])

    posted_payload = client_factory.return_value.__enter__.return_value.post.call_args.kwargs[
        "json"
    ]
    assert posted_payload["max_tokens"] == 4000


def test_call_gemini_with_fallback_does_not_failover_on_rate_limit():
    client = MagicMock()
    primary_error = httpx.HTTPStatusError(
        "429 Too Many Requests",
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
        response=httpx.Response(429),
    )
    client.models.generate_content.side_effect = primary_error

    with pytest.raises(LLMRateLimitError) as exc_info:
        call_gemini_with_fallback(
            client=client,
            primary_model="gemini-2.0-flash",
            fallback_model="gemini-2.0-pro",
            contents=["hello"],
            config=MagicMock(),
        )

    assert exc_info.value.retry_after_seconds == 30
    assert client.models.generate_content.call_count == 1


def test_call_gemini_with_fallback_uses_retry_after_hint_from_error_body():
    client = MagicMock()
    primary_error = httpx.HTTPStatusError(
        "429 RESOURCE_EXHAUSTED. Please retry in 39.334030145s.",
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
        response=httpx.Response(429),
    )
    client.models.generate_content.side_effect = primary_error

    with pytest.raises(LLMRateLimitError) as exc_info:
        call_gemini_with_fallback(
            client=client,
            primary_model="gemini-2.0-flash",
            fallback_model="gemini-2.0-pro",
            contents=["hello"],
            config=MagicMock(),
        )

    assert exc_info.value.retry_after_seconds == 39


def test_call_gemini_with_fallback_failsover_on_provider_outage():
    client = MagicMock()
    primary_error = httpx.HTTPStatusError(
        "503 Service Unavailable",
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
        response=httpx.Response(503),
    )
    fallback_response = MagicMock(text="ok")
    client.models.generate_content.side_effect = [primary_error, fallback_response]

    result = call_gemini_with_fallback(
        client=client,
        primary_model="gemini-2.0-flash",
        fallback_model="gemini-2.0-pro",
        contents=["hello"],
        config=MagicMock(),
    )

    assert result is fallback_response
    assert client.models.generate_content.call_count == 2


def test_call_gemini_with_fallback_routes_to_fallback_when_primary_in_cooldown():
    client = MagicMock()
    fallback_response = MagicMock(text="fallback-ok")
    client.models.generate_content.return_value = fallback_response

    with patch(
        "app.services.llm_client.get_model_cooldown_remaining",
        side_effect=[25, 0],
    ):
        result = call_gemini_with_fallback(
            client=client,
            primary_model="gemini-2.0-flash",
            fallback_model="gemini-2.0-pro",
            contents=["hello"],
            config=MagicMock(),
        )

    assert result is fallback_response
    assert client.models.generate_content.call_count == 1
    call_kwargs = client.models.generate_content.call_args.kwargs
    assert call_kwargs["model"] == "gemini-2.0-pro"


def test_call_gemini_with_fallback_marks_primary_cooldown_on_rate_limit():
    client = MagicMock()
    primary_error = httpx.HTTPStatusError(
        "429 RESOURCE_EXHAUSTED. Please retry in 39.334030145s.",
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
        response=httpx.Response(429),
    )
    client.models.generate_content.side_effect = primary_error

    with patch("app.services.llm_client.mark_model_cooldown") as mock_mark_cooldown:
        with pytest.raises(LLMRateLimitError):
            call_gemini_with_fallback(
                client=client,
                primary_model="gemini-2.0-flash",
                fallback_model="gemini-2.0-pro",
                contents=["hello"],
                config=MagicMock(),
            )

    mock_mark_cooldown.assert_called_once_with("gemini-2.0-flash", 39)


def test_call_gemini_with_fallback_uses_fallback_when_primary_slot_is_saturated():
    client = MagicMock()
    fallback_response = MagicMock(text="fallback-ok")
    client.models.generate_content.return_value = fallback_response

    with patch("app.services.llm_client.acquire_model_slot", side_effect=[False, True]), patch(
        "app.services.llm_client.release_model_slot"
    ) as mock_release:
        result = call_gemini_with_fallback(
            client=client,
            primary_model="gemini-2.0-flash",
            fallback_model="gemini-2.0-pro",
            contents=["hello"],
            config=MagicMock(),
        )

    assert result is fallback_response
    assert client.models.generate_content.call_count == 1
    assert client.models.generate_content.call_args.kwargs["model"] == "gemini-2.0-pro"
    mock_release.assert_called_once_with("gemini-2.0-pro")


def test_call_gemini_with_fallback_emits_structured_log_for_cooldown_route(caplog):
    client = MagicMock()
    fallback_response = MagicMock(text="fallback-ok")
    client.models.generate_content.return_value = fallback_response

    with patch(
        "app.services.llm_client.get_model_cooldown_remaining",
        side_effect=[25, 0],
    ):
        with caplog.at_level("INFO"):
            call_gemini_with_fallback(
                client=client,
                primary_model="gemini-2.0-flash",
                fallback_model="gemini-2.0-pro",
                contents=["hello"],
                config=MagicMock(),
            )

    cooldown_records = [
        record
        for record in caplog.records
        if getattr(record, "llm_event", None) == "llm.primary.cooldown_route"
    ]
    assert len(cooldown_records) == 1
    assert cooldown_records[0].llm_model_id == "gemini-2.0-flash"
    assert cooldown_records[0].cooldown_remaining_seconds == 25
    assert cooldown_records[0].fallback_model_id == "gemini-2.0-pro"


def test_call_gemini_with_fallback_emits_structured_log_for_rate_limit(caplog):
    client = MagicMock()
    primary_error = httpx.HTTPStatusError(
        "429 RESOURCE_EXHAUSTED. Please retry in 39.334030145s.",
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
        response=httpx.Response(429),
    )
    client.models.generate_content.side_effect = primary_error

    with patch("app.services.llm_client.mark_model_cooldown"):
        with caplog.at_level("WARNING"):
            with pytest.raises(LLMRateLimitError):
                call_gemini_with_fallback(
                    client=client,
                    primary_model="gemini-2.0-flash",
                    fallback_model="gemini-2.0-pro",
                    contents=["hello"],
                    config=MagicMock(),
                )

    rate_limit_records = [
        record
        for record in caplog.records
        if getattr(record, "llm_event", None) == "llm.primary.rate_limited"
    ]
    assert len(rate_limit_records) == 1
    assert rate_limit_records[0].llm_model_id == "gemini-2.0-flash"
    assert rate_limit_records[0].retry_after_seconds == 39

