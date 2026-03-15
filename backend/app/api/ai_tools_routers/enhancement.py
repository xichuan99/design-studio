import logging
import time
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from app.services import upscale_service, retouch_service, id_photo_service, watermark_service
from app.api.deps import get_db
from app.api.rate_limit import rate_limit_dependency
from app.models.user import User
from app.services.storage_service import upload_image

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/upscale")
async def upscale(
    file: UploadFile = File(...),
    scale: float = Form(2.0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_dependency),
):
    try:
        if current_user.credits_remaining < 1:
            raise HTTPException(status_code=402, detail="Insufficient credits")

        start_time = time.time()

        # 1. Upload original to S3
        temp_id = str(uuid.uuid4())[:8]
        image_bytes = await file.read()

        # Try to guess mime type from filename if content_type is null
        mime_type = file.content_type
        if not mime_type:
            if file.filename and file.filename.lower().endswith(".png"):
                mime_type = "image/png"
            elif file.filename and (
                file.filename.lower().endswith(".jpg")
                or file.filename.lower().endswith(".jpeg")
            ):
                mime_type = "image/jpeg"
            else:
                mime_type = "image/jpeg"  # Default fallback

        temp_url = await upload_image(
            image_bytes, content_type=mime_type, prefix=f"temp_upscale_{temp_id}"
        )

        # 2. Call Fal.ai for upscaling
        result = await upscale_service.upscale_image(temp_url, scale)
        upscaled_url = result.get("url")

        if not upscaled_url:
            raise HTTPException(status_code=500, detail="Upscale failed to return URL")

        # 3. Download the result and upload to our S3
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(upscaled_url, timeout=60.0)
            resp.raise_for_status()
            final_bytes = resp.content

        # Determine content type of the result (Fal upscale docs say it preserves format usually, default jpeg)
        final_mime = "image/png" if ".png" in upscaled_url.lower() else "image/jpeg"

        final_id = str(uuid.uuid4())[:12]
        stored_url = await upload_image(
            final_bytes, content_type=final_mime, prefix=f"upscaled/{final_id}"
        )

        from app.services.credit_service import log_credit_change

        await log_credit_change(db, current_user, -1, "Upscale gambar")
        await db.commit()

        logger.info(f"Upscale logic took {time.time() - start_time:.2f}s")
        return {"url": stored_url}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to process upscale request: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process image upscaling")

@router.post("/retouch")
async def retouch(
    file: UploadFile = File(...),
    output_format: str = Form("jpeg"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_dependency),
):
    """
    1. Enhances exposure/color using CLAHE
    2. Removes blemishes using Bilateral Filtering
    """
    if current_user.credits_remaining < 1:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit")

    from app.services.credit_service import log_credit_change

    await log_credit_change(db, current_user, -1, "Auto-Retouch foto")
    await db.commit()

    try:
        start_time = time.time()

        # 1. Upload original for Before/After slider
        temp_id = str(uuid.uuid4())[:8]
        mime_type = "image/png" if output_format.lower() == "png" else "image/jpeg"
        before_url = await upload_image(
            content, content_type=mime_type, prefix=f"retouch_before_{temp_id}"
        )

        # 2. Process
        enhanced_bytes = await retouch_service.auto_enhance(
            content, output_format=output_format
        )
        final_bytes = await retouch_service.remove_blemishes(
            enhanced_bytes, output_format=output_format
        )

        # 3. Upload result
        result_url = await upload_image(
            final_bytes, content_type=mime_type, prefix=f"retouch_after_{temp_id}"
        )

        logger.info(f"Retouch logic took {time.time() - start_time:.2f}s")
        return {"url": result_url, "before_url": before_url}
    except Exception as e:
        logger.exception("Retouch failed")
        try:
            from app.services.credit_service import log_credit_change

            await log_credit_change(db, current_user, 1, "Refund: gagal retouch foto")
            await db.commit()
        except Exception as refund_err:
            logger.error(
                f"CRITICAL: Failed to refund user {current_user.id}: {str(refund_err)}"
            )
        raise HTTPException(
            status_code=500, detail=f"Failed to process image: {str(e)}"
        )

@router.post("/id-photo")
async def create_id_photo(
    file: UploadFile = File(...),
    bg_color: str = Form("red"),
    size: str = Form("3x4"),
    custom_width_cm: float = Form(None),
    custom_height_cm: float = Form(None),
    output_format: str = Form("jpeg"),
    include_print_sheet: bool = Form(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_dependency),
):
    """
    1. Removes background
    2. Detects face and smart crops
    3. Replaces background with solid color
    4. Resizes to standard print sizes at 300 DPI
    """
    if current_user.credits_remaining < 1:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    valid_bg_colors = ["red", "blue"]
    valid_sizes = ["2x3", "3x4", "4x6", "custom"]
    if bg_color not in valid_bg_colors:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid bg_color '{bg_color}'. Must be one of: {valid_bg_colors}",
        )
    if size not in valid_sizes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid size '{size}'. Must be one of: {valid_sizes}",
        )
    if size == "custom" and (not custom_width_cm or not custom_height_cm):
        raise HTTPException(
            status_code=400,
            detail="custom_width_cm and custom_height_cm are required when size is 'custom'",
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit")

    from app.services.credit_service import log_credit_change

    await log_credit_change(db, current_user, -1, f"Pasfoto Maker ({size})")
    await db.commit()

    try:
        start_time = time.time()

        # 1. Generate Photo
        final_bytes = await id_photo_service.generate_id_photo(
            image_bytes=content,
            bg_color_name=bg_color,
            size_name=size,
            custom_w_cm=custom_width_cm,
            custom_h_cm=custom_height_cm,
            output_format=output_format,
        )

        mime_type = "image/png" if output_format.lower() == "png" else "image/jpeg"
        # 2. Upload result
        photo_id = str(uuid.uuid4())[:8]
        result_url = await upload_image(
            final_bytes, content_type=mime_type, prefix=f"idphoto_{photo_id}"
        )

        # 3. Generate Print Sheet if requested
        print_sheet_url = None
        if include_print_sheet:
            sheet_bytes = id_photo_service.generate_print_sheet(
                photo_bytes=final_bytes, output_format=output_format
            )
            print_sheet_url = await upload_image(
                sheet_bytes, content_type=mime_type, prefix=f"idphoto_sheet_{photo_id}"
            )

        logger.info(f"ID Photo logic took {time.time() - start_time:.2f}s")
        return {
            "url": result_url,
            "width_cm": custom_width_cm,
            "height_cm": custom_height_cm,
            "bg_color": bg_color,
            "print_sheet_url": print_sheet_url,
        }
    except Exception as e:
        logger.exception("ID Photo generation failed")
        try:
            from app.services.credit_service import log_credit_change

            await log_credit_change(db, current_user, 1, "Refund: gagal buat pasfoto")
            await db.commit()
        except Exception as refund_err:
            logger.error(
                f"CRITICAL: Failed to refund user {current_user.id}: {str(refund_err)}"
            )
        raise HTTPException(
            status_code=500, detail=f"Failed to process image: {str(e)}"
        )

@router.post("/watermark")
async def apply_watermark(
    file: UploadFile = File(...),
    logo: UploadFile = File(...),
    position: str = Form("bottom-right"),
    opacity: float = Form(0.5),
    scale: float = Form(0.2),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_dependency),
):
    """
    Applies a watermark/logo to an image.
    Costs 0 credits as it's purely client-side/local image processing.
    """
    content = await file.read()
    logo_content = await logo.read()

    if len(content) > 10 * 1024 * 1024 or len(logo_content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File sizes exceed limits (10MB for image, 5MB for logo)",
        )

    try:
        start_time = time.time()

        # 1. Apply watermark using Pillow
        final_bytes = await watermark_service.apply_watermark(
            base_image_bytes=content,
            watermark_bytes=logo_content,
            position=position,
            opacity=opacity,
            scale=scale,
        )

        # 2. Upload result
        watermark_id = str(uuid.uuid4())[:8]
        result_url = await upload_image(
            final_bytes, content_type="image/jpeg", prefix=f"watermarked_{watermark_id}"
        )

        logger.info(f"Watermark logic took {time.time() - start_time:.2f}s")
        return {"url": result_url}

    except Exception as e:
        logger.exception("Watermark application failed")
        raise HTTPException(
            status_code=500, detail=f"Failed to process image: {str(e)}"
        )

