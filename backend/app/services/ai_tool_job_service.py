"""Service layer for AI tool job lifecycle operations."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_tool_job import AiToolJob


TERMINAL_STATUSES = {"completed", "failed", "canceled"}


def serialize_job(job: AiToolJob) -> dict[str, Any]:
    payload = job.payload_json or {}
    return {
        "job_id": str(job.id),
        "tool_name": job.tool_name,
        "status": job.status,
        "progress_percent": job.progress_percent,
        "phase_message": job.phase_message,
        "result_url": job.result_url,
        "error_message": job.error_message,
        "cancel_requested": job.cancel_requested,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
        "result_meta": payload.get("_result_meta"),
    }


async def create_job(
    db: AsyncSession,
    user_id: UUID,
    tool_name: str,
    payload: dict[str, Any],
    idempotency_key: str | None = None,
) -> tuple[AiToolJob, bool]:
    if idempotency_key:
        existing_result = await db.execute(
            select(AiToolJob).where(
                AiToolJob.user_id == user_id,
                AiToolJob.idempotency_key == idempotency_key,
            )
        )
        existing_job = existing_result.scalar_one_or_none()
        if existing_job:
            return existing_job, False

    job = AiToolJob(
        user_id=user_id,
        tool_name=tool_name,
        status="queued",
        payload_json=payload,
        progress_percent=0,
        phase_message="Menunggu antrean proses AI",
        idempotency_key=idempotency_key,
        cancel_requested=False,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job, True


async def get_job_for_user(
    db: AsyncSession,
    *,
    job_id: UUID,
    user_id: UUID,
) -> AiToolJob | None:
    result = await db.execute(
        select(AiToolJob).where(AiToolJob.id == job_id, AiToolJob.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def list_jobs_for_user(
    db: AsyncSession,
    *,
    user_id: UUID,
    tool_name: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[AiToolJob]:
    query = select(AiToolJob).where(AiToolJob.user_id == user_id)
    if tool_name:
        query = query.where(AiToolJob.tool_name == tool_name)

    query = query.order_by(desc(AiToolJob.created_at)).offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def request_cancel_job(
    db: AsyncSession,
    *,
    job: AiToolJob,
) -> AiToolJob:
    if job.status in TERMINAL_STATUSES:
        return job

    job.cancel_requested = True
    job.phase_message = "Pembatalan sedang diproses"
    if job.status == "queued":
        job.status = "canceled"
        job.finished_at = datetime.now(timezone.utc)

    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job
