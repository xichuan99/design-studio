"""Dedicated API endpoint for stage-based image transformation pipeline jobs."""

from __future__ import annotations

import binascii
from base64 import b64decode
from typing import Literal, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.ai_tools_routers.jobs import CreateToolJobRequest, create_tool_job
from app.api.deps import get_db
from app.api.rate_limit import rate_limit_actions
from app.core.exceptions import ValidationError
from app.models.user import User
from app.schemas.error import ERROR_RESPONSES
from app.schemas.image_pipeline import StageType, TransformationStageRequest
from app.services.image_pipeline import StageExecutionPayload, build_pipeline
from app.services.storage_service import upload_image

router = APIRouter(tags=["AI Tools"])


class CreatePipelineJobRequest(BaseModel):
    """Request payload for creating a pipeline job."""

    image_url: Optional[str] = Field(
        default=None,
        description="Source image URL. Optional if image_bytes is provided.",
    )
    image_bytes: Optional[str] = Field(
        default=None,
        description="Base64-encoded source image bytes (optionally data URI).",
    )
    stages: list[TransformationStageRequest] = Field(
        ..., min_length=1, description="Ordered stage configuration"
    )
    metadata: dict = Field(default_factory=dict)
    idempotency_key: Optional[str] = Field(default=None)
    output_content_type: Optional[Literal["image/jpeg", "image/png", "image/webp"]] = Field(
        default=None
    )
    quality: Literal["standard", "ultra"] = Field(default="standard")


class ExecutePipelinePreviewRequest(BaseModel):
    """Request payload for synchronous pipeline execution preview."""

    image_url: Optional[str] = Field(
        default=None,
        description="Source image URL. Optional if image_bytes is provided.",
    )
    image_bytes: Optional[str] = Field(
        default=None,
        description="Base64-encoded source image bytes (optionally data URI).",
    )
    stages: list[TransformationStageRequest] = Field(
        ..., min_length=1, description="Ordered stage configuration"
    )
    metadata: dict = Field(default_factory=dict)
    output_content_type: Optional[Literal["image/jpeg", "image/png", "image/webp"]] = Field(
        default=None
    )
    save_result: bool = Field(default=True)


def _validate_stage_params(stages: list[TransformationStageRequest]) -> None:
    for idx, stage in enumerate(stages):
        params = stage.params or {}
        label = f"stages[{idx}]"

        if stage.type == StageType.INPAINT_BG:
            if not params.get("prompt"):
                raise ValidationError(detail=f"{label}.params.prompt is required for inpaint_bg")

        elif stage.type == StageType.GENERATE_BG:
            has_prompt = bool(params.get("visual_prompt") or params.get("prompt"))
            if not has_prompt:
                raise ValidationError(
                    detail=f"{label}.params.visual_prompt (or prompt) is required for generate_bg"
                )

        elif stage.type == StageType.WATERMARK:
            has_watermark = any(
                params.get(key) is not None
                for key in ("watermark_url", "logo_url", "watermark_bytes", "logo_bytes")
            )
            if not has_watermark:
                raise ValidationError(
                    detail=(
                        f"{label}.params requires watermark_url/logo_url or "
                        "watermark_bytes/logo_bytes for watermark"
                    )
                )


def _decode_base64_image(raw_value: str) -> bytes:
    encoded = raw_value
    if raw_value.startswith("data:") and "," in raw_value:
        encoded = raw_value.split(",", 1)[1]
    try:
        return b64decode(encoded)
    except (ValueError, binascii.Error) as exc:
        raise ValidationError(detail="Invalid base64 image_bytes payload") from exc


@router.post(
    "/pipeline",
    response_model=dict,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Create Pipeline Job",
    description=(
        "Creates an async stage-based image transformation pipeline job. "
        "Poll status via /api/tools/jobs/{job_id}."
    ),
    responses=ERROR_RESPONSES,
)
async def create_pipeline_job(
    request: CreatePipelineJobRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_actions),
):
    if not request.image_url and not request.image_bytes:
        raise ValidationError(detail="image_url or image_bytes is required for pipeline job")

    _validate_stage_params(request.stages)

    payload = {
        "image_url": request.image_url,
        "image_bytes": request.image_bytes,
        "stages": [stage.model_dump() for stage in request.stages],
        "metadata": request.metadata,
    }
    if request.output_content_type:
        payload["output_content_type"] = request.output_content_type

    tool_job_request = CreateToolJobRequest(
        tool_name="pipeline",
        payload=payload,
        idempotency_key=request.idempotency_key,
        quality=request.quality,
    )
    return await create_tool_job(tool_job_request, db=db, current_user=current_user)


@router.post(
    "/pipeline/preview",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Execute Pipeline Preview",
    description=(
        "Executes pipeline synchronously and returns a result URL. "
        "Use this for fast preview flow without job polling."
    ),
    responses=ERROR_RESPONSES,
)
async def execute_pipeline_preview(
    request: ExecutePipelinePreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_actions),
):
    if not request.image_url and not request.image_bytes:
        raise ValidationError(detail="image_url or image_bytes is required for pipeline preview")

    _validate_stage_params(request.stages)

    image_bytes = _decode_base64_image(request.image_bytes) if request.image_bytes else None

    pipeline = build_pipeline(request.stages)
    payload = StageExecutionPayload(
        image_bytes=image_bytes,
        image_url=request.image_url,
        metadata={**request.metadata, "pipeline_mode": "preview"},
    )
    result_payload = await pipeline.run(payload)

    if result_payload.image_bytes is None:
        raise ValidationError(detail="Pipeline preview returned no output image")

    content_type = request.output_content_type or "image/jpeg"
    result_url = await upload_image(
        result_payload.image_bytes,
        content_type=content_type,
        prefix=f"pipeline_preview_{current_user.id}",
    )

    result_id = None
    if request.save_result:
        from app.api.ai_tools_routers.results import save_tool_result

        result_id = await save_tool_result(
            db,
            current_user.id,
            "pipeline",
            result_url,
            len(result_payload.image_bytes),
            f"Pipeline preview stages: {len(request.stages)}",
        )
        await db.commit()

    return {
        "url": result_url,
        "result_id": result_id,
        "stage_count": len(request.stages),
    }
