import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import InsufficientCreditsError, NotFoundError, ValidationError
from app.core.model_tiers import is_model_accessible
from app.models.comparison_session import ComparisonSession
from app.models.user import User
from app.schemas.comparison import ComparisonSessionCreateRequest, ComparisonSessionResponse
from app.services.credit_service import log_credit_change
from app.workers.comparison_sessions import (
    build_initial_variants,
    dispatch_comparison_session,
    generate_share_slug,
)

router = APIRouter(tags=["Compare Models"])


def _serialize_session(record: ComparisonSession) -> ComparisonSessionResponse:
    return ComparisonSessionResponse(
        id=str(record.id),
        status=record.status,
        share_slug=record.share_slug,
        raw_text=record.raw_text,
        aspect_ratio=record.aspect_ratio,
        integrated_text=record.integrated_text,
        requested_tiers=list(record.requested_tiers or []),
        variants=list(record.variants_json or []),
        charged_credits=record.charged_credits,
        error_message=record.error_message,
        created_at=record.created_at,
        completed_at=record.completed_at,
    )


@router.post(
    "/sessions",
    response_model=ComparisonSessionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Create persisted comparison session",
)
async def create_comparison_session(
    payload: ComparisonSessionCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ComparisonSessionResponse:
    required_plan_by_tier = {
        "basic": "starter",
        "pro": "pro",
        "ultra": "business",
    }

    for tier in payload.tiers:
        required_plan = required_plan_by_tier.get(tier, "starter")
        if not is_model_accessible(current_user.plan_tier, required_plan):
            raise ValidationError(
                detail=f"Tier {tier} membutuhkan paket minimal {required_plan}."
            )

    variants = build_initial_variants(payload.tiers)
    total_cost = sum(int(item["estimated_cost"]) for item in variants)
    if current_user.credits_remaining < total_cost:
        raise InsufficientCreditsError(
            detail=f"Kredit tidak cukup untuk comparison. Butuh {total_cost} kredit."
        )

    await log_credit_change(db, current_user, -total_cost, "Compare models session")

    record = ComparisonSession(
        user_id=current_user.id,
        raw_text=payload.raw_text,
        aspect_ratio=payload.aspect_ratio,
        integrated_text=payload.integrated_text,
        requested_tiers=payload.tiers,
        variants_json=variants,
        charged_credits=total_cost,
        share_slug=generate_share_slug(),
        status="queued",
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    dispatch_comparison_session(str(record.id))
    return _serialize_session(record)


@router.get(
    "/sessions/{session_id}",
    response_model=ComparisonSessionResponse,
    summary="Get comparison session status",
)
async def get_comparison_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ComparisonSessionResponse:
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError as exc:
        raise NotFoundError(detail="Comparison session not found") from exc

    record = await db.get(ComparisonSession, session_uuid)
    if not record or record.user_id != current_user.id:
        raise NotFoundError(detail="Comparison session not found")
    return _serialize_session(record)


@router.get(
    "/share/{share_slug}",
    response_model=ComparisonSessionResponse,
    summary="Get shared comparison session",
)
async def get_shared_comparison_session(
    share_slug: str,
    db: AsyncSession = Depends(get_db),
) -> ComparisonSessionResponse:
    result = await db.execute(
        select(ComparisonSession).where(ComparisonSession.share_slug == share_slug)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise NotFoundError(detail="Shared comparison session not found")
    return _serialize_session(record)
