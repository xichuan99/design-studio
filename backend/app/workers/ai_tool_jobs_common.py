"""Shared helpers for AI tool job workers."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import update

from app.core.database import AsyncSessionLocal
from app.models.ai_tool_job import AiToolJob

logger = logging.getLogger(__name__)


def run_async(coro):
    """Helper to run async code inside a sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def update_ai_tool_job(job_id: str, **fields):
    async with AsyncSessionLocal() as session:
        await session.execute(
            update(AiToolJob).where(AiToolJob.id == job_id).values(**fields)
        )
        await session.commit()


async def refund_ai_tool_job_if_needed(session, job: AiToolJob, reason: str):
    payload = dict(job.payload_json or {})
    charged = int(payload.get("_charged_credits", 0) or 0)
    already_refunded = bool(payload.get("_refunded", False))
    if charged <= 0 or already_refunded:
        return

    from app.models.user import User
    from app.services.credit_service import log_credit_change

    user_record = await session.get(User, job.user_id)
    if user_record:
        await log_credit_change(session, user_record, charged, reason)
        payload["_refunded"] = True
        job.payload_json = payload
        session.add(job)


async def set_ai_tool_job_canceled(
    session,
    job: AiToolJob,
    reason: str | None = None,
):
    job.status = "canceled"
    job.phase_message = "Job dibatalkan"
    job.progress_percent = 100
    job.finished_at = datetime.now(timezone.utc)
    session.add(job)
    if reason:
        await refund_ai_tool_job_if_needed(session, job, reason)
