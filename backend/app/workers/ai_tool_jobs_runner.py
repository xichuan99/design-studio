"""AI tool job dispatcher and execution runner."""

from __future__ import annotations

from typing import Awaitable, Callable

from app.core.database import AsyncSessionLocal
from app.models.ai_tool_job import AiToolJob
from app.services.ai_tool_job_service import fail_ai_tool_job
from app.workers.ai_tool_jobs_background import (
    execute_background_swap_tool_job,
    execute_generative_expand_tool_job,
    execute_id_photo_tool_job,
    execute_magic_eraser_tool_job,
)
from app.workers.ai_tool_jobs_common import logger, refund_ai_tool_job_if_needed
from app.workers.ai_tool_jobs_creative import (
    execute_batch_tool_job,
    execute_product_scene_tool_job,
    execute_watermark_tool_job,
)
from app.workers.ai_tool_jobs_enhancement import (
    execute_retouch_tool_job,
)

AiToolExecutor = Callable[[str], Awaitable[None]]


AI_TOOL_EXECUTORS: dict[str, AiToolExecutor] = {
    "retouch": execute_retouch_tool_job,
    "background_swap": execute_background_swap_tool_job,
    "generative_expand": execute_generative_expand_tool_job,
    "id_photo": execute_id_photo_tool_job,
    "magic_eraser": execute_magic_eraser_tool_job,
    "product_scene": execute_product_scene_tool_job,
    "watermark": execute_watermark_tool_job,
    "batch": execute_batch_tool_job,
}


async def run_ai_tool_job(job_id: str, current_retry: int = 0, max_retries: int = 0):
    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            logger.error("AI tool job not found", extra={"job_id": job_id})
            return

        tool_name = job.tool_name
        executor = AI_TOOL_EXECUTORS.get(tool_name)
        if executor is None:
            await fail_ai_tool_job(session, job_id, f"Unsupported tool: {tool_name}")
            await refund_ai_tool_job_if_needed(
                session,
                job,
                reason=f"Refund: tool {tool_name} tidak didukung",
            )
            return

    try:
        if current_retry > 0:
            logger.info(f"Retrying AI tool job (Attempt {current_retry}/{max_retries}) | Tool: {tool_name}", extra={"job_id": job_id})
        else:
            logger.info(f"Starting AI tool job | Tool: {tool_name}", extra={"job_id": job_id})

        await executor(job_id)
        logger.info(f"AI tool job completed successfully | Tool: {tool_name}", extra={"job_id": job_id})
    except Exception as exc:
        is_final_attempt = current_retry >= max_retries

        if is_final_attempt:
            logger.exception("AI tool job failed permanently", extra={"job_id": job_id})

            async with AsyncSessionLocal() as session:
                await fail_ai_tool_job(session, job_id, str(exc))

                job_record = await session.get(AiToolJob, job_id)
                if job_record:
                    await refund_ai_tool_job_if_needed(
                        session,
                        job_record,
                        reason=f"Refund: job gagal ({job_record.tool_name})",
                    )
        else:
            logger.warning(
                f"AI tool job failed. Will retry (Attempt {current_retry}/{max_retries}). Error: {str(exc)}",
                extra={"job_id": job_id}
            )

        raise

