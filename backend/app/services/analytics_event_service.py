"""Backend-owned analytics event logging and aggregation."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics_event import AnalyticsEvent


async def log_funnel_analytics_event(
    db: AsyncSession,
    *,
    visitor_id: str,
    event_name: str,
    variant: str | None = None,
    auth_method: str | None = None,
    source: str | None = None,
    properties: dict | None = None,
) -> AnalyticsEvent:
    event = AnalyticsEvent(
        visitor_id=visitor_id,
        event_name=event_name,
        variant=variant,
        auth_method=auth_method,
        source=source or "frontend",
        event_properties=properties or {},
    )
    db.add(event)
    await db.flush()
    return event


async def count_weekly_visitor_to_signup_metrics(
    db: AsyncSession,
    since: datetime,
) -> dict[str, int]:
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

    visitors_result = await db.execute(select(func.count()).select_from(visitors_subquery))
    signups_result = await db.execute(select(func.count()).select_from(signups_subquery))
    converted_result = await db.execute(
        select(func.count())
        .select_from(visitors_subquery.join(
            signups_subquery,
            visitors_subquery.c.visitor_id == signups_subquery.c.visitor_id,
        ))
    )

    return {
        "visitors": int(visitors_result.scalar() or 0),
        "signups": int(signups_result.scalar() or 0),
        "converted": int(converted_result.scalar() or 0),
    }
