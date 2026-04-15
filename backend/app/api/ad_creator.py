import base64
import logging
import asyncio
import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.ad_creator import AdCreatorRequest, AdCreatorResponse, AdConcept, BatchResizeRequest, BatchResizeResponse
from app.api.deps import get_db
from app.api.rate_limit import rate_limit_dependency
from app.models.user import User

from app.services import bg_removal_service, image_service, outpaint_service
from app.services.storage_service import upload_image
from app.services.file_validation import validate_uploaded_image
from app.services.ad_prompt_builder import build_ad_concepts
from app.core.exceptions import (
    InsufficientCreditsError,
    InternalServerError,
    ValidationError,
    LLMGenerationError,
    ImageGenerationError
)
from app.core.credit_costs import COST_GENERATIVE_EXPAND

router = APIRouter()
logger = logging.getLogger(__name__)

# Kita set biaya kredit sementara, misal 5 kredit untuk 3 variasi
COST_SMART_AD = 5

@router.post(
    "/generate",
    response_model=AdCreatorResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Smart Ad Concepts",
    description="Takes a product image, removes background, generates 3 ad concepts via LLM, and composites them via Text-to-Image."
)
async def generate_smart_ad(
    request: AdCreatorRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_dependency),
):
    if current_user.credits_remaining < COST_SMART_AD:
        raise InsufficientCreditsError(detail="Insufficient credits")

    from app.services.credit_service import log_credit_change
    await log_credit_change(db, current_user, -COST_SMART_AD, "Smart Ad Generation")

    # Commit required for sync db, or execute if using async. Let's assume standard synchronous commit as per current design.
    # Wait, rate_limit_dependency returns a User, and we use AsyncSession or Session?
    # In ai_tools/background.py: db: AsyncSession = Depends(get_db)
    # So we probably need to handle async commit here!

    try:
        # Decode image
        base64_data = request.image_base64
        mime_type = None
        if request.image_base64.startswith("data:") and ";base64," in request.image_base64:
            mime_type = request.image_base64.split(";base64,", 1)[0].replace("data:", "", 1)
        if "," in base64_data:
            base64_data = base64_data.split(",")[1]

        image_bytes = base64.b64decode(base64_data)
        detected_mime_type = await validate_uploaded_image(image_bytes, max_size_mb=10)
        if mime_type not in {"image/jpeg", "image/png", "image/webp"}:
            mime_type = detected_mime_type
        else:
            mime_type = detected_mime_type

        # 1. Remove background directly
        logger.info("Removing background for Ad Creator...")
        no_bg_bytes = await bg_removal_service.remove_background(image_bytes)

        # 2. Upload transparent foreground
        fg_id = str(uuid.uuid4())[:8]
        foreground_url = await upload_image(
            no_bg_bytes,
            content_type="image/png",
            prefix=f"ad_fg_{current_user.id}_{fg_id}"
        )
        logger.info(f"Foreground uploaded to {foreground_url}")

        # 3. Build Ad Concepts via Gemini
        logger.info("Building concepts via Gemini...")
        try:
            llm_response = await build_ad_concepts(
                image_bytes=image_bytes,
                mime_type=mime_type,
                brief=request.brief,
                brand_kit_id=request.brand_kit_id,
                db=db
            )
        except Exception as e:
            logger.error(f"LLM Concept building failed: {str(e)}")
            raise LLMGenerationError(
                detail="Gagal membuat konsep iklan. Coba ubah brief agar lebih ringkas dan jelas."
            )

        concepts = llm_response.get("concepts", [])
        if not concepts:
            raise LLMGenerationError(detail="LLM tidak mengembalikan konsep iklan.")

        # 4. Generate 3 backgrounds concurrently using fal.ai
        async def generate_bg_for_concept(c: dict) -> AdConcept:
            visual_prompt = c.get("visual_prompt", "")
            try:
                # Generate clean background without text integration
                bg_result = await image_service.generate_background(
                    visual_prompt=visual_prompt,
                    style=c.get("id", "bold"), # map id to style if matching, else default
                    aspect_ratio="1:1"
                )
                return AdConcept(
                    id=c.get("id", str(uuid.uuid4())[:6]),
                    concept_name=c.get("concept_name", "Concept"),
                    image_url=bg_result["image_url"],
                    headline=c.get("headline", ""),
                    tagline=c.get("tagline", ""),
                    call_to_action=c.get("call_to_action", "")
                )
            except Exception as e:
                logger.error(f"Background generation failed for concept {c.get('concept_name')}: {str(e)}")
                raise ImageGenerationError(
                    detail="Gagal membuat visual background. Silakan coba lagi dalam beberapa saat."
                )

        logger.info(f"Generating backgrounds for {len(concepts)} concepts...")
        tasks = [generate_bg_for_concept(c) for c in concepts]
        generated_ad_concepts = await asyncio.gather(*tasks)

        # Confirm charge
        await db.commit()

        # Build response
        return AdCreatorResponse(
            foreground_url=foreground_url,
            concepts=list(generated_ad_concepts)
        )

    except (LLMGenerationError, ImageGenerationError) as e:
        # Re-raise known AI errors so they retain their specialized error_code
        logger.warning(f"AI Generation specialized error: {e.error_code}")
        try:
            await log_credit_change(
                db, current_user, COST_SMART_AD, f"Refund: {e.error_code}"
            )
            await db.commit()
        except Exception as refund_err:
            logger.error(f"Failed to refund user {current_user.id}: {str(refund_err)}")
        raise e

    except Exception:
        logger.exception("Smart Ad Generation failed")
        try:
            await log_credit_change(
                db, current_user, COST_SMART_AD, "Refund: Smart Ad Generation failed"
            )
            await db.commit()
        except Exception as refund_err:
            logger.error(f"Failed to refund user {current_user.id}: {str(refund_err)}")

        raise InternalServerError(detail="Terjadi kesalahan sistem saat memproses permintaan Anda. Silakan coba beberapa saat lagi.")


@router.post(
    "/batch-resize",
    response_model=BatchResizeResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch Resize Ad",
    description="Expands the bounds of an ad image to multiple aspect ratios concurrently."
)
async def batch_resize_ad(
    request: BatchResizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_dependency),
):
    target_sizes = request.target_sizes
    if not target_sizes:
        raise ValidationError(detail="No target sizes provided")

    total_cost = len(target_sizes) * COST_GENERATIVE_EXPAND
    if current_user.credits_remaining < total_cost:
        raise InsufficientCreditsError(detail=f"Insufficient credits for {len(target_sizes)} generated resizes")

    from app.services.credit_service import log_credit_change
    await log_credit_change(db, current_user, -total_cost, f"Batch Resize ({len(target_sizes)} items)")

    # Mapping sizes to width/height
    size_map = {
        "1:1": (1024, 1024),
        "9:16": (768, 1344),
        "16:9": (1344, 768),
        "4:5": (800, 1000)
    }

    try:
        async def process_size(size_str: str) -> tuple[str, str]:
            if size_str not in size_map:
                logger.warning(f"Unsupported size {size_str}, skipping.")
                return size_str, ""

            w, h = size_map[size_str]
            logger.info(f"Resizing to {size_str} ({w}x{h})")

            # Using Generative Expand via outpaint_service
            res = await outpaint_service.outpaint_image(
                image_url=request.image_url,
                target_width=w,
                target_height=h
            )
            return size_str, res["url"]

        tasks = [process_size(sz) for sz in target_sizes]
        results = await asyncio.gather(*tasks)

        valid_results = {sz: url for sz, url in results if url}

        await db.commit()
        return BatchResizeResponse(results=valid_results)

    except Exception as e:
        logger.exception("Batch Resize failed")
        try:
            await log_credit_change(
                db, current_user, total_cost, "Refund: Batch resize failed"
            )
            await db.commit()
        except Exception as refund_err:
            logger.error(f"Failed to refund user {current_user.id}: {str(refund_err)}")

        raise InternalServerError(detail=f"Failed to batch resize: {str(e)}")
