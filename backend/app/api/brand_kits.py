from app.core.exceptions import NotFoundError, ValidationError
from app.schemas.error import ERROR_RESPONSES
from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.brand_kit import BrandKit
from app.schemas.brand_kit import (
    BrandKitCreate,
    BrandKitUpdate,
    BrandKitResponse,
    ColorExtractionResponse,
    BrandKitGenerateRequest,
    BrandKitExtractUrlRequest,
)
from app.services.brand_kit_service import extract_colors_from_image

router = APIRouter(tags=["Brand Kits"])

MAX_BRAND_KITS_FREE = 3


@router.post(
    "/generate",
    response_model=BrandKitCreate,
    status_code=status.HTTP_200_OK,
    summary="Generate Brand Kit with AI",
    description="Generates a Brand Kit (Colors, Typography, and Logo) from a descriptive text prompt.",
    responses=ERROR_RESPONSES,
)
async def generate_brand_kit(
    request: BrandKitGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.brand_kit_generator import (
        generate_brand_identity_json,
        generate_logo_from_prompt,
    )
    from app.services.storage_service import upload_image_tracked
    from app.services.bg_removal_service import remove_background
    from app.core.exceptions import InternalServerError
    import logging

    try:
        identity_json = await generate_brand_identity_json(
            prompt=request.prompt,
            brand_personality=request.brand_personality,
            target_audience=request.target_audience,
            design_style=request.design_style,
            emotional_tone=request.emotional_tone,
        )
        logo_prompt = identity_json.get(
            "logo_prompt", f"Minimalist flat vector logo for {request.prompt}"
        )

        image_bytes = await generate_logo_from_prompt(logo_prompt)
        nobg_bytes = await remove_background(image_bytes)

        result_url = await upload_image_tracked(
            nobg_bytes,
            user_id=current_user.id,
            db=db,
            content_type="image/png",
            prefix="brand-logo-ai",
        )

        colors_data = identity_json.get("colors", [])
        typography_data = identity_json.get("typography", {})
        brand_strategy_data = identity_json.get("brand_strategy", {})

        return BrandKitCreate(
            name=identity_json.get("name", "AI Gen Brand Kit"),
            logo_url=result_url,
            logos=[result_url],
            colors=colors_data,
            typography=typography_data,
            brand_strategy=brand_strategy_data,
        )
    except Exception as e:
        logging.exception(f"Exception generating brand kit: {e}")
        raise InternalServerError(detail=str(e))


@router.post(
    "/extract-from-url",
    response_model=BrandKitCreate,
    status_code=status.HTTP_200_OK,
    summary="Extract Brand Kit from URL",
    description="Extracts logo, name, and dominant colors from a provided website URL.",
    responses=ERROR_RESPONSES,
)
async def extract_brand_from_url(
    request: BrandKitExtractUrlRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.scraper_service import scrape_brand_info
    from app.services.brand_kit_service import extract_colors_from_image
    from app.services.storage_service import upload_image_tracked
    from app.core.exceptions import InternalServerError
    import httpx
    import logging

    try:
        scraped = await scrape_brand_info(request.url)
        brand_name = scraped.get("name", "Extracted Brand")
        logo_url = scraped.get("logo_url")

        colors = []
        result_url = None

        if logo_url:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(logo_url)
                    if resp.status_code == 200:
                        image_bytes = resp.content
                        colors = await extract_colors_from_image(image_bytes)

                        result_url = await upload_image_tracked(
                            image_bytes,
                            user_id=current_user.id,
                            db=db,
                            content_type="image/png",
                            prefix="brand-logo-extracted",
                        )
            except Exception as e:
                logging.warning(
                    f"Could not download or process extracted logo {logo_url}: {e}"
                )
                result_url = logo_url

        if not colors:
            colors = [
                {"hex": "#000000", "name": "Hitam Dasar", "role": "text"},
                {"hex": "#FFFFFF", "name": "Putih Dasar", "role": "background"},
            ]

        return BrandKitCreate(
            name=brand_name[:50],  # Ensure name isn't too long
            logo_url=result_url,
            logos=[result_url] if result_url else [],
            colors=colors,
            typography={"primaryFont": "Inter", "secondaryFont": "Roboto"},
        )

    except Exception as e:
        logging.exception(f"Exception extracting brand kit from URL: {e}")
        raise InternalServerError(detail=str(e))


@router.post(
    "/extract",
    response_model=ColorExtractionResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract Brand Colors",
    description="Extracts exactly 5 dominant brand colors from an uploaded logo or image using AI.",
    responses=ERROR_RESPONSES,
)
async def extract_brand_colors(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Extracts exactly 5 dominant brand colors from an uploaded logo or image.
    Uses Gemini Vision. Does not save to the database.
    """
    if file.size and file.size > 5 * 1024 * 1024:
        raise ValidationError(detail="File too large. Maximum size is 5MB.")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise ValidationError(detail="File must be an image.")

    image_bytes = await file.read()
    colors = await extract_colors_from_image(
        image_bytes, mime_type=file.content_type or "image/png"
    )

    return ColorExtractionResponse(colors=colors)


@router.post(
    "",
    response_model=BrandKitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Brand Kit",
    description="Saves a new Brand Kit for the current user.",
    responses=ERROR_RESPONSES,
)
async def create_brand_kit(
    brand_kit_in: BrandKitCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Saves a new Brand Kit for the current user. Enforces limits on free tier.
    """
    try:
        # Check limit for free tier
        result = await db.execute(
            select(BrandKit).where(BrandKit.user_id == current_user.id)
        )
        existing_kits = result.scalars().all()

        if len(existing_kits) >= MAX_BRAND_KITS_FREE:
            raise ValidationError(
                detail=f"You can only save up to {MAX_BRAND_KITS_FREE} "
                "Brand Kits on the free tier.",
            )
        if existing_kits:
            await db.execute(
                update(BrandKit)
                .where(BrandKit.user_id == current_user.id)
                .values(is_active=False)
            )
        colors_json = [c.model_dump() for c in brand_kit_in.colors]
        typography_json = (
            brand_kit_in.typography.model_dump() if brand_kit_in.typography else None
        )
        brand_strategy_json = brand_kit_in.brand_strategy if brand_kit_in.brand_strategy else None

        new_kit = BrandKit(
            user_id=current_user.id,
            name=brand_kit_in.name,
            logo_url=brand_kit_in.logo_url,
            logos=brand_kit_in.logos,
            colors=colors_json,
            typography=typography_json,
            brand_strategy=brand_strategy_json,
            is_active=True,
        )

        db.add(new_kit)
        await db.commit()
        await db.refresh(new_kit)

        return new_kit
    except Exception as e:
        import logging

        logging.exception(f"Exception creating brand kit: {e}")
        raise


@router.get(
    "",
    response_model=List[BrandKitResponse],
    status_code=status.HTTP_200_OK,
    summary="List Brand Kits",
    description="Get all Brand Kits belonging to the current user.",
    responses=ERROR_RESPONSES,
)
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


@router.get(
    "/active",
    response_model=Optional[BrandKitResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Active Brand Kit",
    description="Get the currently active Brand Kit for the user.",
    responses=ERROR_RESPONSES,
)
async def get_active_brand_kit(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the currently active Brand Kit. Returns null if none active.
    """
    result = await db.execute(
        select(BrandKit)
        .where(BrandKit.user_id == current_user.id, BrandKit.is_active.is_(True))
        .limit(1)
    )
    active_kit = result.scalar_one_or_none()

    return active_kit


@router.put(
    "/{kit_id}",
    response_model=BrandKitResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Brand Kit",
    description="Update a specific Brand Kit and optionally set it as active.",
    responses=ERROR_RESPONSES,
)
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
        select(BrandKit).where(
            BrandKit.id == kit_id, BrandKit.user_id == current_user.id
        )
    )
    kit = result.scalar_one_or_none()

    if not kit:
        raise NotFoundError(detail="Brand Kit not found.")

    update_data = kit_update.model_dump(exclude_unset=True)

    if "is_active" in update_data and update_data["is_active"] is True:
        await db.execute(
            update(BrandKit)
            .where(BrandKit.user_id == current_user.id, BrandKit.id != kit_id)
            .values(is_active=False)
        )

    if "colors" in update_data and kit_update.colors is not None:
        update_data["colors"] = [c.model_dump() for c in kit_update.colors]

    if "typography" in update_data and kit_update.typography is not None:
        update_data["typography"] = kit_update.typography.model_dump()

    for key, value in update_data.items():
        setattr(kit, key, value)

    await db.commit()
    await db.refresh(kit)

    return kit


@router.delete(
    "/{kit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Brand Kit",
    description="Delete a Brand Kit from the user's account.",
    responses=ERROR_RESPONSES,
)
async def delete_brand_kit(
    kit_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete a Brand Kit and decrement associated storage usage.
    """
    result = await db.execute(
        select(BrandKit).where(
            BrandKit.id == kit_id, BrandKit.user_id == current_user.id
        )
    )
    kit = result.scalar_one_or_none()

    if not kit:
        raise NotFoundError(detail="Brand Kit not found.")

    # Decrement storage usage for all logos in this brand kit
    from app.services.storage_quota_service import estimate_file_size, decrement_usage

    if getattr(kit, "logos", None):
        for logo_url in kit.logos:
            size = await estimate_file_size(logo_url)
            if size > 0:
                await decrement_usage(current_user.id, size, db)

    await db.delete(kit)
    await db.commit()
