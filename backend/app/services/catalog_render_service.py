from __future__ import annotations

import asyncio
import os
from typing import Any, Dict
from uuid import UUID

import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import InsufficientCreditsError
from app.models.user import User
from app.schemas.catalog import CatalogRenderStartRequest
from app.services.ai_tool_job_service import create_job, get_job_for_user
from app.services.credit_service import log_credit_change

CATALOG_RENDER_TOOL_NAME = "catalog_render"
CATALOG_RENDER_CREDIT_PER_PAGE = 1

logger = logging.getLogger(__name__)


async def _tracked_run_ai_tool_job(job_id: str) -> None:
    """Wrapper that guarantees AiToolJob status becomes 'failed' on unhandled crash."""
    try:
        from app.workers.tasks import run_ai_tool_job

        await run_ai_tool_job(job_id)
    except Exception as exc:
        logger.exception(
            "Unhandled failure in AI tool job background task",
            extra={"job_id": job_id},
        )
        try:
            from app.core.database import AsyncSessionLocal
            from app.models.ai_tool_job import AiToolJob

            async with AsyncSessionLocal() as db:
                record = await db.get(AiToolJob, job_id)
                if record:
                    record.status = "failed"
                    record.error_message = f"System error: {exc}"
                    record.finished_at = datetime.now(timezone.utc)
                    await db.commit()
        except Exception as persist_err:
            logger.error(
                "Could not persist failed status for AI tool job",
                extra={"job_id": job_id, "error": str(persist_err)},
            )


def _calculate_catalog_render_credit(total_pages: int) -> int:
    return max(total_pages, 0) * CATALOG_RENDER_CREDIT_PER_PAGE


async def start_catalog_render_job(
    *,
    db: AsyncSession,
    current_user: User,
    request: CatalogRenderStartRequest,
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "final_plan": request.final_plan.model_dump(),
        "options": request.options.model_dump(),
        "_result_meta": {
            "total_pages": request.final_plan.total_pages,
            "completed_pages": 0,
            "pages": [],
            "zip_url": None,
        },
    }

    job, is_new_job = await create_job(
        db=db,
        user_id=current_user.id,
        tool_name=CATALOG_RENDER_TOOL_NAME,
        payload=payload,
    )

    if is_new_job:
        estimated_cost = _calculate_catalog_render_credit(request.final_plan.total_pages)
        if estimated_cost > 0:
            if current_user.credits_remaining < estimated_cost:
                await db.delete(job)
                await db.commit()
                raise InsufficientCreditsError(detail="Insufficient credits")

            await log_credit_change(
                db,
                current_user,
                -estimated_cost,
                f"Catalog render async: {request.final_plan.total_pages} pages",
            )
            payload = dict(job.payload_json or {})
            payload["_charged_credits"] = estimated_cost
            job.payload_json = payload
            db.add(job)
            await db.commit()
            await db.refresh(job)

        use_celery = bool(settings.FAL_KEY) and os.getenv("USE_CELERY", "false").lower() == "true"
        if use_celery:
            from app.workers.tasks import process_ai_tool_job_task

            process_ai_tool_job_task.delay(str(job.id))
        else:
            asyncio.create_task(_tracked_run_ai_tool_job(str(job.id)))

    return {
        "job_id": str(job.id),
        "status": job.status,
        "total_pages": request.final_plan.total_pages,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


async def get_catalog_render_job_for_user(
    *,
    db: AsyncSession,
    job_id: UUID,
    user_id: UUID,
):
    return await get_job_for_user(db, job_id=job_id, user_id=user_id)


def serialize_catalog_render_status(job: Any) -> Dict[str, Any]:
    payload = dict(job.payload_json or {})
    result_meta = payload.get("_result_meta") or {}

    total_pages = int(result_meta.get("total_pages") or 1)
    completed_pages = int(result_meta.get("completed_pages") or 0)
    completed_pages = min(max(completed_pages, 0), total_pages)

    pages = result_meta.get("pages") or []
    if not isinstance(pages, list):
        pages = []

    percent = int((completed_pages / total_pages) * 100) if total_pages > 0 else 0

    return {
        "job_id": str(job.id),
        "status": job.status,
        "progress": {
            "completed_pages": completed_pages,
            "total_pages": total_pages,
            "percent": max(0, min(percent, 100)),
        },
        "pages": pages,
        "zip_url": result_meta.get("zip_url"),
        "error_message": job.error_message,
    }
