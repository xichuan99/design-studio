"""Multi-format image variant generation endpoint."""

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.rate_limit import rate_limit_dependency
from app.models.user import User
from app.core.exceptions import ValidationError, InternalServerError
from app.schemas.error import ERROR_RESPONSES
import httpx
import io
import logging
from PIL import Image

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Images - Multi Format"])

# Format presets: (width, height) for common marketplace/social platforms
MULTI_FORMAT_PRESETS: dict[str, dict[str, int]] = {
    "shopee": {"width": 1200, "height": 1200},
    "tokopedia": {"width": 1200, "height": 1200},
    "ig_feed": {"width": 1080, "height": 1350},
    "ig_story": {"width": 1080, "height": 1920},
    "wa_story": {"width": 1080, "height": 1920},
}


def _crop_center(pil_img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Center-crop a PIL image to target dimensions."""
    src_w, src_h = pil_img.size
    src_ratio = src_w / src_h
    target_ratio = target_w / target_h

    if src_ratio > target_ratio:
        # Source wider — crop sides
        new_w = int(src_h * target_ratio)
        left = (src_w - new_w) // 2
        return pil_img.crop((left, 0, left + new_w, src_h)).resize((target_w, target_h), Image.LANCZOS)
    else:
        # Source taller — crop top/bottom
        new_h = int(src_w / target_ratio)
        top = (src_h - new_h) // 2
        return pil_img.crop((0, top, src_w, top + new_h)).resize((target_w, target_h), Image.LANCZOS)


@router.post(
    "/multi-format",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Generate Multi-Format Variants",
    description="Takes an image URL, generates center-cropped variants for marketplace and social platforms.",
    responses=ERROR_RESPONSES,
)
async def generate_multi_format_variants(
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_dependency),
) -> dict:
    """Download image, generate variants for Shopee/Tokopedia/IG/WA, upload them."""
    from app.services.storage_service import upload_image_tracked

    image_url = request.get("image_url")
    if not image_url:
        raise ValidationError(detail="image_url is required")

    # Download source image
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
            source_bytes = resp.content
    except Exception as e:
        raise InternalServerError(detail=f"Failed to download source image: {str(e)}")

    if len(source_bytes) > 20 * 1024 * 1024:
        raise ValidationError(detail="Source image too large (>20MB)")

    try:
        source_img = Image.open(io.BytesIO(source_bytes))
    except Exception:
        raise ValidationError(detail="Invalid image format")

    variants: dict[str, str] = {}
    errors: list[str] = []

    for fmt_name, dims in MULTI_FORMAT_PRESETS.items():
        try:
            variant = _crop_center(source_img.copy(), dims["width"], dims["height"])
            buf = io.BytesIO()
            variant.save(buf, format="PNG", optimize=True)
            variant_bytes = buf.getvalue()

            url = await upload_image_tracked(
                variant_bytes,
                user_id=current_user.id,
                db=db,
                content_type="image/png",
                prefix=f"variant/{fmt_name}",
            )
            variants[fmt_name] = url
        except Exception as e:
            logger.warning(f"Failed to generate variant {fmt_name}: {e}")
            errors.append(fmt_name)

    return JSONResponse(
        content={
            "image_url": image_url,
            "variants": variants,
            "errors": errors if errors else None,
        },
    )
