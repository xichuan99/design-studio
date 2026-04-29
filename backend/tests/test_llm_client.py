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

