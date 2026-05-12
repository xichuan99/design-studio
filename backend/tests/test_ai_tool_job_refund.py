from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.workers.ai_tool_jobs_common import (
    refund_ai_tool_job_if_needed,
    set_ai_tool_job_canceled,
)


@pytest.mark.asyncio
@patch("app.services.credit_service.log_credit_change", new_callable=AsyncMock)
@patch("app.services.ai_usage_service.update_usage_for_job", new_callable=AsyncMock)
async def test_refund_ai_tool_job_if_needed_refunds_once(
    mock_update_usage_for_job,
    mock_log_credit_change,
):
    session = AsyncMock()
    session.add = MagicMock()
    session.get = AsyncMock(return_value=SimpleNamespace(id="user-1"))

    job = SimpleNamespace(
        id="job-1",
        user_id="user-1",
        status="failed",
        payload_json={"_charged_credits": 40},
    )

    await refund_ai_tool_job_if_needed(session, job, "Refund reason")

    mock_log_credit_change.assert_awaited_once_with(
        session,
        session.get.return_value,
        40,
        "Refund reason",
    )
    assert job.payload_json.get("_refunded") is True
    session.add.assert_called_once_with(job)
    mock_update_usage_for_job.assert_awaited_once()


@pytest.mark.asyncio
@patch("app.services.credit_service.log_credit_change", new_callable=AsyncMock)
async def test_refund_ai_tool_job_if_needed_skips_when_already_refunded(
    mock_log_credit_change,
):
    session = AsyncMock()
    session.add = MagicMock()
    session.get = AsyncMock(return_value=SimpleNamespace(id="user-1"))

    job = SimpleNamespace(
        user_id="user-1",
        payload_json={"_charged_credits": 40, "_refunded": True},
    )

    await refund_ai_tool_job_if_needed(session, job, "Refund reason")

    mock_log_credit_change.assert_not_awaited()
    session.add.assert_not_called()


@pytest.mark.asyncio
@patch("app.services.credit_service.log_credit_change", new_callable=AsyncMock)
async def test_refund_ai_tool_job_if_needed_skips_when_no_charge(mock_log_credit_change):
    session = AsyncMock()
    session.add = MagicMock()
    session.get = AsyncMock(return_value=SimpleNamespace(id="user-1"))

    job = SimpleNamespace(
        user_id="user-1",
        payload_json={"_charged_credits": 0},
    )

    await refund_ai_tool_job_if_needed(session, job, "Refund reason")

    mock_log_credit_change.assert_not_awaited()
    session.add.assert_not_called()


@pytest.mark.asyncio
@patch("app.services.credit_service.log_credit_change", new_callable=AsyncMock)
@patch("app.services.ai_usage_service.update_usage_for_job", new_callable=AsyncMock)
async def test_set_ai_tool_job_canceled_sets_terminal_fields_and_refunds(
    mock_update_usage_for_job,
    mock_log_credit_change,
):
    session = AsyncMock()
    session.add = MagicMock()
    session.get = AsyncMock(return_value=SimpleNamespace(id="user-1"))

    job = SimpleNamespace(
        id="job-1",
        user_id="user-1",
        status="processing",
        phase_message="",
        progress_percent=0,
        finished_at=None,
        payload_json={"_charged_credits": 10},
    )

    await set_ai_tool_job_canceled(session, job, "Refund: canceled")

    assert job.status == "canceled"
    assert job.phase_message == "Job dibatalkan"
    assert job.progress_percent == 100
    assert isinstance(job.finished_at, datetime)
    assert job.payload_json.get("_refunded") is True
    mock_log_credit_change.assert_awaited_once_with(
        session,
        session.get.return_value,
        10,
        "Refund: canceled",
    )
    # Called at least once for status update and once for refund payload update.
    assert session.add.call_count >= 1
    mock_update_usage_for_job.assert_awaited_once()
