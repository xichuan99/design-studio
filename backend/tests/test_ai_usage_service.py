from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.ai_usage_event import AiUsageEvent
from app.services.ai_usage_service import record_ai_usage_charge, update_ai_usage_event


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.flush = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_record_ai_usage_charge_creates_audit_event(mock_db):
    user_id = uuid4()
    job_id = uuid4()
    credit_tx_id = uuid4()

    event = await record_ai_usage_charge(
        mock_db,
        user_id=user_id,
        job_id=job_id,
        operation="generate_design",
        source="create_flow",
        credits_charged=40,
        credit_transaction_id=credit_tx_id,
        provider="fal.ai",
        model="flux",
        quality="pro",
        estimated_cost="0.020000",
        metadata={"aspect_ratio": "1:1"},
    )

    assert isinstance(event, AiUsageEvent)
    assert event.user_id == user_id
    assert event.job_id == job_id
    assert event.credit_transaction_id == credit_tx_id
    assert event.operation == "generate_design"
    assert event.status == "charged"
    assert event.credits_charged == 40
    assert event.provider == "fal.ai"
    assert event.model == "flux"
    assert event.event_metadata == {"aspect_ratio": "1:1"}
    mock_db.add.assert_called_once_with(event)
    mock_db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_ai_usage_event_marks_terminal_status(mock_db):
    event = SimpleNamespace(
        status="charged",
        provider=None,
        model=None,
        quality=None,
        credits_charged=40,
        estimated_cost=None,
        actual_cost=None,
        refund_transaction_id=None,
        error_code=None,
        error_message=None,
        event_metadata={},
        completed_at=None,
    )

    updated = await update_ai_usage_event(
        mock_db,
        event,
        status="refunded",
        refund_transaction_id=uuid4(),
        error_code="system_error",
        error_message="provider failed",
        metadata={"retryable": False},
    )

    assert updated is event
    assert event.status == "refunded"
    assert event.completed_at is not None
    assert event.error_code == "system_error"
    assert event.error_message == "provider failed"
    assert event.event_metadata == {"retryable": False}
    mock_db.add.assert_called_once_with(event)
    mock_db.flush.assert_awaited_once()
