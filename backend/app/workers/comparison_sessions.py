"""Background processing for persisted model comparison sessions."""

import asyncio
import logging
import os
import secrets
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.core.credit_costs import COST_GENERATE_DESIGN, COST_GENERATE_DESIGN_ULTRA
from app.core.database import AsyncSessionLocal
from app.models.comparison_session import ComparisonSession
from app.models.user import User
from app.services.credit_service import log_credit_change
from app.services.image_service import generate_background, generate_background_ultra
from app.services.llm_service import parse_design_text
from app.services.storage_service import download_image, upload_image
from app.workers.ai_tool_jobs_common import run_async as run_worker_async
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def _tier_cost(tier: str) -> int:
    return COST_GENERATE_DESIGN_ULTRA if tier == "ultra" else COST_GENERATE_DESIGN


def build_initial_variants(tiers: List[str]) -> List[Dict[str, object]]:
    return [
        {
            "tier": tier,
            "status": "queued",
            "estimated_cost": _tier_cost(tier),
            "result_url": None,
            "error_message": None,
        }
        for tier in tiers
    ]


def generate_share_slug() -> str:
    return secrets.token_urlsafe(9).replace("_", "").replace("-", "")[:12]


async def _persist_variants(
    session_id: str,
    variants: List[Dict[str, object]],
    **fields,
) -> None:
    async with AsyncSessionLocal() as db:
        record = await db.get(ComparisonSession, session_id)
        if not record:
            return
        record.variants_json = variants
        for key, value in fields.items():
            setattr(record, key, value)
        await db.commit()


async def _refund_variant(user_id: str, amount: int, description: str) -> None:
    if amount <= 0:
        return
    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)
        if not user:
            return
        await log_credit_change(db, user, amount, description)
        await db.commit()


async def _process_comparison_session(session_id: str) -> None:
    async with AsyncSessionLocal() as db:
        record = await db.get(ComparisonSession, session_id)
        if not record:
            return

        raw_text = record.raw_text
        aspect_ratio = record.aspect_ratio
        integrated_text = record.integrated_text
        user_id = str(record.user_id)
        variants = list(record.variants_json or [])

        record.status = "processing"
        record.error_message = None
        await db.commit()

    try:
        parsed = await parse_design_text(raw_text, integrated_text=integrated_text)
        if parsed.visual_prompt_parts:
            assembled = ", ".join(
                part.value for part in parsed.visual_prompt_parts if part.enabled
            )
            visual_prompt = assembled if assembled else parsed.visual_prompt
        else:
            visual_prompt = parsed.visual_prompt
    except Exception as exc:  # pragma: no cover - provider dependent
        refund_total = sum(int(item.get("estimated_cost", 0)) for item in variants)
        await _refund_variant(user_id, refund_total, "Refund: comparison session gagal")
        await _persist_variants(
            session_id,
            variants,
            status="failed",
            error_message=str(exc),
            completed_at=datetime.now(timezone.utc),
        )
        return

    failure_count = 0
    for index, variant in enumerate(variants):
        tier = str(variant.get("tier", "basic"))
        variant["status"] = "processing"
        await _persist_variants(session_id, variants)

        try:
            if tier == "ultra":
                result = await generate_background_ultra(
                    visual_prompt=visual_prompt,
                    aspect_ratio=aspect_ratio,
                )
            else:
                result = await generate_background(
                    visual_prompt=visual_prompt,
                    aspect_ratio=aspect_ratio,
                    integrated_text=integrated_text,
                    model_tier=tier,
                )

            generated_bytes = await download_image(result["image_url"])
            permanent_url = await upload_image(
                generated_bytes,
                content_type=result.get("content_type", "image/jpeg"),
                prefix="comparison",
            )
            variant["status"] = "completed"
            variant["result_url"] = permanent_url
            variant["error_message"] = None
        except Exception as exc:  # pragma: no cover - provider dependent
            failure_count += 1
            variant["status"] = "failed"
            variant["error_message"] = str(exc)
            await _refund_variant(
                user_id,
                int(variant.get("estimated_cost", 0)),
                f"Refund: compare models {tier} gagal",
            )

        variants[index] = variant
        await _persist_variants(session_id, variants)

    status = "completed"
    error_message: Optional[str] = None
    if failure_count == len(variants):
        status = "failed"
        error_message = "Semua varian comparison gagal diproses."
    elif failure_count > 0:
        status = "partial_failed"
        error_message = "Sebagian varian comparison gagal diproses."

    await _persist_variants(
        session_id,
        variants,
        status=status,
        error_message=error_message,
        completed_at=datetime.now(timezone.utc),
    )


@celery_app.task(
    bind=True,
    name="process_comparison_session",
    time_limit=900,
    soft_time_limit=840,
    max_retries=1,
)
def process_comparison_session_task(self, session_id: str):
    return run_worker_async(_process_comparison_session(session_id))


async def _tracked_process_comparison_session(session_id: str) -> None:
    """Wrapper yang memastikan status DB di-update meski task crash sebelum sempat write."""
    try:
        await _process_comparison_session(session_id)
    except Exception as exc:
        logger.exception(
            "Unhandled failure in comparison session background task",
            extra={"session_id": session_id},
        )
        try:
            async with AsyncSessionLocal() as db:
                record = await db.get(ComparisonSession, session_id)
                if record:
                    record.status = "failed"
                    record.error_message = f"System error: {exc}"
                    record.completed_at = datetime.now(timezone.utc)
                    await db.commit()
        except Exception as persist_err:
            logger.error(
                "Could not persist failed status for comparison session",
                extra={"session_id": session_id, "error": str(persist_err)},
            )


def dispatch_comparison_session(session_id: str) -> None:
    use_celery = os.getenv("USE_CELERY", "false").lower() == "true"
    if use_celery:
        process_comparison_session_task.delay(session_id)
        return

    asyncio.create_task(_tracked_process_comparison_session(session_id))
