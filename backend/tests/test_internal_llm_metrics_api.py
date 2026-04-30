from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_internal_llm_metrics_requires_configured_token(monkeypatch):
    monkeypatch.setattr("app.api.internal_metrics.settings.INTERNAL_METRICS_TOKEN", "")
    response = client.get("/api/internal/llm-metrics")
    assert response.status_code == 403


def test_internal_llm_metrics_requires_header(monkeypatch):
    monkeypatch.setattr("app.api.internal_metrics.settings.INTERNAL_METRICS_TOKEN", "secret-token")
    response = client.get("/api/internal/llm-metrics")
    assert response.status_code == 401


def test_internal_llm_metrics_returns_snapshot_with_valid_token(monkeypatch):
    monkeypatch.setattr("app.api.internal_metrics.settings.INTERNAL_METRICS_TOKEN", "secret-token")
    with patch("app.api.internal_metrics.get_llm_metrics_snapshot") as mock_snapshot:
        mock_snapshot.return_value = {
            "available": True,
            "events": {"llm.primary.rate_limited": 2},
            "models": {"llm.primary.rate_limited": {"openrouter/deepseek/deepseek-v4-flash": 2}},
        }

        response = client.get(
            "/api/internal/llm-metrics",
            headers={"X-Internal-Token": "secret-token"},
        )

    assert response.status_code == 200
    assert response.json()["available"] is True
    assert response.json()["events"]["llm.primary.rate_limited"] == 2
