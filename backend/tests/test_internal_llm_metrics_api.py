from unittest.mock import patch
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.core.database import get_db
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


def test_operator_summary_requires_internal_token(monkeypatch):
    monkeypatch.setattr("app.api.internal_metrics.settings.INTERNAL_METRICS_TOKEN", "secret-token")
    response = client.get("/api/internal/operator-summary")
    assert response.status_code == 401


def test_operator_summary_returns_paid_beta_snapshot(monkeypatch):
    monkeypatch.setattr("app.api.internal_metrics.settings.INTERNAL_METRICS_TOKEN", "secret-token")

    async def override_db():
        yield object()

    app.dependency_overrides[get_db] = override_db
    try:
        with (
            patch("app.api.internal_metrics._scalar_int", new_callable=AsyncMock) as scalar_int,
            patch("app.api.internal_metrics._scalar_float", new_callable=AsyncMock) as scalar_float,
            patch("app.api.internal_metrics._count_by_status", new_callable=AsyncMock) as count_by_status,
            patch("app.api.internal_metrics._ai_usage_by_operation", new_callable=AsyncMock) as by_operation,
            patch("app.api.internal_metrics._recent_failures", new_callable=AsyncMock) as recent_failures,
            patch("app.api.internal_metrics._recent_feedback", new_callable=AsyncMock) as recent_feedback,
            patch("app.api.internal_metrics._weekly_beta_review", new_callable=AsyncMock) as weekly_beta_review,
        ):
            scalar_int.side_effect = [12, 3, 8, 320, 400, 80, 149000, 4]
            scalar_float.side_effect = [1.25, 2.5, 4.5]
            count_by_status.side_effect = [
                {"completed": 5, "failed": 1},
                {"queued": 2, "completed": 4},
                {"succeeded": 6, "refunded": 1},
                {"paid": 1, "pending": 2},
            ]
            by_operation.return_value = [
                {
                    "operation": "generate_design",
                    "count": 5,
                    "credits_charged": 200,
                    "actual_cost": 1.0,
                    "estimated_cost": 2.0,
                }
            ]
            recent_failures.return_value = []
            recent_feedback.return_value = []
            weekly_beta_review.return_value = {
                "window_days": 7,
                "funnel": {
                    "visitor_to_signup": {"count": None, "rate_percent": None, "note": "Use PostHog"},
                    "signup_to_first_design": {"count": 2, "rate_percent": 66.67},
                    "first_design_to_generation": {"count": 2, "rate_percent": 100.0},
                    "generation_to_export": {"count": 1, "rate_percent": 50.0},
                    "export_to_payment": {"count": 1, "rate_percent": 100.0},
                    "payment_to_repeat_use": {"count": 1, "rate_percent": 50.0},
                },
                "cost": {
                    "ai_actual_cost_7d": 1.25,
                    "paying_users_30d": 2,
                    "ai_cost_per_paying_user": 0.625,
                },
            }

            response = client.get(
                "/api/internal/operator-summary",
                headers={"X-Internal-Token": "secret-token"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["users"]["total"] == 12
        assert data["users"]["new_7d"] == 3
        assert data["jobs"]["pending_work"]["ai_tool_jobs"] == 2
        assert data["ai_usage"]["last_7d"]["credits_charged"] == 320
        assert data["ai_usage"]["last_7d"]["by_operation"][0]["operation"] == "generate_design"
        assert data["payments"]["storage_revenue_30d_idr"] == 149000
        assert data["feedback"]["count_7d"] == 4
        assert data["feedback"]["average_rating_7d"] == 4.5
        assert data["weekly_beta_review"]["funnel"]["signup_to_first_design"]["count"] == 2
    finally:
        app.dependency_overrides.clear()
