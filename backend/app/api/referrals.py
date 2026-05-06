from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import AppException
from app.models.referral import Referral
from app.models.user import User
from app.schemas.referral import (
    AppliedReferralStatus,
    ReferralApplyRequest,
    ReferralApplyResponse,
    ReferralStatusResponse,
    ReferralSummary,
)
from app.services.referral_service import (
    REFERRAL_REWARD_CREDITS,
    build_referral_summary,
    ensure_user_referral_code,
    get_applied_referral,
    normalize_referral_code,
    verify_pending_referrals,
)

router = APIRouter(tags=["Referrals"])


@router.post(
    "/apply",
    response_model=ReferralApplyResponse,
    status_code=status.HTTP_200_OK,
    summary="Apply referral code",
)
async def apply_referral_code(
    payload: ReferralApplyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ensure_user_referral_code(db, current_user)
    code = normalize_referral_code(payload.code)

    referrer_result = await db.execute(
        select(User).where(User.referral_code == code)
    )
    referrer = referrer_result.scalar_one_or_none()

    if not referrer:
        raise AppException(status_code=404, detail="Referral code not found")

    if referrer.id == current_user.id:
        raise AppException(status_code=400, detail="You cannot apply your own referral code")

    existing = await get_applied_referral(db, current_user.id)
    if existing:
        if existing.referrer_user_id != referrer.id:
            raise AppException(status_code=409, detail="Referral code already applied")

        await verify_pending_referrals(db, referred_user_id=current_user.id)
        await db.commit()
        await db.refresh(existing)

        return ReferralApplyResponse(
            status=existing.status,
            message="Referral code already applied",
            referral=AppliedReferralStatus(
                referrer_name=referrer.name,
                status=existing.status,
                reward_credits=existing.reward_credits,
                applied_at=existing.created_at,
                verified_at=existing.verified_at,
                credited_at=existing.credited_at,
            ),
        )

    referral = Referral(
        referrer_user_id=referrer.id,
        referred_user_id=current_user.id,
        status="pending",
        reward_credits=REFERRAL_REWARD_CREDITS,
    )
    db.add(referral)
    await db.flush()

    await verify_pending_referrals(db, referred_user_id=current_user.id)
    await db.commit()
    await db.refresh(referral)

    return ReferralApplyResponse(
        status=referral.status,
        message="Referral code applied successfully",
        referral=AppliedReferralStatus(
            referrer_name=referrer.name,
            status=referral.status,
            reward_credits=referral.reward_credits,
            applied_at=referral.created_at,
            verified_at=referral.verified_at,
            credited_at=referral.credited_at,
        ),
    )


@router.get(
    "/status",
    response_model=ReferralStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get my referral status",
)
async def get_referral_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    referral_code = await ensure_user_referral_code(db, current_user)

    await verify_pending_referrals(db, referrer_user_id=current_user.id)
    await verify_pending_referrals(db, referred_user_id=current_user.id)

    pending_count, verified_count, credits_earned_total = await build_referral_summary(
        db,
        current_user.id,
    )

    applied_referral = await get_applied_referral(db, current_user.id)
    applied_payload = None
    if applied_referral:
        referrer_result = await db.execute(
            select(User).where(User.id == applied_referral.referrer_user_id)
        )
        referrer = referrer_result.scalar_one_or_none()
        applied_payload = AppliedReferralStatus(
            referrer_name=referrer.name if referrer else "Unknown",
            status=applied_referral.status,
            reward_credits=applied_referral.reward_credits,
            applied_at=applied_referral.created_at,
            verified_at=applied_referral.verified_at,
            credited_at=applied_referral.credited_at,
        )

    await db.commit()

    return ReferralStatusResponse(
        referral_code=referral_code,
        summary=ReferralSummary(
            pending_count=pending_count,
            verified_count=verified_count,
            credits_earned_total=credits_earned_total,
        ),
        applied_referral=applied_payload,
    )
