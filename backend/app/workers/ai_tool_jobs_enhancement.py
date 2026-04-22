"""Enhancement-oriented AI tool job executors."""

from __future__ import annotations

import io
from datetime import datetime, timezone

from PIL import Image, ImageEnhance, ImageFilter

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


def _enhance_upscaled_bytes(image_bytes: bytes, mime_type: str) -> tuple[bytes, str]:
    """Apply light detail enhancement so old/blurry photos gain visible clarity."""
    try:
        with Image.open(io.BytesIO(image_bytes)) as src:
            img = src.convert("RGB")

        img = ImageEnhance.Contrast(img).enhance(1.03)
        img = ImageEnhance.Sharpness(img).enhance(1.12)
        img = img.filter(ImageFilter.UnsharpMask(radius=1.6, percent=125, threshold=3))

        out = io.BytesIO()
        if mime_type == "image/png":
            img.save(out, format="PNG", optimize=True)
            return out.getvalue(), "image/png"

        img.save(out, format="JPEG", quality=95, optimize=True)
        return out.getvalue(), "image/jpeg"
    except Exception:
        # Keep workflow resilient: fallback to model output if post-process fails.
        return image_bytes, mime_type


def _read_image_size(image_bytes: bytes) -> tuple[int, int] | None:
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            return img.size
    except Exception:
        return None


def _local_upscale_fallback(
    original_bytes: bytes,
    scale: int,
    mime_type: str,
) -> tuple[bytes, str]:
    with Image.open(io.BytesIO(original_bytes)) as img:
        src = img.convert("RGB")
        src_w, src_h = src.size
        target_scale = max(2, int(scale))
        target_size = (max(1, src_w * target_scale), max(1, src_h * target_scale))
        upscaled = src.resize(target_size, Image.Resampling.LANCZOS)

    out = io.BytesIO()
    if mime_type == "image/png":
        upscaled.save(out, format="PNG", optimize=True)
        return out.getvalue(), "image/png"

    upscaled.save(out, format="JPEG", quality=95, optimize=True)
    return out.getvalue(), "image/jpeg"


def _ensure_upscaled_dimensions(
    original_bytes: bytes,
    upscaled_bytes: bytes,
    scale: int,
    mime_type: str,
) -> tuple[bytes, str]:
    original_size = _read_image_size(original_bytes)
    upscaled_size = _read_image_size(upscaled_bytes)
    if not original_size or not upscaled_size:
        return upscaled_bytes, mime_type

    orig_w, orig_h = original_size
    up_w, up_h = upscaled_size
    if up_w <= orig_w and up_h <= orig_h:
        return _local_upscale_fallback(original_bytes, scale, mime_type)

    return upscaled_bytes, mime_type


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

    original_bytes = await download_image(image_url)

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
    final_bytes, final_mime = _ensure_upscaled_dimensions(
        original_bytes=original_bytes,
        upscaled_bytes=final_bytes,
        scale=scale,
        mime_type=final_mime,
    )
    final_bytes, final_mime = _enhance_upscaled_bytes(final_bytes, final_mime)

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
