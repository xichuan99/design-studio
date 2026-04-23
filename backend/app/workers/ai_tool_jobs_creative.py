"""Creative and utility AI tool job executors."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from app.core.database import AsyncSessionLocal
from app.models.ai_tool_job import AiToolJob
from app.models.ai_tool_result import AiToolResult
from app.services import batch_service, product_scene_service, watermark_service
from app.services.storage_service import download_image, upload_image
from app.workers.ai_tool_jobs_common import (
    set_ai_tool_job_canceled,
    update_ai_tool_job,
)


async def execute_product_scene_tool_job(job_id: str):
    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            raise RuntimeError("AI tool job not found")

        payload = job.payload_json or {}
        image_url = payload.get("image_url")
        theme = str(payload.get("theme", "studio"))
        aspect_ratio = str(payload.get("aspect_ratio", "1:1"))
        model_quality = str(payload.get("_model_quality", "standard"))

        if not image_url:
            raise ValueError("Missing image_url in job payload")

        if job.cancel_requested:
            await set_ai_tool_job_canceled(session, job, "Refund: job product scene dibatalkan")
            await session.commit()
            return

        job.status = "uploading"
        job.phase_message = "Menyiapkan foto produk"
        job.progress_percent = 20
        job.started_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()

    original_bytes = await download_image(str(image_url))

    await update_ai_tool_job(
        job_id,
        status="processing",
        phase_message="AI sedang membuat product scene",
        progress_percent=70,
    )

    final_bytes = await product_scene_service.generate_product_scene(
        image_bytes=original_bytes,
        theme=theme,
        aspect_ratio=aspect_ratio,
        quality=model_quality,
    )

    await update_ai_tool_job(
        job_id,
        status="saving",
        phase_message="Menyimpan hasil product scene",
        progress_percent=90,
    )

    result_url = await upload_image(
        final_bytes,
        content_type="image/jpeg",
        prefix="product_scene_async",
    )

    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            return

        if job.cancel_requested:
            await set_ai_tool_job_canceled(session, job, "Refund: job product scene dibatalkan")
            await session.commit()
            return

        session.add(
            AiToolResult(
                user_id=job.user_id,
                tool_name="product_scene",
                result_url=result_url,
                file_size=len(final_bytes),
                input_summary=f"Product scene: {theme}",
            )
        )

        job.status = "completed"
        job.result_url = result_url
        job.phase_message = "Selesai"
        job.progress_percent = 100
        job.finished_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()


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
            await set_ai_tool_job_canceled(session, job, "Refund: job watermark dibatalkan")
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
            await set_ai_tool_job_canceled(session, job, "Refund: job watermark dibatalkan")
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

    zip_bytes, errors = await batch_service.process_batch(
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
        }
        job.payload_json = payload

        job.status = "completed"
        job.result_url = result_url
        job.phase_message = "Selesai"
        job.progress_percent = 100
        job.finished_at = datetime.now(timezone.utc)
        session.add(job)
        await session.commit()
