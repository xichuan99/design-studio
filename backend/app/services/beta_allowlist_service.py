"""Service for beta allowlist management and validation."""

from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.beta_allowlist import BetaAllowlist
from app.core.exceptions import ValidationError


async def check_email_allowed(email: str, db: AsyncSession) -> tuple[bool, BetaAllowlist | None]:
    """
    Check if an email is on the allowlist.
    Returns: (is_allowed, allowlist_entry)
    """
    normalized_email = email.strip().lower()
    result = await db.execute(
        select(BetaAllowlist).where(
            BetaAllowlist.entry_type == "email",
            func.lower(BetaAllowlist.entry_value) == normalized_email,
            BetaAllowlist.status == "active",
        )
    )
    entry = result.scalar_one_or_none()
    return (entry is not None, entry)


async def check_invite_code_allowed(code: str, db: AsyncSession) -> tuple[bool, BetaAllowlist | None]:
    """
    Check if an invite code is on the allowlist.
    Returns: (is_allowed, allowlist_entry)
    """
    normalized_code = code.strip().upper()
    result = await db.execute(
        select(BetaAllowlist).where(
            BetaAllowlist.entry_type == "code",
            func.upper(BetaAllowlist.entry_value) == normalized_code,
            BetaAllowlist.status == "active",
        )
    )
    entry = result.scalar_one_or_none()
    return (entry is not None, entry)


async def mark_allowlist_entry_used(
    entry_id, db: AsyncSession
) -> None:
    """
    Increment used_count and update last_used_at timestamp.
    """
    result = await db.execute(
        select(BetaAllowlist).where(BetaAllowlist.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry:
        entry.used_count += 1
        entry.last_used_at = datetime.now(timezone.utc)
        await db.flush()


async def get_allowlist_entry_by_id(
    entry_id, db: AsyncSession
) -> BetaAllowlist | None:
    """Fetch a single allowlist entry by ID."""
    result = await db.execute(
        select(BetaAllowlist).where(BetaAllowlist.id == entry_id)
    )
    return result.scalar_one_or_none()


async def list_allowlist_entries(
    db: AsyncSession,
    limit: int = 50,
    offset: int = 0,
    entry_type: str | None = None,
    status: str | None = None,
) -> tuple[list[BetaAllowlist], int]:
    """
    Paginated list of allowlist entries with optional filters.
    Returns: (items, total_count)
    """
    query = select(BetaAllowlist)

    if entry_type:
        query = query.where(BetaAllowlist.entry_type == entry_type)

    if status:
        query = query.where(BetaAllowlist.status == status)

    # Get total count
    count_result = await db.execute(
        select(func.count(BetaAllowlist.id)).select_from(query.subquery())
    )
    total_count = int(count_result.scalar() or 0)

    # Get paginated items
    result = await db.execute(
        query.order_by(BetaAllowlist.created_at.desc()).limit(limit).offset(offset)
    )
    items = result.scalars().all()

    return items, total_count


async def create_allowlist_entry(
    entry_type: str,
    entry_value: str,
    initial_credits_grant: int = 0,
    beta_cohort: str | None = None,
    created_by: str | None = None,
    notes: str | None = None,
    db: AsyncSession = None,
) -> BetaAllowlist:
    """Create a new allowlist entry."""
    # Normalize the entry value
    if entry_type == "email":
        normalized_value = entry_value.strip().lower()
    else:  # code
        normalized_value = entry_value.strip().upper()

    # Check for duplicates
    result = await db.execute(
        select(BetaAllowlist).where(
            BetaAllowlist.entry_type == entry_type,
            func.lower(BetaAllowlist.entry_value) if entry_type == "email" else func.upper(BetaAllowlist.entry_value) == normalized_value,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise ValidationError(detail=f"{entry_type.capitalize()} {entry_value} is already on the allowlist")

    entry = BetaAllowlist(
        entry_type=entry_type,
        entry_value=normalized_value,
        initial_credits_grant=initial_credits_grant,
        beta_cohort=beta_cohort,
        created_by=created_by,
        notes=notes,
        status="active",
    )
    db.add(entry)
    await db.flush()
    return entry


async def update_allowlist_entry(
    entry_id,
    status: str | None = None,
    initial_credits_grant: int | None = None,
    notes: str | None = None,
    db: AsyncSession = None,
) -> BetaAllowlist | None:
    """Update an allowlist entry."""
    entry = await get_allowlist_entry_by_id(entry_id, db)
    if not entry:
        return None

    if status is not None:
        entry.status = status
    if initial_credits_grant is not None:
        entry.initial_credits_grant = initial_credits_grant
    if notes is not None:
        entry.notes = notes

    await db.flush()
    return entry
