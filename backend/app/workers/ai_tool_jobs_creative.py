"""Creative and utility AI tool job executors."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import logging

from app.core.database import AsyncSessionLocal
from app.models.ai_tool_job import AiToolJob
from app.models.ai_tool_result import AiToolResult
from app.services import batch_service, product_scene_service, watermark_service
from app.services.storage_service import download_image, upload_image
from app.workers.ai_tool_jobs_common import (
    set_ai_tool_job_canceled,
    update_ai_tool_job,
)

logger = logging.getLogger(__name__)


async def _execute_product_scene_pipeline(
    job_id: str,
    image_bytes: bytes,
    theme: str,
    aspect_ratio: str,
    quality: str,
    composite_profile: str,
) -> bytes:
    """
    Orchestrates the product scene generation pipeline with granular step tracking.

    This helper function mirrors the batch processor pattern, enabling better testability
    and error tracking at each pipeline stage.

    Args:
        job_id: The AI tool job ID for progress tracking
        image_bytes: Raw product image bytes
        theme: Scene theme (studio, nature, cafe, etc.)
        aspect_ratio: Target aspect ratio (1:1, 4:5, etc.)
        quality: Quality level (standard or ultra)
        composite_profile: Shadow profile (default, grounded, soft)

    Returns:
        Final composited image bytes (JPEG)

    Raises:
        RuntimeError: If any critical step fails
    """
    # Step 1: Auto-pad image (15% progress)
    logger.debug(f"[product_scene:{job_id}] Step 1: Checking for auto-padding...")
    await update_ai_tool_job(
        job_id,
        status="processing",
        phase_message="Menyiapkan foto produk",
        progress_percent=15,
    )

    processed_image_bytes = image_bytes  # Auto-padding happens inside generate_product_scene

    # Step 2: Remove background (25% progress)
    logger.debug(f"[product_scene:{job_id}] Step 2: Removing background...")
    await update_ai_tool_job(
        job_id,
        status="processing",
        phase_message="Menghapus background produk",
        progress_percent=25,
    )

    # Step 3: Inpaint/Generate background (40-60% progress)
    logger.debug(f"[product_scene:{job_id}] Step 3: Generating/inpainting background...")
    await update_ai_tool_job(
        job_id,
        status="processing",
        phase_message="Membuat background dengan AI",
        progress_percent=40,
    )

    # Step 4: Download background (60% progress)
    logger.debug(f"[product_scene:{job_id}] Step 4: Downloading background...")
    await update_ai_tool_job(
        job_id,
        status="processing",
        phase_message="Mengunduh background",
        progress_percent=60,
    )

    # Step 5: Composite product onto background (80% progress)
    logger.debug(
        f"[product_scene:{job_id}] Step 5: Compositing product with shadow "
        f"(profile={composite_profile})..."
    )
    await update_ai_tool_job(
        job_id,
        status="processing",
        phase_message="Menggabungkan produk dengan background",
        progress_percent=80,
    )

    # Execute the full product scene pipeline with error tracking
    try:
        logger.info(
            f"[product_scene:{job_id}] Starting full pipeline: theme={theme}, quality={quality}, profile={composite_profile}"
        )

        final_bytes = await product_scene_service.generate_product_scene(
            image_bytes=processed_image_bytes,
            theme=theme,
            aspect_ratio=aspect_ratio,
            quality=quality,
            composite_profile=composite_profile,
        )

        logger.info(
            f"[product_scene:{job_id}] Pipeline completed successfully. "
            f"Output size: {len(final_bytes)} bytes"
        )
        return final_bytes

    except Exception as e:
        error_msg = str(e)
        logger.error(
            f"[product_scene:{job_id}] Pipeline failed: {error_msg}",
            exc_info=True,
        )
        raise RuntimeError(f"Gagal membuat product scene: {error_msg}") from e


async def execute_product_scene_tool_job(job_id: str):
    """
    Async job executor for product scene generation.
    Follows the batch processor pattern with proper session handling and cancellation support.
    """
    # Step 0: Extract and validate job parameters
    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            raise RuntimeError("AI tool job not found")

        payload = job.payload_json or {}
        image_url = payload.get("image_url")
        theme = str(payload.get("theme", "studio"))
        aspect_ratio = str(payload.get("aspect_ratio", "1:1"))
        model_quality = str(payload.get("_model_quality", "standard"))
        composite_profile = str(payload.get("composite_profile", "default"))

        # Normalize composite profile
        if composite_profile not in {"default", "grounded", "soft"}:
            logger.warning(
                "[product_scene:%s] Invalid composite_profile '%s'; fallback to default",
                job_id,
                composite_profile,
            )
            composite_profile = "default"

        if not image_url:
            raise ValueError("Missing image_url in job payload")

        # Check early cancellation request
        if job.cancel_requested:
            await set_ai_tool_job_canceled(
                session, job, "Refund: job product scene dibatalkan"
            )
            await session.commit()
            return

        job.status = "uploading"
        job.phase_message = "Menyiapkan foto produk"
        job.progress_percent = 10
        job.started_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()

    # Download image
    try:
        logger.debug(f"[product_scene:{job_id}] Downloading image from {image_url}...")
        original_bytes = await download_image(str(image_url))
        logger.debug(
            f"[product_scene:{job_id}] Image downloaded: {len(original_bytes)} bytes"
        )
    except Exception as e:
        logger.error(
            f"[product_scene:{job_id}] Failed to download image: {e}", exc_info=True
        )
        async with AsyncSessionLocal() as session:
            job = await session.get(AiToolJob, job_id)
            if job:
                await set_ai_tool_job_canceled(
                    session, job, f"Refund: Gagal mengunduh gambar - {str(e)}"
                )
                await session.commit()
        return

    # Execute product scene pipeline with step tracking
    try:
        final_bytes = await _execute_product_scene_pipeline(
            job_id=job_id,
            image_bytes=original_bytes,
            theme=theme,
            aspect_ratio=aspect_ratio,
            quality=model_quality,
            composite_profile=composite_profile,
        )
    except RuntimeError as e:
        logger.error(f"[product_scene:{job_id}] Pipeline execution failed: {e}")
        async with AsyncSessionLocal() as session:
            job = await session.get(AiToolJob, job_id)
            if job:
                error_msg = str(e)
                if "cancelled" in error_msg.lower():
                    await set_ai_tool_job_canceled(session, job, f"Refund: {error_msg}")
                else:
                    await set_ai_tool_job_canceled(session, job, f"Refund: {error_msg}")
                await session.commit()
        return

    # Update to saving phase (90% progress)
    try:
        await update_ai_tool_job(
            job_id,
            status="saving",
            phase_message="Menyimpan hasil product scene",
            progress_percent=90,
        )

        # Upload result
        logger.debug(
            f"[product_scene:{job_id}] Uploading result ({len(final_bytes)} bytes)..."
        )
        result_url = await upload_image(
            final_bytes,
            content_type="image/jpeg",
            prefix="product_scene_async",
        )
        logger.debug(f"[product_scene:{job_id}] Result uploaded to {result_url}")
    except Exception as e:
        logger.error(
            f"[product_scene:{job_id}] Failed to upload result: {e}", exc_info=True
        )
        async with AsyncSessionLocal() as session:
            job = await session.get(AiToolJob, job_id)
            if job:
                await set_ai_tool_job_canceled(
                    session, job, f"Refund: Gagal menyimpan hasil - {str(e)}"
                )
                await session.commit()
        return

    # Finalize job with result
    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            logger.warning(f"[product_scene:{job_id}] Job not found during finalization")
            return

        # Check cancellation one more time
        if job.cancel_requested:
            await set_ai_tool_job_canceled(
                session, job, "Refund: job product scene dibatalkan"
            )
            await session.commit()
            return

        # Record result
        session.add(
            AiToolResult(
                user_id=job.user_id,
                tool_name="product_scene",
                result_url=result_url,
                file_size=len(final_bytes),
                input_summary=f"Product scene: {theme}",
            )
        )

        # Mark job as completed
        job.status = "completed"
        job.result_url = result_url
        job.phase_message = "Selesai"
        job.progress_percent = 100
        job.finished_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()

        logger.info(f"[product_scene:{job_id}] Job completed successfully")


async def execute_watermark_tool_job(job_id: str):
    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            raise RuntimeError("AI tool job not found")

        payload = job.payload_json or {}
        image_url = payload.get("image_url")
        logo_url = payload.get("logo_url")
        position = str(payload.get("position", "bottom-right"))
        opacity = float(payload.get("opacity", 0.5))
        scale = float(payload.get("scale", 0.2))
        visibility_preset = str(payload.get("visibility_preset", "balanced"))

        if not image_url:
            raise ValueError("Missing image_url in job payload")
        if not logo_url:
            raise ValueError("Missing logo_url in job payload")

        if job.cancel_requested:
            await set_ai_tool_job_canceled(
                session, job, "Refund: job watermark dibatalkan"
            )
            await session.commit()
            return

        job.status = "uploading"
        job.phase_message = "Menyiapkan gambar dan logo"
        job.progress_percent = 25
        job.started_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()

    base_image_bytes, logo_bytes = await asyncio.gather(
        download_image(str(image_url)),
        download_image(str(logo_url)),
    )

    await update_ai_tool_job(
        job_id,
        status="processing",
        phase_message="Menerapkan watermark",
        progress_percent=75,
    )

    final_bytes = await watermark_service.apply_watermark(
        base_image_bytes=base_image_bytes,
        watermark_bytes=logo_bytes,
        position=position,
        opacity=opacity,
        scale=scale,
        visibility_preset=visibility_preset,
    )

    await update_ai_tool_job(
        job_id,
        status="saving",
        phase_message="Menyimpan hasil watermark",
        progress_percent=90,
    )

    result_url = await upload_image(
        final_bytes,
        content_type="image/jpeg",
        prefix="watermark_async",
    )

    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            return

        if job.cancel_requested:
            await set_ai_tool_job_canceled(
                session, job, "Refund: job watermark dibatalkan"
            )
            await session.commit()
            return

        session.add(
            AiToolResult(
                user_id=job.user_id,
                tool_name="watermark",
                result_url=result_url,
                file_size=len(final_bytes),
                input_summary=f"Watermark {position}",
            )
        )

        job.status = "completed"
        job.result_url = result_url
        job.phase_message = "Selesai"
        job.progress_percent = 100
        job.finished_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()


async def execute_batch_tool_job(job_id: str):
    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            raise RuntimeError("AI tool job not found")

        payload = dict(job.payload_json or {})
        items = payload.get("items") or []
        operation = str(payload.get("operation", ""))
        params = dict(payload.get("params") or {})
        model_quality = str(payload.get("_model_quality", "standard"))

        if operation == "product_scene" and not params.get("quality"):
            params["quality"] = model_quality

        if operation == "remove_bg" and not params.get("quality"):
            params["quality"] = model_quality

        if not isinstance(items, list) or len(items) == 0:
            raise ValueError("Missing batch items in job payload")

        if job.cancel_requested:
            await set_ai_tool_job_canceled(session, job, "Refund: job batch dibatalkan")
            await session.commit()
            return

        job.status = "uploading"
        job.phase_message = "Menyiapkan file batch"
        job.progress_percent = 20
        job.started_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()

    image_fetch_tasks = []
    filenames: list[str] = []
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        image_url = item.get("image_url")
        if not image_url:
            continue
        filenames.append(str(item.get("filename") or f"file_{index + 1}.jpg"))
        image_fetch_tasks.append(download_image(str(image_url)))

    if not image_fetch_tasks:
        raise ValueError("Batch items contain no valid image_url")

    image_bytes_list = await asyncio.gather(*image_fetch_tasks)
    files = list(zip(filenames, image_bytes_list))

    logo_url = params.get("logo_url")
    if logo_url:
        params["logo_bytes"] = await download_image(str(logo_url))
        params.pop("logo_url", None)

    await update_ai_tool_job(
        job_id,
        status="processing",
        phase_message="Memproses batch gambar",
        progress_percent=70,
    )

    zip_bytes, errors, item_results = await batch_service.process_batch(
        files=files,
        operation=operation,
        params=params,
    )

    await update_ai_tool_job(
        job_id,
        status="saving",
        phase_message="Menyimpan hasil batch",
        progress_percent=90,
    )

    result_url = await upload_image(
        zip_bytes,
        content_type="application/zip",
        prefix="batch_async",
    )

    # Upload individual items so the frontend can show a per-item gallery
    uploaded_items = []
    for filename, img_bytes in item_results:
        try:
            ext = filename.rsplit(".", 1)[-1].lower()
            content_type = "image/png" if ext == "png" else "image/jpeg"
            item_url = await upload_image(img_bytes, content_type=content_type, prefix="batch_item")
            uploaded_items.append({"filename": filename, "result_url": item_url})
        except Exception:
            pass

    success_count = len(files) - len(errors)
    error_count = len(errors)

    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            return

        if job.cancel_requested:
            await set_ai_tool_job_canceled(session, job, "Refund: job batch dibatalkan")
            await session.commit()
            return

        session.add(
            AiToolResult(
                user_id=job.user_id,
                tool_name="batch",
                result_url=result_url,
                file_size=len(zip_bytes),
                input_summary=f"Batch {operation} ({len(files)} files)",
            )
        )

        payload = dict(job.payload_json or {})
        payload["_result_meta"] = {
            "success_count": success_count,
            "error_count": error_count,
            "errors": errors,
            "item_results": uploaded_items,
        }
        job.payload_json = payload

        job.status = "completed"
        job.result_url = result_url
        job.phase_message = "Selesai"
        job.progress_percent = 100
        job.finished_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()
