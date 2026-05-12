"""Service helpers for the AI usage/cost audit ledger."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_usage_event import AiUsageEvent


TERMINAL_USAGE_STATUSES = {"succeeded", "failed", "refunded", "canceled"}


def _decimal_or_none(value: Decimal | float | int | str | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))


async def record_ai_usage_charge(
    db: AsyncSession,
    *,
    user_id: UUID,
    operation: str,
    source: str,
    credits_charged: int,
    job_id: UUID | None = None,
    ai_tool_job_id: UUID | None = None,
    credit_transaction_id: UUID | None = None,
    provider: str | None = None,
    model: str | None = None,
    quality: str | None = None,
    estimated_cost: Decimal | float | int | str | None = None,
    actual_cost: Decimal | float | int | str | None = None,
    currency: str = "USD",
    metadata: dict[str, Any] | None = None,
) -> AiUsageEvent:
    event = AiUsageEvent(
        user_id=user_id,
        job_id=job_id,
        ai_tool_job_id=ai_tool_job_id,
        credit_transaction_id=credit_transaction_id,
        operation=operation,
        source=source,
        status="charged",
        provider=provider,
        model=model,
        quality=quality,
        estimated_cost=_decimal_or_none(estimated_cost),
        actual_cost=_decimal_or_none(actual_cost),
        currency=currency,
        credits_charged=credits_charged,
        event_metadata=metadata or {},
    )
    db.add(event)
    await db.flush()
    return event


async def get_usage_event_for_job(
    db: AsyncSession,
    *,
    job_id: UUID | str | None = None,
    ai_tool_job_id: UUID | str | None = None,
) -> AiUsageEvent | None:
    if job_id is None and ai_tool_job_id is None:
        return None

    query = select(AiUsageEvent)
    if job_id is not None:
        query = query.where(AiUsageEvent.job_id == job_id)
    if ai_tool_job_id is not None:
        query = query.where(AiUsageEvent.ai_tool_job_id == ai_tool_job_id)

    result = await db.execute(query.order_by(AiUsageEvent.created_at.desc()))
    return result.scalars().first()


async def update_ai_usage_event(
    db: AsyncSession,
    event: AiUsageEvent | None,
    *,
    status: str | None = None,
    provider: str | None = None,
    model: str | None = None,
    quality: str | None = None,
    credits_charged: int | None = None,
    estimated_cost: Decimal | float | int | str | None = None,
    actual_cost: Decimal | float | int | str | None = None,
    refund_transaction_id: UUID | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> AiUsageEvent | None:
    if event is None:
        return None

    if status is not None:
        event.status = status
        if status in TERMINAL_USAGE_STATUSES:
            event.completed_at = datetime.now(timezone.utc)
    if provider is not None:
        event.provider = provider
    if model is not None:
        event.model = model
    if quality is not None:
        event.quality = quality
    if credits_charged is not None:
        event.credits_charged = credits_charged
    if estimated_cost is not None:
        event.estimated_cost = _decimal_or_none(estimated_cost)
    if actual_cost is not None:
        event.actual_cost = _decimal_or_none(actual_cost)
    if refund_transaction_id is not None:
        event.refund_transaction_id = refund_transaction_id
    if error_code is not None:
        event.error_code = error_code
    if error_message is not None:
        event.error_message = error_message
    if metadata:
        event.event_metadata = {**(event.event_metadata or {}), **metadata}

    db.add(event)
    await db.flush()
    return event


async def update_usage_for_job(
    db: AsyncSession,
    *,
    job_id: UUID | str | None = None,
    ai_tool_job_id: UUID | str | None = None,
    **updates: Any,
) -> AiUsageEvent | None:
    event = await get_usage_event_for_job(db, job_id=job_id, ai_tool_job_id=ai_tool_job_id)
    return await update_ai_usage_event(db, event, **updates)


async def mark_ai_tool_usage_from_status(
    db: AsyncSession,
    *,
    ai_tool_job_id: UUID | str,
    status: str,
    error_message: str | None = None,
) -> AiUsageEvent | None:
    if status == "completed":
        return await update_usage_for_job(
            db,
            ai_tool_job_id=ai_tool_job_id,
            status="succeeded",
        )
    if status == "failed":
        return await update_usage_for_job(
            db,
            ai_tool_job_id=ai_tool_job_id,
            status="failed",
            error_message=error_message,
        )
    if status == "canceled":
        return await update_usage_for_job(
            db,
            ai_tool_job_id=ai_tool_job_id,
            status="canceled",
            error_message=error_message,
        )
    return None
