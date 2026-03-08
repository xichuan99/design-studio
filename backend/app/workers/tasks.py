from __future__ import annotations
"""
Celery tasks for async design generation.
Full pipeline: LLM parse → preprocess reference → Fal.ai generate → upload to S3.
"""
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select, update
from app.workers.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.job import Job
from app.services.llm_service import parse_design_text
from app.services.image_service import generate_background
from app.services.storage_service import upload_image, download_image
from app.services.preprocess import prepare_reference


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
        await session.execute(
            update(Job).where(Job.id == job_id).values(**fields)
        )
        await session.commit()


async def _execute_pipeline(job_id: str, raw_text: str, aspect_ratio: str, style: str, reference_url: str | None):
    """Execute the full generation pipeline."""
    try:
        # Step 1: Update status to processing
        await _update_job_status(job_id, status="processing")

        # Step 2: LLM parse the raw text
        parsed = await parse_design_text(raw_text)

        await _update_job_status(
            job_id,
            parsed_headline=parsed.headline,
            parsed_sub_headline=parsed.sub_headline,
            parsed_cta=parsed.cta,
            visual_prompt=parsed.visual_prompt,
        )

        # Step 3: Preprocess reference image if provided
        upload_ref_url = reference_url
        if reference_url:
            ref_bytes = await download_image(reference_url)
            prep = await prepare_reference(ref_bytes, aspect_ratio)
            # Upload resized reference to S3
            upload_ref_url = await upload_image(prep["resized_bytes"], prefix="references")

        # Step 4: Generate background image via Fal.ai
        result = await generate_background(
            visual_prompt=parsed.visual_prompt,
            reference_image_url=upload_ref_url,
            style=style,
            aspect_ratio=aspect_ratio,
        )

        # Step 5: Download the generated image from Fal.ai CDN and re-upload to our S3
        gen_bytes = await download_image(result["image_url"])
        permanent_url = await upload_image(
            gen_bytes,
            content_type=result.get("content_type", "image/jpeg"),
            prefix="generated",
        )

        # Step 6: Mark job as completed
        await _update_job_status(
            job_id,
            status="completed",
            result_url=permanent_url,
            completed_at=datetime.now(timezone.utc),
        )

    except Exception as e:
        await _update_job_status(
            job_id,
            status="failed",
            error_message=str(e),
            completed_at=datetime.now(timezone.utc),
        )
        raise


@celery_app.task(bind=True, name="generate_design")
def generate_design_task(self, job_id: str, raw_text: str, aspect_ratio: str = "1:1", style: str = "bold", reference_url: str | None = None):
    """Celery task: runs the full design generation pipeline."""
    _run_async(_execute_pipeline(job_id, raw_text, aspect_ratio, style, reference_url))
