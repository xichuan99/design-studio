"""API endpoints for AI tool async jobs."""

from typing import Any, Literal, Optional
import asyncio
import os
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
    COST_BG_SWAP_ULTRA,
    COST_GENERATIVE_EXPAND,
    COST_GENERATIVE_EXPAND_ULTRA,
    COST_ID_PHOTO,
    COST_MAGIC_ERASER,
    COST_MAGIC_ERASER_ULTRA,
    COST_PRODUCT_SCENE,
    COST_PRODUCT_SCENE_ULTRA,
    COST_RETOUCH,
    COST_RETOUCH_ADVANCED,
    COST_TEXT_BANNER_PREMIUM,
    COST_TEXT_BANNER_PREMIUM_ULTRA,
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

# Tools that do NOT support ultra quality (non-generative models)
_ULTRA_UNSUPPORTED_TOOLS = {"upscale", "retouch", "id_photo", "watermark"}

_TOOL_CREDIT_COST_STANDARD = {
    "upscale": COST_UPSCALE,
    "retouch": COST_RETOUCH,
    "background_swap": COST_BG_SWAP,
    "product_scene": COST_PRODUCT_SCENE,
    "generative_expand": COST_GENERATIVE_EXPAND,
    "id_photo": COST_ID_PHOTO,
    "magic_eraser": COST_MAGIC_ERASER,
}

_TOOL_CREDIT_COST_ULTRA = {
    "background_swap": COST_BG_SWAP_ULTRA,
    "product_scene": COST_PRODUCT_SCENE_ULTRA,
    "generative_expand": COST_GENERATIVE_EXPAND_ULTRA,
    "magic_eraser": COST_MAGIC_ERASER_ULTRA,
}


def _is_advanced_relight_payload(payload: Optional[dict[str, Any]]) -> bool:
    mode = str((payload or {}).get("relight_mode", "off")).strip().lower()
    return mode in {"auto", "advanced"}


def _is_retouch_advanced_relight_requested(
    tool_name: str,
    payload: Optional[dict[str, Any]],
) -> bool:
    return tool_name == "retouch" and _is_advanced_relight_payload(payload)


def get_credit_cost(
    tool_name: str,
    quality: str,
    payload: Optional[dict[str, Any]] = None,
) -> Optional[int]:
    """Return credit cost for a tool/quality combination."""
    if quality == "ultra":
        return _TOOL_CREDIT_COST_ULTRA.get(tool_name)
    if tool_name == "retouch" and _is_advanced_relight_payload(payload):
        return COST_RETOUCH_ADVANCED
    return _TOOL_CREDIT_COST_STANDARD.get(tool_name)


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
    idempotency_key: Optional[str] = Field(default=None)
    quality: Literal["standard", "ultra"] = Field(
        default="standard",
        description="'ultra' routes to gpt-image-2 at 2× credit cost. Not supported for upscale, retouch, id_photo, watermark.",
    )


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
    if request.quality == "ultra" and request.tool_name in _ULTRA_UNSUPPORTED_TOOLS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ultra quality is not supported for '{request.tool_name}'.",
        )

    if _is_retouch_advanced_relight_requested(request.tool_name, request.payload):
        if not settings.ADVANCED_RELIGHT_ENABLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Advanced relight is currently disabled.",
            )

    # Merge model quality into payload so the worker can read it.
    # Using "_model_quality" to avoid conflict with text_banner's own "quality" field
    # (which means draft/standard/premium for the banner service).
    merged_payload = dict(request.payload or {})
    merged_payload["_model_quality"] = request.quality

    job, is_new_job = await create_job(
        db=db,
        user_id=current_user.id,
        tool_name=request.tool_name,
        payload=merged_payload,
        idempotency_key=request.idempotency_key,
    )

    if is_new_job:
        cost = get_credit_cost(request.tool_name, request.quality, request.payload)

        if request.tool_name == "text_banner":
            banner_quality = str((request.payload or {}).get("quality", "standard"))
            if request.quality == "ultra":
                cost = COST_TEXT_BANNER_PREMIUM_ULTRA
            elif banner_quality == "premium":
                cost = COST_TEXT_BANNER_PREMIUM
            else:
                cost = COST_TEXT_BANNER_STD

        if request.tool_name == "batch":
            payload = request.payload or {}
            operation = str(payload.get("operation", ""))
            items = payload.get("items") or []
            file_count = len(items) if isinstance(items, list) else 0

            per_file_cost = 0
            if operation == "remove_bg":
                per_file_cost = COST_BG_SWAP_ULTRA if request.quality == "ultra" else COST_BG_SWAP
            elif operation == "product_scene":
                per_file_cost = COST_PRODUCT_SCENE_ULTRA if request.quality == "ultra" else COST_PRODUCT_SCENE

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
    tool_name: Optional[str] = Query(None, description="Filter by tool name"),
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
