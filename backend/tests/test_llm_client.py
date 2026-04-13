"""Unit tests for LLM client provider error handling and logging."""

from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.core.config import settings
from app.services.llm_client import call_openrouter, call_xai, generate_image_xai


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


def test_call_xai_logs_body_on_non_200_response(caplog, monkeypatch):
    monkeypatch.setattr(settings, "XAI_API_KEY", "test-xai-key")

    response = httpx.Response(
        404,
        json={"error": "Not Found"},
        request=httpx.Request("POST", "https://api.x.ai/v1/chat/completions"),
    )

    with patch(
        "app.services.llm_client.httpx.Client",
        return_value=_mock_httpx_client_with_response(response),
    ):
        with pytest.raises(httpx.HTTPStatusError):
            call_xai(model_id="grok-4", contents=["hello"])

    assert "non-200 response" in caplog.text
    assert "status=404" in caplog.text
    assert '"error":"Not Found"' in caplog.text


def test_generate_image_xai_logs_body_when_data_missing(caplog, monkeypatch):
    monkeypatch.setattr(settings, "XAI_API_KEY", "test-xai-key")

    response = httpx.Response(
        200,
        json={"result": "ok"},
        request=httpx.Request("POST", "https://api.x.ai/v1/images/generations"),
    )

    with patch(
        "app.services.llm_client.httpx.Client",
        return_value=_mock_httpx_client_with_response(response),
    ):
        with pytest.raises(KeyError, match="data"):
            generate_image_xai(model_id="grok-2-image", prompt="red shoes")

    assert "missing or empty 'data' in response" in caplog.text
    assert '"result":"ok"' in caplog.text
