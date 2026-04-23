"""Background-oriented AI tool job executors."""

from __future__ import annotations

from datetime import datetime, timezone
import logging

from app.core.database import AsyncSessionLocal
from app.models.ai_tool_job import AiToolJob
from app.models.ai_tool_result import AiToolResult
from app.services import (
    bg_removal_service,
    id_photo_service,
    inpaint_service,
    outpaint_service,
)
from app.services.storage_service import download_image, upload_image
from app.workers.ai_tool_jobs_common import (
    refund_ai_tool_job_if_needed,
    set_ai_tool_job_canceled,
    update_ai_tool_job,
)

logger = logging.getLogger(__name__)


async def execute_background_swap_tool_job(job_id: str):
    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            raise RuntimeError("AI tool job not found")

        payload = job.payload_json or {}
        image_url = payload.get("image_url")
        prompt = payload.get("prompt")
        model_quality = str(payload.get("_model_quality", "standard"))

        if not image_url:
            raise ValueError("Missing image_url in job payload")
        if not prompt:
            raise ValueError("Missing prompt in job payload")

        if job.cancel_requested:
            job.status = "canceled"
            job.phase_message = "Job dibatalkan"
            job.progress_percent = 100
            job.finished_at = datetime.now(timezone.utc)
            session.add(job)
            await refund_ai_tool_job_if_needed(session, job, "Refund: job background swap dibatalkan")
            await session.commit()
            return

        job.status = "uploading"
        job.phase_message = "Menyiapkan gambar untuk background swap"
        job.progress_percent = 25
        job.started_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()

    source_image_url = str(image_url)

    await update_ai_tool_job(
        job_id,
        status="processing",
        phase_message="Menghapus background lama",
        progress_percent=45,
    )

    original_bytes = None
    original_url_for_inpaint = source_image_url

    try:
        no_bg_bytes = await bg_removal_service.remove_background_from_url(source_image_url)
    except Exception:
        # Fallback to legacy byte-based path if source URL is temporarily inaccessible.
        logger.warning(
            "Background swap URL-based remove failed for job %s, falling back to byte flow",
            job_id,
        )
        original_bytes = await download_image(source_image_url)
        no_bg_bytes = await bg_removal_service.remove_background(original_bytes)
        original_url_for_inpaint = None

    await update_ai_tool_job(
        job_id,
        status="processing",
        phase_message="AI sedang membuat background baru",
        progress_percent=72,
    )

    if model_quality == "ultra":
        # gpt-image-2 image editing — superior edge blending and background realism
        import os
        from app.core.config import settings
        from app.services.image_service import build_gpt2_image_edit_args, run_gpt2_image_edit
        from app.services.storage_service import upload_image as _upload

        os.environ["FAL_KEY"] = settings.FAL_KEY
        # Upload transparent PNG as mask — white=area to fill, black=keep
        mask_url = await _upload(no_bg_bytes, content_type="image/png", prefix="bgswap_mask_ultra")
        gpt2_args = build_gpt2_image_edit_args(
            prompt=prompt,
            image_urls=[source_image_url],
            mask_image_url=mask_url,
        )
        result = await run_gpt2_image_edit(gpt2_args)
        images = result.get("images", [])
        if not images:
            raise RuntimeError("gpt-image-2 returned no images for background swap")
        import httpx
        async with httpx.AsyncClient() as _http:
            r = await _http.get(images[0]["url"], timeout=60.0)
            r.raise_for_status()
            final_bytes = r.content
    else:
        final_bytes = await bg_removal_service.inpaint_background(
            original_bytes=original_bytes,
            transparent_png_bytes=no_bg_bytes,
            prompt=prompt,
            original_url=original_url_for_inpaint,
        )

    await update_ai_tool_job(
        job_id,
        status="saving",
        phase_message="Menyimpan hasil background swap",
        progress_percent=90,
    )

    result_url = await upload_image(
        final_bytes,
        content_type="image/jpeg",
        prefix="tools_bgswap_async",
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
            await refund_ai_tool_job_if_needed(session, job, "Refund: job background swap dibatalkan")
            await session.commit()
            return

        result_row = AiToolResult(
            user_id=job.user_id,
            tool_name="background_swap",
            result_url=result_url,
            file_size=len(final_bytes),
            input_summary=str(prompt)[:200],
        )
        session.add(result_row)

        job.status = "completed"
        job.result_url = result_url
        job.phase_message = "Selesai"
        job.progress_percent = 100
        job.finished_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()


async def execute_generative_expand_tool_job(job_id: str):
    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            raise RuntimeError("AI tool job not found")

        payload = job.payload_json or {}
        image_url = payload.get("image_url")
        direction = payload.get("direction")
        pixels = payload.get("pixels")
        target_width = payload.get("target_width")
        target_height = payload.get("target_height")
        prompt = payload.get("prompt")

        if not image_url:
            raise ValueError("Missing image_url in job payload")

        if job.cancel_requested:
            await set_ai_tool_job_canceled(session, job, "Refund: job generative expand dibatalkan")
            await session.commit()
            return

        job.status = "processing"
        job.phase_message = "AI sedang memperluas gambar"
        job.progress_percent = 65
        job.started_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()

    result_data = await outpaint_service.outpaint_image(
        image_url=str(image_url),
        direction=str(direction) if direction else None,
        pixels=int(pixels) if pixels is not None else None,
        target_width=int(target_width) if target_width is not None else None,
        target_height=int(target_height) if target_height is not None else None,
        prompt=str(prompt) if prompt else None,
    )

    outpainted_url = result_data.get("url")
    if not outpainted_url:
        raise RuntimeError("Generative expand model returned invalid URL")

    await update_ai_tool_job(
        job_id,
        status="saving",
        phase_message="Menyimpan hasil generative expand",
        progress_percent=90,
    )

    final_bytes = await download_image(outpainted_url)
    result_url = await upload_image(
        final_bytes,
        content_type="image/jpeg",
        prefix="generative_expand_async",
    )

    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            return

        if job.cancel_requested:
            await set_ai_tool_job_canceled(session, job, "Refund: job generative expand dibatalkan")
            await session.commit()
            return

        session.add(
            AiToolResult(
                user_id=job.user_id,
                tool_name="generative_expand",
                result_url=result_url,
                file_size=len(final_bytes),
                input_summary=(str(prompt) if prompt else f"Expand {direction or 'all'}")[:200],
            )
        )

        job.status = "completed"
        job.result_url = result_url
        job.phase_message = "Selesai"
        job.progress_percent = 100
        job.finished_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()


async def execute_id_photo_tool_job(job_id: str):
    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            raise RuntimeError("AI tool job not found")

        payload = dict(job.payload_json or {})
        image_url = payload.get("image_url")
        bg_color = str(payload.get("bg_color", "red"))
        size = str(payload.get("size", "3x4"))
        custom_width_cm = payload.get("custom_width_cm")
        custom_height_cm = payload.get("custom_height_cm")
        output_format = str(payload.get("output_format", "jpeg"))
        include_print_sheet = bool(payload.get("include_print_sheet", False))

        if not image_url:
            raise ValueError("Missing image_url in job payload")

        if job.cancel_requested:
            await set_ai_tool_job_canceled(session, job, "Refund: job id photo dibatalkan")
            await session.commit()
            return

        job.status = "uploading"
        job.phase_message = "Menyiapkan foto untuk pasfoto"
        job.progress_percent = 20
        job.started_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()

    image_bytes = await download_image(str(image_url))

    await update_ai_tool_job(
        job_id,
        status="processing",
        phase_message="AI sedang memproses pasfoto",
        progress_percent=70,
    )

    final_bytes = await id_photo_service.generate_id_photo(
        image_bytes=image_bytes,
        bg_color_name=bg_color,
        size_name=size,
        custom_w_cm=float(custom_width_cm) if custom_width_cm else None,
        custom_h_cm=float(custom_height_cm) if custom_height_cm else None,
        output_format=output_format,
    )

    await update_ai_tool_job(
        job_id,
        status="saving",
        phase_message="Menyimpan hasil pasfoto",
        progress_percent=90,
    )

    mime_type = "image/png" if output_format.lower() == "png" else "image/jpeg"
    result_url = await upload_image(
        final_bytes,
        content_type=mime_type,
        prefix="id_photo_async",
    )

    print_sheet_url = None
    if include_print_sheet:
        print_sheet_bytes = id_photo_service.generate_print_sheet(final_bytes, output_format=output_format)
        print_sheet_url = await upload_image(
            print_sheet_bytes,
            content_type=mime_type,
            prefix="id_photo_sheet_async",
        )

    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            return

        if job.cancel_requested:
            await set_ai_tool_job_canceled(session, job, "Refund: job id photo dibatalkan")
            await session.commit()
            return

        session.add(
            AiToolResult(
                user_id=job.user_id,
                tool_name="id_photo",
                result_url=result_url,
                file_size=len(final_bytes),
                input_summary=f"Pasfoto {size} bg {bg_color}",
            )
        )

        payload = dict(job.payload_json or {})
        payload["_result_meta"] = {"print_sheet_url": print_sheet_url}
        job.payload_json = payload

        job.status = "completed"
        job.result_url = result_url
        job.phase_message = "Selesai"
        job.progress_percent = 100
        job.finished_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()


async def execute_magic_eraser_tool_job(job_id: str):
    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            raise RuntimeError("AI tool job not found")

        payload = job.payload_json or {}
        image_url = payload.get("image_url")
        mask_url = payload.get("mask_url")
        prompt = payload.get("prompt")
        model_quality = str(payload.get("_model_quality", "standard"))

        if not image_url:
            raise ValueError("Missing image_url in job payload")
        if not mask_url:
            raise ValueError("Missing mask_url in job payload")

        if job.cancel_requested:
            await set_ai_tool_job_canceled(session, job, "Refund: job magic eraser dibatalkan")
            await session.commit()
            return

        job.status = "processing"
        job.phase_message = "AI sedang menghapus objek"
        job.progress_percent = 70
        job.started_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()

    # Normalize/clean mask before sending to inpaint model to improve fill quality.
    raw_mask_bytes = await download_image(str(mask_url))
    prepared_mask_bytes = inpaint_service.prepare_magic_eraser_mask(raw_mask_bytes)
    prepared_mask_url = await upload_image(
        prepared_mask_bytes,
        content_type="image/png",
        prefix="magic_eraser_mask_prepared",
    )

    if model_quality == "ultra":
        # gpt-image-2 — superior inpainting quality for object removal
        import os
        from app.core.config import settings
        from app.services.image_service import build_gpt2_image_edit_args, run_gpt2_image_edit

        os.environ["FAL_KEY"] = settings.FAL_KEY
        erase_prompt = str(prompt) if prompt else "Remove this object and fill with natural background"
        gpt2_args = build_gpt2_image_edit_args(
            prompt=erase_prompt,
            image_urls=[str(image_url)],
            mask_image_url=prepared_mask_url,
        )
        result = await run_gpt2_image_edit(gpt2_args)
        images = result.get("images", [])
        if not images:
            raise RuntimeError("gpt-image-2 returned no images for magic eraser")
        inpainted_url = images[0]["url"]
    else:
        result_data = await inpaint_service.inpaint_image(
            image_url=str(image_url),
            mask_url=prepared_mask_url,
            prompt=str(prompt) if prompt else None,
            magic_eraser_mode=True,
        )
        inpainted_url = result_data.get("url")
    if not inpainted_url:
        raise RuntimeError("Magic eraser model returned invalid URL")

    await update_ai_tool_job(
        job_id,
        status="saving",
        phase_message="Menyimpan hasil magic eraser",
        progress_percent=90,
    )

    final_bytes = await download_image(inpainted_url)
    result_url = await upload_image(
        final_bytes,
        content_type="image/jpeg",
        prefix="magic_eraser_async",
    )

    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            return

        if job.cancel_requested:
            await set_ai_tool_job_canceled(session, job, "Refund: job magic eraser dibatalkan")
            await session.commit()
            return

        session.add(
            AiToolResult(
                user_id=job.user_id,
                tool_name="magic_eraser",
                result_url=result_url,
                file_size=len(final_bytes),
                input_summary=(str(prompt) if prompt else "Object removal")[:200],
            )
        )

        job.status = "completed"
        job.result_url = result_url
        job.phase_message = "Selesai"
        job.progress_percent = 100
        job.finished_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()
