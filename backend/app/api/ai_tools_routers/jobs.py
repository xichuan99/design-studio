"""API endpoints for AI tool async jobs."""

from typing import Any, Literal
import asyncio
import os
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.rate_limit import rate_limit_actions, rate_limit_reads
from app.core.exceptions import NotFoundError, InsufficientCreditsError
from app.models.user import User
from app.schemas.error import ERROR_RESPONSES
from app.services.ai_tool_job_service import (
    create_job,
    get_job_for_user,
    list_jobs_for_user,
    request_cancel_job,
    serialize_job,
)
from app.core.config import settings
from app.services.credit_service import log_credit_change
from app.core.credit_costs import (
    COST_BG_SWAP,
    COST_GENERATIVE_EXPAND,
    COST_ID_PHOTO,
    COST_MAGIC_ERASER,
    COST_PRODUCT_SCENE,
    COST_RETOUCH,
    COST_TEXT_BANNER_PREMIUM,
    COST_TEXT_BANNER_STD,
    COST_UPSCALE,
)

router = APIRouter(tags=["AI Tools"])

SUPPORTED_TOOL_NAMES = {
    "upscale",
    "retouch",
    "background_swap",
    "product_scene",
    "generative_expand",
    "batch",
    "id_photo",
    "magic_eraser",
    "text_banner",
    "watermark",
}

TOOL_CREDIT_COST = {
    "upscale": COST_UPSCALE,
    "retouch": COST_RETOUCH,
    "background_swap": COST_BG_SWAP,
    "product_scene": COST_PRODUCT_SCENE,
    "generative_expand": COST_GENERATIVE_EXPAND,
    "id_photo": COST_ID_PHOTO,
    "magic_eraser": COST_MAGIC_ERASER,
}


class CreateToolJobRequest(BaseModel):
    tool_name: Literal[
        "upscale",
        "retouch",
        "background_swap",
        "product_scene",
        "generative_expand",
        "batch",
        "id_photo",
        "magic_eraser",
        "text_banner",
        "watermark",
    ]
    payload: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str | None = Field(default=None, max_length=255)


@router.post(
    "/jobs",
    response_model=dict,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Create AI Tool Job",
    description="Creates an async AI tool job and returns a job ID for polling status.",
    responses=ERROR_RESPONSES,
)
async def create_tool_job(
    request: CreateToolJobRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_actions),
):
    job, is_new_job = await create_job(
        db=db,
        user_id=current_user.id,
        tool_name=request.tool_name,
        payload=request.payload,
        idempotency_key=request.idempotency_key,
    )

    if is_new_job:
        cost = TOOL_CREDIT_COST.get(request.tool_name)

        if request.tool_name == "text_banner":
            quality = str((request.payload or {}).get("quality", "standard"))
            cost = COST_TEXT_BANNER_PREMIUM if quality == "premium" else COST_TEXT_BANNER_STD

        if request.tool_name == "batch":
            payload = request.payload or {}
            operation = str(payload.get("operation", ""))
            items = payload.get("items") or []
            file_count = len(items) if isinstance(items, list) else 0

            per_file_cost = 0
            if operation == "remove_bg":
                per_file_cost = COST_BG_SWAP
            elif operation == "product_scene":
                per_file_cost = COST_PRODUCT_SCENE

            cost = per_file_cost * file_count

        if cost is not None and cost > 0:
            if current_user.credits_remaining < cost:
                await db.delete(job)
                await db.commit()
                raise InsufficientCreditsError(detail="Insufficient credits")

            await log_credit_change(db, current_user, -cost, f"AI Tools async: {request.tool_name}")
            payload = dict(job.payload_json or {})
            payload["_charged_credits"] = cost
            job.payload_json = payload
            db.add(job)
            await db.commit()
            await db.refresh(job)

        use_celery = bool(settings.FAL_KEY) and os.getenv("USE_CELERY", "false").lower() == "true"
        if use_celery:
            from app.workers.tasks import process_ai_tool_job_task

            process_ai_tool_job_task.delay(str(job.id))
        else:
            from app.workers.tasks import run_ai_tool_job

            asyncio.create_task(run_ai_tool_job(str(job.id)))

    return serialize_job(job)


@router.get(
    "/jobs/{job_id}",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Get AI Tool Job Status",
    description="Returns current status and progress for one async AI tool job.",
    responses=ERROR_RESPONSES,
)
async def get_tool_job_status(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_reads),
):
    job = await get_job_for_user(db, job_id=job_id, user_id=current_user.id)
    if not job:
        raise NotFoundError(detail="Job not found")
    return serialize_job(job)


@router.get(
    "/my-jobs",
    response_model=list,
    status_code=status.HTTP_200_OK,
    summary="List My AI Tool Jobs",
    description="Lists async AI tool jobs for current user.",
    responses=ERROR_RESPONSES,
)
async def list_my_tool_jobs(
    tool_name: str | None = Query(None, description="Filter by tool name"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_reads),
):
    if tool_name and tool_name not in SUPPORTED_TOOL_NAMES:
        return []

    jobs = await list_jobs_for_user(
        db,
        user_id=current_user.id,
        tool_name=tool_name,
        limit=limit,
        offset=offset,
    )
    return [serialize_job(job) for job in jobs]


@router.post(
    "/jobs/{job_id}/cancel",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Cancel AI Tool Job",
    description="Requests cancellation for a running/queued AI tool job.",
    responses=ERROR_RESPONSES,
)
async def cancel_tool_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_actions),
):
    job = await get_job_for_user(db, job_id=job_id, user_id=current_user.id)
    if not job:
        raise NotFoundError(detail="Job not found")

    job = await request_cancel_job(db, job=job)

    if job.status == "canceled":
        payload = dict(job.payload_json or {})
        charged = int(payload.get("_charged_credits", 0) or 0)
        already_refunded = bool(payload.get("_refunded", False))
        if charged > 0 and not already_refunded:
            await log_credit_change(db, current_user, charged, f"Refund: job {job.tool_name} dibatalkan")
            payload["_refunded"] = True
            job.payload_json = payload
            db.add(job)
            await db.commit()
            await db.refresh(job)

    return serialize_job(job)
