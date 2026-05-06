import random
import string
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.models.project import Project
from app.models.referral import Referral
from app.models.user import User
from app.services.credit_service import log_credit_change

REFERRAL_REWARD_CREDITS = 10
REFERRAL_CODE_LENGTH = 8


def normalize_referral_code(code: str) -> str:
    return (code or "").strip().upper()


def _random_code(length: int = REFERRAL_CODE_LENGTH) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choice(alphabet) for _ in range(length))


async def generate_unique_referral_code(db: AsyncSession) -> str:
    for _ in range(12):
        candidate = _random_code()
        result = await db.execute(select(User.id).where(User.referral_code == candidate))
        if result.scalar_one_or_none() is None:
            return candidate
    raise AppException(status_code=500, detail="Failed to generate referral code")


async def ensure_user_referral_code(db: AsyncSession, user: User) -> str:
    if user.referral_code:
        return user.referral_code

    user.referral_code = await generate_unique_referral_code(db)
    db.add(user)
    await db.flush()
    return user.referral_code


async def _is_referred_user_verified(db: AsyncSession, referred_user_id) -> bool:
    result = await db.execute(
        select(Project.id).where(Project.user_id == referred_user_id).limit(1)
    )
    return result.scalar_one_or_none() is not None


async def verify_pending_referrals(
    db: AsyncSession,
    *,
    referrer_user_id=None,
    referred_user_id=None,
) -> int:
    query = select(Referral).where(Referral.status == "pending")
    if referrer_user_id is not None:
        query = query.where(Referral.referrer_user_id == referrer_user_id)
    if referred_user_id is not None:
        query = query.where(Referral.referred_user_id == referred_user_id)

    result = await db.execute(query)
    referrals = result.scalars().all()

    verified_count = 0
    now = datetime.now(timezone.utc)

    for referral in referrals:
        is_verified = await _is_referred_user_verified(db, referral.referred_user_id)
        if not is_verified:
            continue

        referrer_result = await db.execute(
            select(User).where(User.id == referral.referrer_user_id)
        )
        referrer = referrer_result.scalar_one_or_none()
        if not referrer:
            continue

        await log_credit_change(
            db,
            referrer,
            referral.reward_credits,
            f"Referral bonus for user {referral.referred_user_id}",
        )

        referral.status = "verified"
        referral.verified_at = now
        referral.credited_at = now
        db.add(referral)
        verified_count += 1

    return verified_count


async def build_referral_summary(db: AsyncSession, referrer_user_id) -> tuple[int, int, int]:
    pending_result = await db.execute(
        select(func.count(Referral.id)).where(
            Referral.referrer_user_id == referrer_user_id,
            Referral.status == "pending",
        )
    )
    verified_result = await db.execute(
        select(func.count(Referral.id)).where(
            Referral.referrer_user_id == referrer_user_id,
            Referral.status == "verified",
        )
    )
    credits_result = await db.execute(
        select(func.coalesce(func.sum(Referral.reward_credits), 0)).where(
            Referral.referrer_user_id == referrer_user_id,
            Referral.status == "verified",
        )
    )

    return (
        int(pending_result.scalar() or 0),
        int(verified_result.scalar() or 0),
        int(credits_result.scalar() or 0),
    )


async def get_applied_referral(db: AsyncSession, referred_user_id) -> Optional[Referral]:
    result = await db.execute(
        select(Referral).where(Referral.referred_user_id == referred_user_id)
    )
    return result.scalar_one_or_none()
