"""Celery and async worker handlers for design generation jobs."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

from sqlalchemy import update

from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.models.job import Job
from app.services.llm_client import LLMRateLimitError
from app.services.image_service import generate_background
from app.services.llm_service import parse_design_text
from app.services.preprocess import prepare_reference
from app.services.storage_service import download_image, upload_image
from app.workers.ai_tool_jobs_common import run_async as _run_async
from app.workers.celery_app import celery_app


async def _update_job_status(job_id, **fields):
    """Update a job record in the database."""
    async with AsyncSessionLocal() as session:
        await session.execute(update(Job).where(Job.id == job_id).values(**fields))
        await session.commit()


async def _get_job_checkpoint(job_id: str) -> dict:
    """Load persisted intermediate fields so retries can resume from checkpoints."""
    async with AsyncSessionLocal() as session:
        job_record = await session.get(Job, job_id)
        if not job_record:
            return {}
        return {
            "parsed_headline": job_record.parsed_headline,
            "parsed_sub_headline": job_record.parsed_sub_headline,
            "parsed_cta": job_record.parsed_cta,
            "visual_prompt": job_record.visual_prompt,
            "quantum_layout": job_record.quantum_layout,
            "result_url": job_record.result_url,
        }


async def _execute_pipeline(
    job_id: str,
    raw_text: str,
    aspect_ratio: str,
    style: str,
    reference_url: str | None,
    integrated_text: bool,
    reference_focus: str = "auto",
    brand_colors: list | None = None,
    brand_typography: dict | None = None,
    seed: str | None = None,
    charged_credits: int = 40,
    current_retry: int = 0,
    max_retries: int = 0,
):
    """Execute the full generation pipeline."""
    try:
        if current_retry > 0:
            logger.info(f"Retrying design generation (Attempt {current_retry}/{max_retries}) | Job: {job_id}")
            await _update_job_status(job_id, status="processing", error_message=None)
        else:
            logger.info(f"Starting design generation | Job: {job_id}")
            await _update_job_status(job_id, status="processing")

        checkpoint = await _get_job_checkpoint(job_id)
        parsed_headline = checkpoint.get("parsed_headline")
        parsed_sub_headline = checkpoint.get("parsed_sub_headline")
        parsed_cta = checkpoint.get("parsed_cta")
        visual_prompt_final = checkpoint.get("visual_prompt")

        if visual_prompt_final:
            logger.info("Reusing persisted parse checkpoint | Job: %s", job_id)
        else:
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

            parsed_headline = parsed.headline
            parsed_sub_headline = parsed.sub_headline
            parsed_cta = parsed.cta

            await _update_job_status(
                job_id,
                parsed_headline=parsed_headline,
                parsed_sub_headline=parsed_sub_headline,
                parsed_cta=parsed_cta,
                visual_prompt=visual_prompt_final,
            )

        if settings.QUANTUM_LAYOUT_ENABLED and not checkpoint.get("quantum_layout"):
            from app.services.quantum_service import optimize_quantum_layout
            import json as _json

            quantum_layout = await optimize_quantum_layout(
                parsed_headline, parsed_sub_headline, parsed_cta
            )
            if quantum_layout:
                await _update_job_status(job_id, quantum_layout=quantum_layout)
                try:
                    ql_data = _json.loads(quantum_layout)
                    modifier = ql_data.get("image_prompt_modifier")
                    if modifier:
                        visual_prompt_final = f"{visual_prompt_final} {modifier}"
                except Exception:
                    pass

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
            reference_focus=reference_focus,
            style=style,
            aspect_ratio=aspect_ratio,
            integrated_text=integrated_text,
            seed=seed,
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
            file_size=len(gen_bytes),
            completed_at=datetime.now(timezone.utc),
        )
        logger.info(f"Design generation completed successfully | Job: {job_id}")

    except Exception as e:
        is_final_attempt = current_retry >= max_retries

        if is_final_attempt:
            logger.exception(f"Design generation failed permanently | Job: {job_id}")
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
                            session, user_record, charged_credits, "Refund: server task gagal"
                        )
                await session.commit()
        else:
            logger.warning(f"Design generation failed. Will retry (Attempt {current_retry}/{max_retries}). Error: {str(e)} | Job: {job_id}")

        raise


@celery_app.task(bind=True, name="generate_design", time_limit=600, soft_time_limit=540, max_retries=3)
def generate_design_task(self, *args, **kwargs):
    """Celery task: runs the full design generation pipeline."""
    task_ctx = self
    if args and hasattr(args[0], "request") and hasattr(args[0], "retry") and "job_id" in kwargs:
        # Supports direct unit-test invocation where a fake task context is passed
        # as the first argument alongside keyword payload arguments.
        task_ctx = args[0]
        args = args[1:]

    arg_names = [
        "job_id",
        "raw_text",
        "aspect_ratio",
        "style",
        "reference_url",
        "reference_focus",
        "integrated_text",
        "brand_colors",
        "brand_typography",
        "seed",
    ]
    payload = {name: value for name, value in zip(arg_names, args)}
    payload.update(kwargs)

    job_id = payload["job_id"]
    raw_text = payload["raw_text"]
    aspect_ratio = payload.get("aspect_ratio", "1:1")
    style = payload.get("style", "auto")
    reference_url = payload.get("reference_url")
    reference_focus = payload.get("reference_focus", "auto")
    integrated_text = payload.get("integrated_text", False)
    brand_colors = payload.get("brand_colors")
    brand_typography = payload.get("brand_typography")
    seed = payload.get("seed")
    charged_credits = int(payload.get("charged_credits", 40))

    try:
        _run_async(
            _execute_pipeline(
                job_id,
                raw_text,
                aspect_ratio,
                style,
                reference_url,
                integrated_text,
                reference_focus,
                brand_colors,
                brand_typography,
                seed=seed,
                charged_credits=charged_credits,
                current_retry=task_ctx.request.retries,
                max_retries=task_ctx.max_retries,
            )
        )
    except Exception as exc:
        if task_ctx.request.retries >= task_ctx.max_retries:
            logger.error(f"Task for design job {job_id} failed after {task_ctx.max_retries} retries: {exc}")
            return

        if isinstance(exc, LLMRateLimitError):
            delay = max((2 ** task_ctx.request.retries) * 5, exc.retry_after_seconds)
            logger.info(
                "Retrying task for design job %s after rate limit in %ss (model=%s)...",
                job_id,
                delay,
                exc.model_id,
            )
            raise task_ctx.retry(exc=exc, countdown=delay)

        delay = (2 ** task_ctx.request.retries) * 5
        logger.info(f"Retrying task for design job {job_id} in {delay}s...")
        raise task_ctx.retry(exc=exc, countdown=delay)
