import secrets
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError, ValidationError, NotFoundError
from app.models.ai_tool_job import AiToolJob
from app.models.ai_usage_event import AiUsageEvent
from app.models.analytics_event import AnalyticsEvent
from app.models.beta_allowlist import BetaAllowlist
from app.models.credit_transaction import CreditTransaction
from app.models.credit_purchase import CreditPurchase
from app.models.design_export import DesignExport
from app.models.design_feedback import DesignFeedback
from app.models.job import Job
from app.models.project import Project
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


async def _signups_by_invite_source(db: AsyncSession, since: datetime) -> dict[str, int]:
    result = await db.execute(
        select(User.invite_source, func.count(User.id))
        .where(User.created_at >= since)
        .group_by(User.invite_source)
    )
    return {str(source or "unknown"): int(count) for source, count in result.all()}


async def _count_repeat_purchasers(db: AsyncSession, model, since: datetime) -> int:
    repeat_users = (
        select(model.user_id)
        .where(model.status == "paid", model.created_at >= since)
        .group_by(model.user_id)
        .having(func.count(model.id) > 1)
        .subquery()
    )
    result = await db.execute(select(func.count()).select_from(repeat_users))
    return int(result.scalar() or 0)


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


async def _recent_feedback(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(DesignFeedback)
        .order_by(desc(DesignFeedback.created_at))
        .limit(10)
    )
    return [
        {
            "id": str(feedback.id),
            "user_id": str(feedback.user_id),
            "design_id": str(feedback.design_id) if feedback.design_id else None,
            "job_id": str(feedback.job_id) if feedback.job_id else None,
            "rating": feedback.rating,
            "helpful": feedback.helpful,
            "source": feedback.source,
            "export_format": feedback.export_format,
            "note": feedback.note,
            "created_at": feedback.created_at.isoformat() if feedback.created_at else None,
        }
        for feedback in result.scalars().all()
    ]


def _safe_rate(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100, 2)


async def _count_users_with_export_events(db: AsyncSession, since: datetime) -> int:
    """Count distinct users with at least one successful export event."""
    result = await db.execute(
        select(func.count(func.distinct(DesignExport.user_id)))
        .where(
            DesignExport.created_at >= since,
            DesignExport.success.is_(True),
        )
    )
    return int(result.scalar() or 0)


async def _visitor_to_signup_metrics(db: AsyncSession, since: datetime) -> dict[str, int]:
    visitors_subquery = (
        select(AnalyticsEvent.visitor_id)
        .where(
            AnalyticsEvent.event_name == "landing_viewed",
            AnalyticsEvent.created_at >= since,
        )
        .distinct()
        .subquery()
    )
    signups_subquery = (
        select(AnalyticsEvent.visitor_id)
        .where(
            AnalyticsEvent.event_name == "signup_completed",
            AnalyticsEvent.created_at >= since,
        )
        .distinct()
        .subquery()
    )

    visitors = await _scalar_int(db, select(func.count()).select_from(visitors_subquery))
    signups = await _scalar_int(db, select(func.count()).select_from(signups_subquery))
    converted = await _scalar_int(
        db,
        select(func.count()).select_from(
            visitors_subquery.join(
                signups_subquery,
                visitors_subquery.c.visitor_id == signups_subquery.c.visitor_id,
            )
        ),
    )

    return {"visitors": visitors, "signups": signups, "converted": converted}


def _cohort_date_value(value: object) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


async def _count_active_users_in_window(
    db: AsyncSession,
    cohort_user_ids: set,
    activity_start: datetime,
    activity_end: datetime,
) -> int:
    if not cohort_user_ids:
        return 0

    active_user_ids: set = set()

    project_result = await db.execute(
        select(Project.user_id).where(
            Project.user_id.in_(cohort_user_ids),
            Project.created_at >= activity_start,
            Project.created_at < activity_end,
        )
    )
    active_user_ids.update(row[0] for row in project_result.all())

    usage_result = await db.execute(
        select(AiUsageEvent.user_id).where(
            AiUsageEvent.user_id.in_(cohort_user_ids),
            AiUsageEvent.created_at >= activity_start,
            AiUsageEvent.created_at < activity_end,
            AiUsageEvent.status.in_(["charged", "succeeded", "completed", "refunded"]),
        )
    )
    active_user_ids.update(row[0] for row in usage_result.all())

    export_result = await db.execute(
        select(DesignExport.user_id).where(
            DesignExport.user_id.in_(cohort_user_ids),
            DesignExport.created_at >= activity_start,
            DesignExport.created_at < activity_end,
            DesignExport.success.is_(True),
        )
    )
    active_user_ids.update(row[0] for row in export_result.all())

    return len(active_user_ids)


async def _get_cohort_d1_d7_retention(db: AsyncSession) -> dict:
    """Calculate D1 and D7 retention based on signup cohorts.

    Returns dict with cohort dates and their D0/D1/D7 retention metrics.
    """
    # Get users who signed up and their first action day
    cohort_query = select(
        func.date(User.created_at).label("cohort_date"),
        func.count(func.distinct(User.id)).label("d0_users"),
    ).group_by(func.date(User.created_at)).order_by(desc(func.date(User.created_at))).limit(4)

    result = await db.execute(cohort_query)
    cohorts = result.all()

    cohort_data = {}
    for cohort_date, d0_users in cohorts:
        cohort_day = _cohort_date_value(cohort_date)
        cohort_start = datetime.combine(cohort_day, time.min).replace(tzinfo=timezone.utc)
        cohort_end = cohort_start + timedelta(days=1)
        d1_start = cohort_start + timedelta(days=1)
        d1_end = d1_start + timedelta(days=1)
        d7_start = cohort_start + timedelta(days=7)
        d7_end = d7_start + timedelta(days=1)

        cohort_users_result = await db.execute(
            select(User.id).where(
                User.created_at >= cohort_start,
                User.created_at < cohort_end,
            )
        )
        cohort_user_ids = {row[0] for row in cohort_users_result.all()}

        d1_users = await _count_active_users_in_window(db, cohort_user_ids, d1_start, d1_end)
        d7_users = await _count_active_users_in_window(db, cohort_user_ids, cohort_start, d7_end)

        cohort_data[cohort_day.isoformat()] = {
            "d0_users": d0_users,
            "d1_users": d1_users,
            "d7_users": d7_users,
            "d1_retention_percent": _safe_rate(d1_users, d0_users),
            "d7_retention_percent": _safe_rate(d7_users, d0_users),
        }

    return cohort_data


async def _count_repeat_purchasers_within_30d(db: AsyncSession, since_30d: datetime) -> int:
    """Count users who made 2+ credit purchases within a 30-day window."""
    result = await db.execute(
        select(CreditPurchase.user_id, CreditPurchase.paid_at).where(
            CreditPurchase.status == "paid",
            CreditPurchase.paid_at >= since_30d,
        )
    )
    purchases_by_user: dict = defaultdict(list)
    for user_id, paid_at in result.all():
        if user_id is not None and paid_at is not None:
            purchases_by_user[user_id].append(paid_at)

    repeat_users = 0
    for purchase_times in purchases_by_user.values():
        if len(purchase_times) < 2:
            continue
        purchase_times.sort()
        if purchase_times[-1] - purchase_times[0] <= timedelta(days=30):
            repeat_users += 1

    return repeat_users


async def _weekly_beta_review(db: AsyncSession, since_7d: datetime, since_30d: datetime) -> dict:
    signup_users_7d = await _scalar_int(
        db,
        select(func.count(User.id)).where(User.created_at >= since_7d),
    )

    users_with_first_design_7d = await _scalar_int(
        db,
        select(func.count(func.distinct(Project.user_id)))
        .select_from(User)
        .join(Project, Project.user_id == User.id)
        .where(
            User.created_at >= since_7d,
            Project.created_at >= User.created_at,
        ),
    )

    users_with_generation_7d = await _scalar_int(
        db,
        select(func.count(func.distinct(AiUsageEvent.user_id)))
        .select_from(User)
        .join(AiUsageEvent, AiUsageEvent.user_id == User.id)
        .where(
            User.created_at >= since_7d,
            AiUsageEvent.created_at >= since_7d,
            AiUsageEvent.status.in_(["charged", "succeeded", "completed", "refunded"]),
        ),
    )

    users_with_export_events_7d = await _count_users_with_export_events(db, since_7d)
    visitor_signup = await _visitor_to_signup_metrics(db, since_7d)

    paying_users_30d = await _scalar_int(
        db,
        select(func.count(func.distinct(StoragePurchase.user_id))).where(
            StoragePurchase.status == "paid",
            StoragePurchase.paid_at >= since_30d,
        ),
    )

    paying_users_after_export_30d = await _scalar_int(
        db,
        select(func.count(func.distinct(StoragePurchase.user_id)))
        .join(DesignExport, DesignExport.user_id == StoragePurchase.user_id)
        .where(
            StoragePurchase.status == "paid",
            StoragePurchase.paid_at >= since_30d,
            DesignExport.created_at >= since_7d,
            DesignExport.success.is_(True),
        ),
    )

    repeat_purchasers_30d = await _count_repeat_purchasers_within_30d(db, since_30d)

    repeat_use_subquery = (
        select(AiUsageEvent.user_id)
        .join(StoragePurchase, StoragePurchase.user_id == AiUsageEvent.user_id)
        .where(
            StoragePurchase.status == "paid",
            StoragePurchase.paid_at >= since_30d,
            AiUsageEvent.created_at >= since_30d,
            AiUsageEvent.status.in_(["charged", "succeeded", "completed", "refunded"]),
        )
        .group_by(AiUsageEvent.user_id)
        .having(func.count(func.distinct(func.date(AiUsageEvent.created_at))) >= 2)
        .subquery()
    )

    repeat_use_paying_users_30d = await _scalar_int(
        db,
        select(func.count()).select_from(repeat_use_subquery),
    )

    cohort_retention = await _get_cohort_d1_d7_retention(db)

    ai_actual_cost_7d = await _scalar_float(
        db,
        select(func.coalesce(func.sum(AiUsageEvent.actual_cost), 0)).where(
            AiUsageEvent.created_at >= since_7d
        ),
    )

    return {
        "window_days": 7,
        "funnel": {
            "visitor_to_signup": {
                "count": visitor_signup["converted"],
                "rate_percent": _safe_rate(visitor_signup["converted"], visitor_signup["visitors"]),
                "visitors": visitor_signup["visitors"],
                "signups": visitor_signup["signups"],
                "note": "Backend-owned visitor and signup events stored in analytics_events.",
            },
            "signup_to_first_design": {
                "count": users_with_first_design_7d,
                "rate_percent": _safe_rate(users_with_first_design_7d, signup_users_7d),
            },
            "first_design_to_generation": {
                "count": users_with_generation_7d,
                "rate_percent": _safe_rate(users_with_generation_7d, users_with_first_design_7d),
            },
            "generation_to_export": {
                "count": users_with_export_events_7d,
                "rate_percent": _safe_rate(users_with_export_events_7d, users_with_generation_7d),
                "note": "Backend-owned export events (tidak depend pada user feedback submission).",
            },
            "export_to_payment": {
                "count": paying_users_after_export_30d,
                "rate_percent": _safe_rate(paying_users_after_export_30d, users_with_export_events_7d),
                "note": "Window payment uses backend export events as the source of truth.",
            },
            "payment_to_repeat_use": {
                "count": repeat_use_paying_users_30d,
                "rate_percent": _safe_rate(repeat_use_paying_users_30d, paying_users_30d),
            },
            "payment_to_repeat_purchase": {
                "count": repeat_purchasers_30d,
                "rate_percent": _safe_rate(repeat_purchasers_30d, paying_users_30d),
            },
        },
        "cost": {
            "ai_actual_cost_7d": round(ai_actual_cost_7d, 4),
            "paying_users_30d": paying_users_30d,
            "ai_cost_per_paying_user": round(ai_actual_cost_7d / paying_users_30d, 4) if paying_users_30d > 0 else 0.0,
        },
        "retention": cohort_retention,
        "repeat_purchase_30d": {
            "count": repeat_purchasers_30d,
            "note": "Users dengan 2+ credit purchases dalam 30 hari.",
        },
    }


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

    # Signups by invite source (last 7 days)
    signups_by_invite_source = await _signups_by_invite_source(db, since_7d)

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
    credit_payment_status = await _count_by_status(db, CreditPurchase)
    credit_revenue_30d_idr = await _scalar_int(
        db,
        select(func.coalesce(func.sum(CreditPurchase.amount), 0)).where(
            CreditPurchase.status == "paid",
            CreditPurchase.paid_at >= since_30d,
        ),
    )
    credit_purchases_30d = await _scalar_int(
        db,
        select(func.count(CreditPurchase.id)).where(
            CreditPurchase.created_at >= since_30d,
        ),
    )
    credit_paid_30d = await _scalar_int(
        db,
        select(func.count(CreditPurchase.id)).where(
            CreditPurchase.status == "paid",
            CreditPurchase.paid_at >= since_30d,
        ),
    )
    credit_failed_30d = await _scalar_int(
        db,
        select(func.count(CreditPurchase.id)).where(
            CreditPurchase.status.in_(["failed", "expired", "canceled"]),
            CreditPurchase.created_at >= since_30d,
        ),
    )
    credit_repeat_purchasers_30d = await _count_repeat_purchasers(db, CreditPurchase, since_30d)
    feedback_count_7d = await _scalar_int(
        db,
        select(func.count(DesignFeedback.id)).where(
            DesignFeedback.created_at >= since_7d
        ),
    )
    feedback_avg_rating_7d = await _scalar_float(
        db,
        select(func.coalesce(func.avg(DesignFeedback.rating), 0)).where(
            DesignFeedback.created_at >= since_7d
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
            "signups_by_invite_source_7d": signups_by_invite_source,
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
            "credit_by_status": credit_payment_status,
            "credit_revenue_30d_idr": credit_revenue_30d_idr,
            "credit_purchases_30d": credit_purchases_30d,
            "credit_paid_30d": credit_paid_30d,
            "credit_failed_30d": credit_failed_30d,
            "credit_repeat_purchasers_30d": credit_repeat_purchasers_30d,
        },
        "feedback": {
            "count_7d": feedback_count_7d,
            "average_rating_7d": feedback_avg_rating_7d,
            "recent": await _recent_feedback(db),
        },
        "weekly_beta_review": await _weekly_beta_review(db, since_7d, since_30d),
    }


# ===============================
# Beta Allowlist Management
# ===============================

@router.post(
    "/beta-allowlist/add",
    status_code=status.HTTP_201_CREATED,
    summary="Add beta allowlist entry",
    description="Add an email or invite code to the beta allowlist.",
)
async def add_allowlist_entry(
    payload: dict,  # {entry_type, entry_value, beta_cohort?, initial_credits_grant?, notes?}
    _: None = Depends(require_internal_token),
    db: AsyncSession = Depends(get_db),
):
    """
    Add a new allowlist entry for beta gating.
    entry_type: 'email' or 'code'
    """
    from app.services.beta_allowlist_service import create_allowlist_entry

    entry_type = payload.get("entry_type", "").strip()
    entry_value = payload.get("entry_value", "").strip()

    if not entry_type or entry_type not in ("email", "code"):
        raise ValidationError(detail="entry_type must be 'email' or 'code'")
    if not entry_value:
        raise ValidationError(detail="entry_value is required")

    entry = await create_allowlist_entry(
        entry_type=entry_type,
        entry_value=entry_value,
        initial_credits_grant=payload.get("initial_credits_grant", 0),
        beta_cohort=payload.get("beta_cohort"),
        created_by=payload.get("created_by", "operator"),
        notes=payload.get("notes"),
        db=db,
    )
    await db.commit()

    return {
        "id": str(entry.id),
        "entry_type": entry.entry_type,
        "entry_value": entry.entry_value,
        "status": entry.status,
        "message": f"{entry_type.capitalize()} added to allowlist",
    }


@router.get(
    "/beta-allowlist/list",
    status_code=status.HTTP_200_OK,
    summary="List beta allowlist entries",
)
async def list_allowlist_entries(
    limit: int = 50,
    offset: int = 0,
    entry_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    _: None = Depends(require_internal_token),
    db: AsyncSession = Depends(get_db),
):
    """
    List allowlist entries with optional filtering.
    """
    from app.services.beta_allowlist_service import list_allowlist_entries

    items, total_count = await list_allowlist_entries(
        db=db,
        limit=limit,
        offset=offset,
        entry_type=entry_type,
        status=status_filter,
    )

    return {
        "items": [
            {
                "id": str(item.id),
                "entry_type": item.entry_type,
                "entry_value": item.entry_value,
                "status": item.status,
                "beta_cohort": item.beta_cohort,
                "initial_credits_grant": item.initial_credits_grant,
                "used_count": item.used_count,
                "last_used_at": item.last_used_at.isoformat() if item.last_used_at else None,
                "created_at": item.created_at.isoformat(),
                "created_by": item.created_by,
                "notes": item.notes,
            }
            for item in items
        ],
        "total_count": total_count,
    }


@router.patch(
    "/beta-allowlist/{entry_id}",
    status_code=status.HTTP_200_OK,
    summary="Update beta allowlist entry",
)
async def update_allowlist_entry(
    entry_id: str,
    payload: dict,  # {status?, initial_credits_grant?, notes?}
    _: None = Depends(require_internal_token),
    db: AsyncSession = Depends(get_db),
):
    """
    Update an allowlist entry (status, credits, or notes).
    """
    from app.services.beta_allowlist_service import update_allowlist_entry
    from uuid import UUID

    entry = await update_allowlist_entry(
        entry_id=UUID(entry_id),
        status=payload.get("status"),
        initial_credits_grant=payload.get("initial_credits_grant"),
        notes=payload.get("notes"),
        db=db,
    )

    if not entry:
        raise NotFoundError(detail="Allowlist entry not found")

    await db.commit()

    return {
        "id": str(entry.id),
        "entry_type": entry.entry_type,
        "entry_value": entry.entry_value,
        "status": entry.status,
        "message": "Allowlist entry updated",
    }


@router.get(
    "/beta-allowlist/stats",
    status_code=status.HTTP_200_OK,
    summary="Get beta allowlist statistics",
)
async def get_allowlist_stats(
    _: None = Depends(require_internal_token),
    db: AsyncSession = Depends(get_db),
):
    """
    Get allowlist statistics: total entries, active entries, used entries, etc.
    """
    total = await _scalar_int(
        db,
        select(func.count(BetaAllowlist.id)),
    )
    active = await _scalar_int(
        db,
        select(func.count(BetaAllowlist.id)).where(BetaAllowlist.status == "active"),
    )
    used = await _scalar_int(
        db,
        select(func.count(BetaAllowlist.id)).where(BetaAllowlist.used_count > 0),
    )
    total_uses = await _scalar_int(
        db,
        select(func.sum(BetaAllowlist.used_count)),
    )

    result = await db.execute(
        select(BetaAllowlist.beta_cohort, func.count(BetaAllowlist.id))
        .where(BetaAllowlist.status == "active")
        .group_by(BetaAllowlist.beta_cohort)
    )
    by_cohort = {str(cohort): int(count) for cohort, count in result.all()}

    return {
        "total_entries": total,
        "active_entries": active,
        "used_entries": used,
        "total_uses": total_uses,
        "by_cohort": by_cohort,
    }
