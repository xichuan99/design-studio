"""Enhancement-oriented AI tool job executors."""

from __future__ import annotations

from datetime import datetime, timezone

from app.core.database import AsyncSessionLocal
from app.models.ai_tool_job import AiToolJob
from app.models.ai_tool_result import AiToolResult
from app.services import retouch_service
from app.services.storage_service import download_image, upload_image
from app.services.upscale_service import upscale_image
from app.workers.ai_tool_jobs_common import (
    refund_ai_tool_job_if_needed,
    update_ai_tool_job,
)


async def execute_upscale_tool_job(job_id: str):
    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            raise RuntimeError("AI tool job not found")

        payload = job.payload_json or {}
        image_url = payload.get("image_url")
        scale = int(payload.get("scale", 2))

        if not image_url:
            raise ValueError("Missing image_url in job payload")

        if job.cancel_requested:
            job.status = "canceled"
            job.phase_message = "Job dibatalkan"
            job.progress_percent = 100
            job.finished_at = datetime.now(timezone.utc)
            session.add(job)
            await session.commit()
            return

        job.status = "processing"
        job.phase_message = "AI sedang meningkatkan resolusi gambar"
        job.progress_percent = 60
        job.started_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()

    result = await upscale_image(image_url=image_url, scale=scale)
    upscaled_url = result.get("url")
    if not upscaled_url:
        raise RuntimeError("Upscale model returned invalid URL")

    await update_ai_tool_job(
        job_id,
        status="saving",
        phase_message="Menyimpan hasil upscale",
        progress_percent=85,
    )

    final_bytes = await download_image(upscaled_url)
    final_mime = "image/png" if ".png" in upscaled_url.lower() else "image/jpeg"
    stored_url = await upload_image(
        final_bytes,
        content_type=final_mime,
        prefix="upscaled_async",
    )

    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            return

        if job.cancel_requested:
            job.status = "canceled"
            job.phase_message = "Job dibatalkan"
            job.progress_percent = 100
            job.finished_at = datetime.now(timezone.utc)
            session.add(job)
            await refund_ai_tool_job_if_needed(session, job, "Refund: job upscale dibatalkan")
            await session.commit()
            return

        result_row = AiToolResult(
            user_id=job.user_id,
            tool_name="upscale",
            result_url=stored_url,
            file_size=len(final_bytes),
            input_summary=f"{scale}x upscale",
        )
        session.add(result_row)

        job.status = "completed"
        job.result_url = stored_url
        job.phase_message = "Selesai"
        job.progress_percent = 100
        job.finished_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()


async def execute_retouch_tool_job(job_id: str):
    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            raise RuntimeError("AI tool job not found")

        payload = job.payload_json or {}
        image_url = payload.get("image_url")
        output_format = payload.get("output_format", "jpeg")
        fidelity = float(payload.get("fidelity", 0.5))

        if not image_url:
            raise ValueError("Missing image_url in job payload")

        if job.cancel_requested:
            job.status = "canceled"
            job.phase_message = "Job dibatalkan"
            job.progress_percent = 100
            job.finished_at = datetime.now(timezone.utc)
            session.add(job)
            await refund_ai_tool_job_if_needed(session, job, "Refund: job retouch dibatalkan")
            await session.commit()
            return

        job.status = "uploading"
        job.phase_message = "Menyiapkan file untuk retouch"
        job.progress_percent = 20
        job.started_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()

    original_bytes = await download_image(image_url)

    await update_ai_tool_job(
        job_id,
        status="processing",
        phase_message="AI sedang memperbaiki detail foto",
        progress_percent=65,
    )

    final_bytes = await retouch_service.auto_retouch(
        original_bytes,
        fidelity=fidelity,
        output_format=output_format,
    )

    await update_ai_tool_job(
        job_id,
        status="saving",
        phase_message="Menyimpan hasil retouch",
        progress_percent=88,
    )

    final_mime = "image/png" if output_format == "png" else "image/jpeg"
    result_url = await upload_image(
        final_bytes,
        content_type=final_mime,
        prefix="retouch_async",
    )

    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            return

        if job.cancel_requested:
            job.status = "canceled"
            job.phase_message = "Job dibatalkan"
            job.progress_percent = 100
            job.finished_at = datetime.now(timezone.utc)
            session.add(job)
            await refund_ai_tool_job_if_needed(session, job, "Refund: job retouch dibatalkan")
            await session.commit()
            return

        result_row = AiToolResult(
            user_id=job.user_id,
            tool_name="retouch",
            result_url=result_url,
            file_size=len(final_bytes),
            input_summary="Auto retouch",
        )
        session.add(result_row)

        job.status = "completed"
        job.result_url = result_url
        job.phase_message = "Selesai"
        job.progress_percent = 100
        job.finished_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()
