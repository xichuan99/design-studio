"""Compatibility facade for AI tool job workers.

This module intentionally stays small and re-exports legacy symbols so
existing imports keep working while implementation lives in split modules.
"""

from __future__ import annotations

from app.workers.ai_tool_jobs_common import (
    run_async as _run_async,
    set_ai_tool_job_canceled as _set_ai_tool_job_canceled,
    update_ai_tool_job as _update_ai_tool_job,
)
from app.workers.ai_tool_jobs_runner import run_ai_tool_job
from app.workers.celery_app import celery_app


import logging
logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name="app.workers.tasks.process_ai_tool_job_task", max_retries=3)
def process_ai_tool_job_task(self, job_id: str):
    try:
        _run_async(run_ai_tool_job(
            job_id,
            current_retry=self.request.retries,
            max_retries=self.max_retries
        ))
    except Exception as exc:
        delay = (2 ** self.request.retries) * 5
        logger.info(f"Retrying task for job {job_id} in {delay}s...")
        raise self.retry(exc=exc, countdown=delay)


def run_ai_tool_job_now(job_id: str):
    _run_async(run_ai_tool_job(job_id))


__all__ = [
    "process_ai_tool_job_task",
    "run_ai_tool_job_now",
    "run_ai_tool_job",
    "_run_async",
    "_update_ai_tool_job",
    "_set_ai_tool_job_canceled",
]
