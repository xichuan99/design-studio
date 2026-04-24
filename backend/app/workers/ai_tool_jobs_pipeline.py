"""Pipeline-oriented AI tool job executor."""

from __future__ import annotations

import binascii
from base64 import b64decode
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.core.database import AsyncSessionLocal
from app.models.ai_tool_job import AiToolJob
from app.models.ai_tool_result import AiToolResult
from app.schemas.image_pipeline import TransformationStageRequest
from app.services.image_pipeline import StageExecutionPayload, build_pipeline
from app.services.storage_service import upload_image
from app.workers.ai_tool_jobs_common import (
    set_ai_tool_job_canceled,
    update_ai_tool_job,
)


def _decode_base64_image(raw_value: str) -> bytes:
    encoded = raw_value
    if raw_value.startswith("data:") and "," in raw_value:
        encoded = raw_value.split(",", 1)[1]
    try:
        return b64decode(encoded)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("Invalid base64 image payload") from exc


def _resolve_input_image_bytes(payload: Dict[str, Any]) -> Optional[bytes]:
    image_bytes = payload.get("image_bytes")
    if image_bytes is None:
        return None
    if isinstance(image_bytes, bytes):
        return image_bytes
    if isinstance(image_bytes, bytearray):
        return bytes(image_bytes)
    if isinstance(image_bytes, str):
        return _decode_base64_image(image_bytes)
    raise ValueError("Unsupported image_bytes format in pipeline payload")


async def execute_pipeline_tool_job(job_id: str) -> None:
    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            raise RuntimeError("AI tool job not found")

        payload = dict(job.payload_json or {})
        image_url = payload.get("image_url")
        image_bytes = _resolve_input_image_bytes(payload)
        stages_raw = payload.get("stages")

        if not isinstance(stages_raw, list) or len(stages_raw) == 0:
            raise ValueError("Missing stages in pipeline job payload")

        if image_url is None and image_bytes is None:
            raise ValueError("Pipeline job requires image_url or image_bytes")

        if job.cancel_requested:
            await set_ai_tool_job_canceled(session, job, "Refund: job pipeline dibatalkan")
            await session.commit()
            return

        job.status = "processing"
        job.phase_message = "Menyiapkan pipeline transformasi"
        job.progress_percent = 10
        job.started_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()

    stage_requests = [TransformationStageRequest.model_validate(item) for item in stages_raw]

    async def _on_progress(event: Dict[str, Any]) -> None:
        stage_name = str(event.get("stage", "pipeline"))
        status = str(event.get("status", "processing"))
        progress = int(event.get("progress", 0))
        progress = max(10, min(95, progress))
        message = f"Pipeline {status}: {stage_name}"
        await update_ai_tool_job(
            job_id,
            status="processing",
            phase_message=message,
            progress_percent=progress,
        )

    pipeline = build_pipeline(stage_requests, progress_callback=_on_progress)
    result_payload = await pipeline.run(
        StageExecutionPayload(
            image_bytes=image_bytes,
            image_url=(str(image_url) if image_url else None),
            metadata={"pipeline_job_id": job_id},
        )
    )

    if result_payload.image_bytes is None:
        raise RuntimeError("Pipeline execution returned no output image")

    await update_ai_tool_job(
        job_id,
        status="saving",
        phase_message="Menyimpan hasil pipeline",
        progress_percent=97,
    )

    result_url = await upload_image(
        result_payload.image_bytes,
        content_type=str(payload.get("output_content_type", "image/jpeg")),
        prefix="pipeline_async",
    )

    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            return

        if job.cancel_requested:
            await set_ai_tool_job_canceled(session, job, "Refund: job pipeline dibatalkan")
            await session.commit()
            return

        session.add(
            AiToolResult(
                user_id=job.user_id,
                tool_name="pipeline",
                result_url=result_url,
                file_size=len(result_payload.image_bytes),
                input_summary=f"Pipeline stages: {len(stage_requests)}",
            )
        )

        job.status = "completed"
        job.result_url = result_url
        job.phase_message = "Selesai"
        job.progress_percent = 100
        job.finished_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()
