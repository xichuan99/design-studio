from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.testimonial import Testimonial
from app.models.user import User
from app.schemas.testimonial import (
    PublicTestimonialItem,
    TestimonialCreateRequest,
    TestimonialListResponse,
    TestimonialResponseItem,
    TestimonialSubmitResponse,
)

router = APIRouter(tags=["Testimonials"])


def _apply_testimonial_payload(item: Testimonial, payload: TestimonialCreateRequest) -> None:
    item.name = payload.name
    item.role = payload.role
    item.quote = payload.quote


@router.get(
    "",
    response_model=TestimonialListResponse,
    summary="Get approved testimonials",
)
async def get_testimonials(
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
) -> TestimonialListResponse:
    result = await db.execute(
        select(Testimonial)
        .where(Testimonial.status == "approved")
        .order_by(desc(Testimonial.reviewed_at), desc(Testimonial.created_at))
        .limit(limit)
    )
    items = [PublicTestimonialItem.model_validate(item) for item in result.scalars().all()]
    return TestimonialListResponse(items=items)


@router.post(
    "",
    response_model=TestimonialSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit testimonial for moderation",
)
async def submit_testimonial(
    payload: TestimonialCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TestimonialSubmitResponse:
    existing_result = await db.execute(
        select(Testimonial)
        .where(Testimonial.user_id == current_user.id)
        .order_by(desc(Testimonial.created_at))
        .limit(1)
    )
    existing = existing_result.scalar_one_or_none()

    is_pending_update = existing is not None and existing.status == "pending"

    if is_pending_update:
        item = existing
        _apply_testimonial_payload(item, payload)
        item.reviewer_notes = None
    else:
        item = Testimonial(
            user_id=current_user.id,
            status="pending",
            name=payload.name,
            role=payload.role,
            quote=payload.quote,
        )
        db.add(item)

    if existing is not None and existing.status in {"approved", "rejected"}:
        item.status = "pending"
        item.reviewed_at = None
        item.reviewer_notes = None

    await db.commit()
    await db.refresh(item)

    return TestimonialSubmitResponse(
        item=TestimonialResponseItem.model_validate(item),
        is_update=is_pending_update,
        message="Testimoni berhasil dikirim dan menunggu review."
    )

