"""Public analytics ingestion for the core beta funnel."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.analytics import FunnelAnalyticsEventCreate, FunnelAnalyticsEventName
from app.services.analytics_event_service import log_funnel_analytics_event

router = APIRouter(tags=["Analytics"])


@router.post("/events", status_code=status.HTTP_201_CREATED)
async def create_funnel_event(
    payload: FunnelAnalyticsEventCreate,
    db: AsyncSession = Depends(get_db),
):
    if payload.event_name not in {
        FunnelAnalyticsEventName.landing_viewed,
        FunnelAnalyticsEventName.signup_completed,
    }:
        raise HTTPException(status_code=422, detail="Unsupported analytics event")

    event = await log_funnel_analytics_event(
        db,
        visitor_id=payload.visitor_id,
        event_name=payload.event_name.value,
        variant=payload.variant,
        auth_method=payload.auth_method,
        source=payload.source,
        properties=payload.properties,
    )
    await db.commit()

    return {"id": str(event.id), "event_name": event.event_name, "visitor_id": event.visitor_id}
