from app.core.exceptions import AppException, NotFoundError, ValidationError, InsufficientCreditsError, UnauthorizedError, ForbiddenError, ConflictError, InternalServerError
from app.schemas.error import ERROR_RESPONSES
import logging
import time
import uuid
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.services import banner_service, product_scene_service, batch_service
from app.api.deps import get_db
from app.api.rate_limit import rate_limit_dependency
from app.models.user import User
from app.services.storage_service import upload_image
from app.schemas.error import ERROR_RESPONSES

router = APIRouter(tags=["AI Tools"])
logger = logging.getLogger(__name__)

@router.post(
    "/text-banner",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Generate Text Banner",
    description="Generate a decorative AI-generated text banner with transparent background.",
    responses=ERROR_RESPONSES,
)
async def text_banner(
    text: str = Form(...),
    style: str = Form("ribbon"),
    color_hint: str = Form("colorful"),
    quality: str = Form("standard"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_dependency),
):
    """
    Generate a decorative AI-generated text banner with transparent background.
    Premium quality uses Gemini 3.1 Flash Image Preview (Nano Banana 2).
    """
    try:
        # Validate quality
        valid_qualities = ["draft", "standard", "premium"]
        if quality not in valid_qualities:
            raise ValidationError(detail="Invalid quality requested")

        cost = 2 if quality == "premium" else 1

        if current_user.credits_remaining < cost:
            raise InsufficientCreditsError(detail="Insufficient credits")

        start_time = time.time()

        # Call the banner service
        result = await banner_service.generate_text_banner(
            text=text, style=style, color_hint=color_hint, quality=quality
        )

        # Deduct credits
        from app.services.credit_service import log_credit_change

        await log_credit_change(
            db, current_user, -cost, f"Generate text banner ({quality})"
        )
        await db.commit()

        logger.info(
            f"Text banner generation ({quality}) took {time.time() - start_time:.2f}s"
        )
        return result

    except AppException:
        raise
    except Exception as e:
        logger.exception(f"Failed to generate text banner: {str(e)}")
        raise InternalServerError(detail="Failed to generate text banner")

@router.post(
    "/product-scene",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Create Product Scene",
    description="Generate professional product scenes automatically from a product image.",
    responses=ERROR_RESPONSES,
)
async def create_product_scene(
    file: UploadFile = File(...),
    theme: str = Form("studio"),
    aspect_ratio: str = Form("1:1"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_dependency),
):
    """
    Generate professional product scenes automatically.
    Cost: 1 credit per generation.
    """
    if current_user.credits_remaining < 1:
        raise InsufficientCreditsError(detail="Insufficient credits")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise ValidationError(detail="Image size exceeds 10MB limit")

    from app.services.credit_service import log_credit_change

    await log_credit_change(db, current_user, -1, "AI Product Scene Generator")
    await db.commit()

    try:
        start_time = time.time()

        # 1. Process scene
        final_bytes = await product_scene_service.generate_product_scene(
            image_bytes=content, theme=theme, aspect_ratio=aspect_ratio
        )

        # 2. Upload result
        scene_id = str(uuid.uuid4())[:8]
        result_url = await upload_image(
            final_bytes, content_type="image/jpeg", prefix=f"product_scene_{scene_id}"
        )

        logger.info(f"Product Scene Generation took {time.time() - start_time:.2f}s")
        return {"url": result_url}

    except Exception as e:
        logger.exception("Product Scene Generation failed")
        try:
            from app.services.credit_service import log_credit_change

            await log_credit_change(
                db, current_user, 1, "Refund: AI Product Scene Generation gagal"
            )
            await db.commit()
        except Exception as refund_err:
            logger.error(
                f"CRITICAL: Failed to refund user {current_user.id}: {str(refund_err)}"
            )
        raise InternalServerError(detail=f"Failed to generate product scene: {str(e)}"
        )

@router.post(
    "/batch",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Process Batch Images",
    description="Process multiple images at once for background removal or product scenes.",
    responses=ERROR_RESPONSES,
)
async def process_batch_images(
    files: List[UploadFile] = File(...),
    operation: str = Form(...),
    params_json: str = Form("{}"),
    logo: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_dependency),
):
    """
    Process multiple images at once. Returns a ZIP file URL.
    Cost: Varies by operation * number of files.
    Max 10 files per batch to prevent timeouts.
    """
    if len(files) > 10:
        raise ValidationError(detail="Maksimal 10 file dalam satu batch")

    # Calculate total cost
    per_file_cost = 0
    if operation == "remove_bg" or operation == "product_scene":
        per_file_cost = 1

    total_cost = per_file_cost * len(files)

    if current_user.credits_remaining < total_cost:
        raise InsufficientCreditsError(detail=f"Kredit tidak cukup. Butuh {total_cost} kredit."
        )

    # Parse params
    try:
        params = json.loads(params_json)
    except Exception:
        params = {}

    # Read logo for watermark if provided
    if operation == "watermark" and logo:
        params["logo_bytes"] = await logo.read()
    elif operation == "watermark":
        raise ValidationError(detail="Logo wajib untuk watermark")

    # Read files
    # Only limit individual files to 5MB here for batch to save memory
    file_data = []
    for f in files:
        content = await f.read()
        if len(content) > 5 * 1024 * 1024:
            raise ValidationError(detail=f"File {f.filename} terlalu besar (Max 5MB)"
            )
        file_data.append((f.filename, content))

    from app.services.credit_service import log_credit_change

    if total_cost > 0:
        await log_credit_change(
            db,
            current_user,
            -total_cost,
            f"Batch Processing: {operation} ({len(files)} files)",
        )
        await db.commit()

    try:
        start_time = time.time()

        # 1. Process batch
        zip_bytes, errors = await batch_service.process_batch(
            files=file_data, operation=operation, params=params
        )

        # 2. Upload ZIP result
        batch_id = str(uuid.uuid4())[:8]
        result_url = await upload_image(
            zip_bytes,
            content_type="application/zip",
            prefix=f"batch_{operation}_{batch_id}",
        )
        # Note: upload_image typically adds .jpg or respects format, it might need tweaking if storage_service forces extension,
        # assuming storage handles generic bytes and content_types fine here, we modify prefix manually.

        logger.info(f"Batch Processing took {time.time() - start_time:.2f}s")
        return {
            "url": result_url,
            "success_count": len(files) - len(errors),
            "error_count": len(errors),
            "errors": errors,
        }

    except Exception as e:
        logger.exception("Batch Processing failed")
        if total_cost > 0:
            try:
                await log_credit_change(
                    db, current_user, total_cost, f"Refund: Batch {operation} gagal"
                )
                await db.commit()
            except Exception as refund_err:
                logger.error(
                    f"CRITICAL: Failed to refund user {current_user.id}: {str(refund_err)}"
                )
        raise InternalServerError(detail=f"Failed to process batch: {str(e)}"
        )
