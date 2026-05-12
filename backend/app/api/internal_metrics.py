import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.models.ai_tool_job import AiToolJob
from app.models.ai_usage_event import AiUsageEvent
from app.models.credit_transaction import CreditTransaction
from app.models.job import Job
from app.models.storage_purchase import StoragePurchase
from app.models.user import User
from app.services.llm_metrics import get_llm_metrics_snapshot

router = APIRouter(tags=["Internal"])


def require_internal_token(x_internal_token: Optional[str] = Header(default=None)) -> None:
    configured_token = settings.INTERNAL_METRICS_TOKEN.strip()
    if not configured_token:
        raise ForbiddenError(detail="INTERNAL_METRICS_TOKEN is not configured")

    if not x_internal_token:
        raise UnauthorizedError(detail="Missing X-Internal-Token header")

    if not secrets.compare_digest(x_internal_token, configured_token):
        raise UnauthorizedError(detail="Invalid internal token")


async def _scalar_int(db: AsyncSession, stmt) -> int:
    result = await db.execute(stmt)
    value = result.scalar()
    return int(value or 0)


async def _scalar_float(db: AsyncSession, stmt) -> float:
    result = await db.execute(stmt)
    value = result.scalar()
    return float(value or 0)


async def _count_by_status(db: AsyncSession, model) -> dict[str, int]:
    result = await db.execute(
        select(model.status, func.count()).group_by(model.status)
    )
    return {str(status): int(count) for status, count in result.all()}


async def _ai_usage_by_operation(db: AsyncSession, since: datetime) -> list[dict]:
    result = await db.execute(
        select(
            AiUsageEvent.operation,
            func.count(AiUsageEvent.id),
            func.coalesce(func.sum(AiUsageEvent.credits_charged), 0),
            func.coalesce(func.sum(AiUsageEvent.actual_cost), 0),
            func.coalesce(func.sum(AiUsageEvent.estimated_cost), 0),
        )
        .where(AiUsageEvent.created_at >= since)
        .group_by(AiUsageEvent.operation)
        .order_by(desc(func.count(AiUsageEvent.id)))
        .limit(10)
    )
    return [
        {
            "operation": operation,
            "count": int(count or 0),
            "credits_charged": int(credits or 0),
            "actual_cost": float(actual_cost or 0),
            "estimated_cost": float(estimated_cost or 0),
        }
        for operation, count, credits, actual_cost, estimated_cost in result.all()
    ]


async def _recent_failures(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(AiUsageEvent)
        .where(AiUsageEvent.status.in_(["failed", "refunded", "canceled"]))
        .order_by(desc(AiUsageEvent.created_at))
        .limit(10)
    )
    return [
        {
            "id": str(event.id),
            "user_id": str(event.user_id),
            "job_id": str(event.job_id) if event.job_id else None,
            "ai_tool_job_id": str(event.ai_tool_job_id) if event.ai_tool_job_id else None,
            "operation": event.operation,
            "status": event.status,
            "credits_charged": event.credits_charged,
            "error_code": event.error_code,
            "error_message": event.error_message,
            "created_at": event.created_at.isoformat() if event.created_at else None,
        }
        for event in result.scalars().all()
    ]


@router.get("/llm-metrics")
async def get_internal_llm_metrics(_: None = Depends(require_internal_token)):

    return get_llm_metrics_snapshot()


@router.get("/operator-summary")
async def get_operator_summary(
    _: None = Depends(require_internal_token),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    since_7d = now - timedelta(days=7)
    since_30d = now - timedelta(days=30)

    users_total = await _scalar_int(db, select(func.count(User.id)))
    users_new_7d = await _scalar_int(
        db, select(func.count(User.id)).where(User.created_at >= since_7d)
    )

    design_jobs_by_status = await _count_by_status(db, Job)
    ai_tool_jobs_by_status = await _count_by_status(db, AiToolJob)

    ai_usage_by_status = await _count_by_status(db, AiUsageEvent)
    ai_usage_7d_count = await _scalar_int(
        db, select(func.count(AiUsageEvent.id)).where(AiUsageEvent.created_at >= since_7d)
    )
    ai_usage_7d_credits = await _scalar_int(
        db,
        select(func.coalesce(func.sum(AiUsageEvent.credits_charged), 0)).where(
            AiUsageEvent.created_at >= since_7d
        ),
    )
    ai_usage_7d_actual_cost = await _scalar_float(
        db,
        select(func.coalesce(func.sum(AiUsageEvent.actual_cost), 0)).where(
            AiUsageEvent.created_at >= since_7d
        ),
    )
    ai_usage_7d_estimated_cost = await _scalar_float(
        db,
        select(func.coalesce(func.sum(AiUsageEvent.estimated_cost), 0)).where(
            AiUsageEvent.created_at >= since_7d
        ),
    )

    credit_consumed_7d = await _scalar_int(
        db,
        select(func.coalesce(func.sum(-CreditTransaction.amount), 0)).where(
            CreditTransaction.created_at >= since_7d,
            CreditTransaction.amount < 0,
        ),
    )
    credit_refunded_7d = await _scalar_int(
        db,
        select(func.coalesce(func.sum(CreditTransaction.amount), 0)).where(
            CreditTransaction.created_at >= since_7d,
            CreditTransaction.amount > 0,
            CreditTransaction.description.ilike("Refund:%"),
        ),
    )

    payment_status = await _count_by_status(db, StoragePurchase)
    storage_revenue_30d_idr = await _scalar_int(
        db,
        select(func.coalesce(func.sum(StoragePurchase.amount), 0)).where(
            StoragePurchase.status == "paid",
            StoragePurchase.paid_at >= since_30d,
        ),
    )

    pending_work = {
        "design_jobs": int(design_jobs_by_status.get("queued", 0))
        + int(design_jobs_by_status.get("processing", 0)),
        "ai_tool_jobs": int(ai_tool_jobs_by_status.get("queued", 0))
        + int(ai_tool_jobs_by_status.get("processing", 0))
        + int(ai_tool_jobs_by_status.get("running", 0)),
    }

    return {
        "generated_at": now.isoformat(),
        "users": {
            "total": users_total,
            "new_7d": users_new_7d,
        },
        "jobs": {
            "design_by_status": design_jobs_by_status,
            "ai_tool_by_status": ai_tool_jobs_by_status,
            "pending_work": pending_work,
        },
        "ai_usage": {
            "by_status": ai_usage_by_status,
            "last_7d": {
                "event_count": ai_usage_7d_count,
                "credits_charged": ai_usage_7d_credits,
                "actual_cost": ai_usage_7d_actual_cost,
                "estimated_cost": ai_usage_7d_estimated_cost,
                "by_operation": await _ai_usage_by_operation(db, since_7d),
            },
            "recent_failures": await _recent_failures(db),
        },
        "credits": {
            "consumed_7d": credit_consumed_7d,
            "refunded_7d": credit_refunded_7d,
        },
        "payments": {
            "storage_by_status": payment_status,
            "storage_revenue_30d_idr": storage_revenue_30d_idr,
        },
    }
