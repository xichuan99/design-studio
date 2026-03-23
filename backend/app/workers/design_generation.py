"""Celery and async worker handlers for design generation jobs."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from sqlalchemy import update

from app.core.database import AsyncSessionLocal
from app.models.job import Job
from app.services.image_service import generate_background
from app.services.llm_service import parse_design_text
from app.services.preprocess import prepare_reference
from app.services.storage_service import download_image, upload_image
from app.workers.celery_app import celery_app


def _run_async(coro):
    """Helper to run async code inside a sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _update_job_status(job_id, **fields):
    """Update a job record in the database."""
    async with AsyncSessionLocal() as session:
        await session.execute(update(Job).where(Job.id == job_id).values(**fields))
        await session.commit()


async def _execute_pipeline(
    job_id: str,
    raw_text: str,
    aspect_ratio: str,
    style: str,
    reference_url: str | None,
    integrated_text: bool,
    brand_colors: list | None = None,
    brand_typography: dict | None = None,
):
    """Execute the full generation pipeline."""
    try:
        await _update_job_status(job_id, status="processing")

        parsed = await parse_design_text(
            raw_text,
            integrated_text=integrated_text,
            brand_colors=brand_colors,
            brand_typography=brand_typography,
        )

        if parsed.visual_prompt_parts:
            assembled = ", ".join(
                p.value for p in parsed.visual_prompt_parts if p.enabled
            )
            visual_prompt_final = assembled if assembled else parsed.visual_prompt
        else:
            visual_prompt_final = parsed.visual_prompt

        await _update_job_status(
            job_id,
            parsed_headline=parsed.headline,
            parsed_sub_headline=parsed.sub_headline,
            parsed_cta=parsed.cta,
            visual_prompt=visual_prompt_final,
        )

        from app.services.quantum_service import optimize_quantum_layout

        quantum_layout = await optimize_quantum_layout(
            parsed.headline, parsed.sub_headline, parsed.cta
        )
        if quantum_layout:
            await _update_job_status(job_id, quantum_layout=quantum_layout)

        upload_ref_url = reference_url
        if reference_url:
            ref_bytes = await download_image(reference_url)
            prep = await prepare_reference(ref_bytes, aspect_ratio)
            upload_ref_url = await upload_image(
                prep["resized_bytes"], prefix="references"
            )

        result = await generate_background(
            visual_prompt=visual_prompt_final,
            reference_image_url=upload_ref_url,
            style=style,
            aspect_ratio=aspect_ratio,
            integrated_text=integrated_text,
        )

        gen_bytes = await download_image(result["image_url"])
        permanent_url = await upload_image(
            gen_bytes,
            content_type=result.get("content_type", "image/jpeg"),
            prefix="generated",
        )

        await _update_job_status(
            job_id,
            status="completed",
            result_url=permanent_url,
            completed_at=datetime.now(timezone.utc),
        )

    except Exception as e:
        async with AsyncSessionLocal() as session:
            job_record = await session.get(Job, job_id)
            if job_record:
                job_record.status = "failed"
                job_record.error_message = str(e)
                job_record.completed_at = datetime.now(timezone.utc)

                from app.models.user import User

                user_record = await session.get(User, job_record.user_id)
                if user_record:
                    from app.services.credit_service import log_credit_change

                    await log_credit_change(
                        session, user_record, 1, "Refund: server task gagal"
                    )
            await session.commit()
        raise


@celery_app.task(bind=True, name="generate_design", time_limit=300, soft_time_limit=270)
def generate_design_task(
    self,
    job_id: str,
    raw_text: str,
    aspect_ratio: str = "1:1",
    style: str = "auto",
    reference_url: str | None = None,
    integrated_text: bool = False,
    brand_colors: list | None = None,
    brand_typography: dict | None = None,
):
    """Celery task: runs the full design generation pipeline."""
    _run_async(
        _execute_pipeline(
            job_id,
            raw_text,
            aspect_ratio,
            style,
            reference_url,
            integrated_text,
            brand_colors,
            brand_typography,
        )
    )
