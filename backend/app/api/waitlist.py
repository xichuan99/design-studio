from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.rate_limit import rate_limit_public
from app.core.database import get_db
from app.models.waitlist_entry import WaitlistEntry
from app.schemas.waitlist import (
    WaitlistCountResponse,
    WaitlistJoinRequest,
    WaitlistJoinResponse,
)
from app.utils.email import send_waitlist_confirmation_email

router = APIRouter(tags=["Waitlist"])


async def _resolve_position(db: AsyncSession, entry: WaitlistEntry) -> int:
    # Serialize position resolution to prevent TOCTOU race condition.
    # Two concurrent waitlist joins will block on this transaction-scoped
    # advisory lock, ensuring each count query sees a consistent snapshot
    # and assigned positions never overlap.
    await db.execute(select(func.pg_advisory_xact_lock(1001)))

    position_query = select(func.count(WaitlistEntry.id)).where(
        or_(
            WaitlistEntry.created_at < entry.created_at,
            and_(
                WaitlistEntry.created_at == entry.created_at,
                WaitlistEntry.email <= entry.email,
            ),
        )
    )
    position_result = await db.execute(position_query)
    return int(position_result.scalar() or 0)


@router.post(
    "",
    response_model=WaitlistJoinResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Join public waitlist",
)
async def join_waitlist(
    payload: WaitlistJoinRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> WaitlistJoinResponse:
    normalized_email = payload.email.strip().lower()

    await rate_limit_public(
        request=request,
        action="waitlist_join",
        limit=8,
    )

    existing_result = await db.execute(
        select(WaitlistEntry).where(WaitlistEntry.email == normalized_email)
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        position = await _resolve_position(db, existing)
        return WaitlistJoinResponse(
            id=str(existing.id),
            email=existing.email,
            position=position,
            is_new=False,
            delivery_status=existing.delivery_status,
            lead_magnet_delivered=existing.lead_magnet_delivered,
            created_at=existing.created_at,
        )

    entry = WaitlistEntry(
        email=normalized_email,
        name=payload.name,
        source=payload.source,
    )
    db.add(entry)
    await db.flush()

    position = await _resolve_position(db, entry)

    sent, delivery_error = await send_waitlist_confirmation_email(
        to_email=entry.email,
        position=position,
    )
    if sent:
        entry.delivery_status = "sent"
        entry.lead_magnet_delivered = True
        entry.lead_magnet_sent_at = datetime.now(timezone.utc)
    else:
        entry.delivery_status = "pending_manual"
        entry.delivery_error = delivery_error

    await db.commit()
    await db.refresh(entry)

    return WaitlistJoinResponse(
        id=str(entry.id),
        email=entry.email,
        position=position,
        is_new=True,
        delivery_status=entry.delivery_status,
        lead_magnet_delivered=entry.lead_magnet_delivered,
        created_at=entry.created_at,
    )


@router.get(
    "/count",
    response_model=WaitlistCountResponse,
    summary="Get public waitlist count",
)
async def get_waitlist_count(db: AsyncSession = Depends(get_db)) -> WaitlistCountResponse:
    total_result = await db.execute(select(func.count(WaitlistEntry.id)))
    return WaitlistCountResponse(total=int(total_result.scalar() or 0))
