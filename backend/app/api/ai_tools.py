import logging
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.rate_limit import rate_limit_dependency
from app.models.user import User
from app.services import bg_removal_service, upscale_service, banner_service, retouch_service, id_photo_service
from app.services.storage_service import upload_image # Corrected from upload_imager

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/background-swap")
async def background_swap(
    file: UploadFile = File(...),
    prompt: str = Form(...),
    aspect_ratio: str = Form("1:1"),
    style: str = Form("bold"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_dependency),
):
    """
    1. Removes background
    2. Generates new background using Fal.ai
    3. Composites the object with shadow
    4. Uploads result to storage
    """
    if current_user.credits_remaining <= 0:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit")

    from app.services.credit_service import log_credit_change
    await log_credit_change(db, current_user, -1, "Hapus background")
    await db.commit()

    try:
        from app.services.image_service import generate_background

        # 1. Remove BG
        no_bg_bytes = await bg_removal_service.remove_background(content)

        # 2. Generate Background
        bg_result = await generate_background(
            visual_prompt=prompt,
            style=style,
            aspect_ratio=aspect_ratio,
            integrated_text=False
        )

        async with httpx.AsyncClient() as http_client:
            bg_resp = await http_client.get(
                bg_result["image_url"], timeout=30.0
            )
            bg_resp.raise_for_status()
            bg_bytes = bg_resp.content

        # 3. Composite
        final_bytes = await bg_removal_service.composite_with_shadow(
            product_png_bytes=no_bg_bytes,
            background_bytes=bg_bytes,
            scale_factor=0.7,
            offset_x_ratio=0.5,
            offset_y_ratio=0.55,
            add_shadow=True
        )

        # 4. Upload
        result_url = await upload_image(
            final_bytes,
            content_type="image/jpeg",
            prefix=f"tools_bgswap_{current_user.id}"
        )

        return {"url": result_url}
    except Exception as e:
        from app.services.credit_service import log_credit_change
        await log_credit_change(db, current_user, 1, "Refund: gagal hapus background")
        await db.commit()
        logging.exception("Background swap failed")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process image: {str(e)}"
        )


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
            if file.filename and file.filename.lower().endswith('.png'):
                mime_type = "image/png"
            elif file.filename and (file.filename.lower().endswith('.jpg') or file.filename.lower().endswith('.jpeg')):
                mime_type = "image/jpeg"
            else:
                mime_type = "image/jpeg" # Default fallback

        temp_url = await upload_image(
            image_bytes,
            content_type=mime_type,
            prefix=f"temp_upscale_{temp_id}"
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
            final_bytes,
            content_type=final_mime,
            prefix=f"upscaled/{final_id}"
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
        raise HTTPException(
            status_code=500, detail="Failed to process image upscaling"
        )


@router.post("/text-banner")
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
            raise HTTPException(status_code=400, detail="Invalid quality requested")

        cost = 2 if quality == "premium" else 1

        if current_user.credits_remaining < cost:
            raise HTTPException(status_code=402, detail="Insufficient credits")

        start_time = time.time()

        # Call the banner service
        result = await banner_service.generate_text_banner(
            text=text,
            style=style,
            color_hint=color_hint,
            quality=quality
        )

        # Deduct credits
        from app.services.credit_service import log_credit_change
        await log_credit_change(db, current_user, -cost, f"Generate text banner ({quality})")
        await db.commit()

        logger.info(f"Text banner generation ({quality}) took {time.time() - start_time:.2f}s")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to generate text banner: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to generate text banner"
        )


@router.post("/retouch")
async def retouch(
    file: UploadFile = File(...),
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
        mime_type = file.content_type or "image/jpeg"
        before_url = await upload_image(
            content,
            content_type=mime_type,
            prefix=f"retouch_before_{temp_id}"
        )

        # 2. Process
        enhanced_bytes = await retouch_service.auto_enhance(content)
        final_bytes = await retouch_service.remove_blemishes(enhanced_bytes)

        # 3. Upload result
        result_url = await upload_image(
            final_bytes,
            content_type="image/jpeg",
            prefix=f"retouch_after_{temp_id}"
        )

        logger.info(f"Retouch logic took {time.time() - start_time:.2f}s")
        return {"url": result_url, "before_url": before_url}
    except Exception as e:
        from app.services.credit_service import log_credit_change
        await log_credit_change(db, current_user, 1, "Refund: gagal retouch foto")
        await db.commit()
        logger.exception("Retouch failed")
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")


@router.post("/id-photo")
async def create_id_photo(
    file: UploadFile = File(...),
    bg_color: str = Form("red"),
    size: str = Form("3x4"),
    custom_width_cm: float = Form(None),
    custom_height_cm: float = Form(None),
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
            custom_h_cm=custom_height_cm
        )

        # 2. Upload result
        photo_id = str(uuid.uuid4())[:8]
        result_url = await upload_image(
            final_bytes,
            content_type="image/jpeg",
            prefix=f"idphoto_{photo_id}"
        )

        logger.info(f"ID Photo logic took {time.time() - start_time:.2f}s")
        return {"url": result_url, "width_cm": custom_width_cm, "height_cm": custom_height_cm, "bg_color": bg_color}
    except Exception as e:
        from app.services.credit_service import log_credit_change
        await log_credit_change(db, current_user, 1, "Refund: gagal buat pasfoto")
        await db.commit()
        logger.exception("ID Photo generation failed")
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")
