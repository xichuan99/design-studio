"""Unit tests for LLM client provider error handling and logging."""

from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.core.config import settings
from app.services.llm_client import call_openrouter


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

