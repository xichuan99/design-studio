from fastapi import (
    APIRouter, Depends, HTTPException, UploadFile, File, status
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.brand_kit import BrandKit
from app.schemas.brand_kit import (
    BrandKitCreate,
    BrandKitUpdate,
    BrandKitResponse,
    ColorExtractionResponse,
)
from app.services.brand_kit_service import extract_colors_from_image

router = APIRouter()

MAX_BRAND_KITS_FREE = 3


@router.post("/extract", response_model=ColorExtractionResponse)
async def extract_brand_colors(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Extracts exactly 5 dominant brand colors from an uploaded logo or image.
    Uses Gemini Vision. Does not save to the database.
    """
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 5MB."
        )

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    image_bytes = await file.read()
    colors = await extract_colors_from_image(
        image_bytes,
        mime_type=file.content_type or "image/png"
    )

    return ColorExtractionResponse(colors=colors)


@router.post(
    "",
    response_model=BrandKitResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_brand_kit(
    brand_kit_in: BrandKitCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Saves a new Brand Kit for the current user.
    """
    # Check limit for free tier
    result = await db.execute(
        select(BrandKit).where(BrandKit.user_id == current_user.id)
    )
    existing_kits = result.scalars().all()

    if len(existing_kits) >= MAX_BRAND_KITS_FREE:
        raise HTTPException(
            status_code=400,
            detail=f"You can only save up to {MAX_BRAND_KITS_FREE} "
                   "Brand Kits on the free tier."
        )

    if existing_kits:
        await db.execute(
            update(BrandKit)
            .where(BrandKit.user_id == current_user.id)
            .values(is_active=False)
        )

    colors_json = [c.model_dump() for c in brand_kit_in.colors]

    new_kit = BrandKit(
        user_id=current_user.id,
        name=brand_kit_in.name,
        logo_url=brand_kit_in.logo_url,
        colors=colors_json,
        is_active=True
    )

    db.add(new_kit)
    await db.commit()
    await db.refresh(new_kit)

    return new_kit


@router.get("", response_model=List[BrandKitResponse])
async def list_brand_kits(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all Brand Kits belonging to the current user.
    """
    result = await db.execute(
        select(BrandKit)
        .where(BrandKit.user_id == current_user.id)
        .order_by(BrandKit.created_at.desc())
    )
    kits = result.scalars().all()
    return kits


@router.get("/active", response_model=BrandKitResponse)
async def get_active_brand_kit(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the currently active Brand Kit. Returns 404 if none active.
    """
    result = await db.execute(
        select(BrandKit)
        .where(BrandKit.user_id == current_user.id, BrandKit.is_active.is_(True))
        .limit(1)
    )
    active_kit = result.scalar_one_or_none()

    if not active_kit:
        raise HTTPException(status_code=404, detail="No active kit found.")

    return active_kit


@router.put("/{kit_id}", response_model=BrandKitResponse)
async def update_brand_kit(
    kit_id: UUID,
    kit_update: BrandKitUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a specific Brand Kit. Also handles changing the active kit.
    """
    result = await db.execute(
        select(BrandKit)
        .where(BrandKit.id == kit_id, BrandKit.user_id == current_user.id)
    )
    kit = result.scalar_one_or_none()

    if not kit:
        raise HTTPException(status_code=404, detail="Brand Kit not found.")

    update_data = kit_update.model_dump(exclude_unset=True)

    if "is_active" in update_data and update_data["is_active"] is True:
        await db.execute(
            update(BrandKit)
            .where(BrandKit.user_id == current_user.id, BrandKit.id != kit_id)
            .values(is_active=False)
        )

    if "colors" in update_data:
        update_data["colors"] = [c.model_dump() for c in kit_update.colors]

    for key, value in update_data.items():
        setattr(kit, key, value)

    await db.commit()
    await db.refresh(kit)

    return kit


@router.delete("/{kit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand_kit(
    kit_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a Brand Kit.
    """
    result = await db.execute(
        select(BrandKit)
        .where(BrandKit.id == kit_id, BrandKit.user_id == current_user.id)
    )
    kit = result.scalar_one_or_none()

    if not kit:
        raise HTTPException(status_code=404, detail="Brand Kit not found.")

    await db.delete(kit)
    await db.commit()
