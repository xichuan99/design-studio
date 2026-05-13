from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.api.internal_metrics import _get_cohort_d1_d7_retention, _weekly_beta_review, _visitor_to_signup_metrics


@pytest.mark.asyncio
async def test_get_cohort_d1_d7_retention_counts_export_generation_and_usage() -> None:
    db = AsyncMock()

    def result(rows):
        mock_result = MagicMock()
        mock_result.all.return_value = rows
        return mock_result

    user_1 = "user-1"
    user_2 = "user-2"

    db.execute.side_effect = [
        result([("2026-05-12", 2)]),
        result([(user_1,), (user_2,)]),
        result([(user_1,)]),
        result([]),
        result([(user_2,)]),
        result([(user_1,)]),
        result([(user_2,)]),
        result([]),
    ]

    retention = await _get_cohort_d1_d7_retention(db)

    assert retention["2026-05-12"]["d0_users"] == 2
    assert retention["2026-05-12"]["d1_users"] == 2
    assert retention["2026-05-12"]["d7_users"] == 2
    assert retention["2026-05-12"]["d1_retention_percent"] == 100.0
    assert retention["2026-05-12"]["d7_retention_percent"] == 100.0


@pytest.mark.asyncio
async def test_visitor_to_signup_metrics_use_backend_events() -> None:
    db = AsyncMock()

    def result(rows, scalar_value):
        mock_result = MagicMock()
        mock_result.scalar.return_value = scalar_value
        mock_result.all.return_value = rows
        return mock_result

    db.execute.side_effect = [
        result([("v1",), ("v2",)], 2),
        result([("v2",), ("v3",)], 2),
        result([], 1),
    ]

    metrics = await _visitor_to_signup_metrics(db, datetime.now(timezone.utc) - timedelta(days=7))

    assert metrics["visitors"] == 2
    assert metrics["signups"] == 2
    assert metrics["converted"] == 1


@pytest.mark.asyncio
async def test_weekly_beta_review_uses_backend_export_events_and_repeat_purchases() -> None:
    db = object()
    since_7d = datetime.now(timezone.utc) - timedelta(days=7)
    since_30d = datetime.now(timezone.utc) - timedelta(days=30)

    with (
        patch("app.api.internal_metrics._scalar_int", new_callable=AsyncMock) as scalar_int,
        patch("app.api.internal_metrics._scalar_float", new_callable=AsyncMock) as scalar_float,
        patch("app.api.internal_metrics._visitor_to_signup_metrics", new_callable=AsyncMock) as visitor_to_signup,
        patch("app.api.internal_metrics._count_users_with_export_events", new_callable=AsyncMock) as export_events,
        patch("app.api.internal_metrics._count_repeat_purchasers_within_30d", new_callable=AsyncMock) as repeat_purchasers,
        patch("app.api.internal_metrics._get_cohort_d1_d7_retention", new_callable=AsyncMock) as cohort_retention,
    ):
        scalar_int.side_effect = [10, 5, 4, 3, 2, 1]
        scalar_float.return_value = 12.3456
        visitor_to_signup.return_value = {"visitors": 20, "signups": 4, "converted": 3}
        export_events.return_value = 2
        repeat_purchasers.return_value = 1
        cohort_retention.return_value = {
            "2026-05-12": {
                "d0_users": 2,
                "d1_users": 1,
                "d7_users": 2,
                "d1_retention_percent": 50.0,
                "d7_retention_percent": 100.0,
            }
        }

        review = await _weekly_beta_review(db, since_7d, since_30d)

    assert review["funnel"]["generation_to_export"]["count"] == 2
    assert review["funnel"]["visitor_to_signup"]["visitors"] == 20
    assert review["funnel"]["visitor_to_signup"]["count"] == 3
    assert review["funnel"]["export_to_payment"]["rate_percent"] == 100.0
    assert review["funnel"]["payment_to_repeat_purchase"]["count"] == 1
    assert review["retention"]["2026-05-12"]["d7_retention_percent"] == 100.0
