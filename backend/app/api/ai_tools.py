import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.rate_limit import rate_limit_dependency
from app.models.user import User

router = APIRouter()


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

    current_user.credits_remaining -= 1
    await db.commit()

    try:
        from app.services.bg_removal_service import (
            remove_background, composite_with_shadow
        )
        from app.services.image_service import generate_background
        from app.services.storage_service import upload_image

        # 1. Remove BG
        no_bg_bytes = await remove_background(content)

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
        final_bytes = await composite_with_shadow(
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
        current_user.credits_remaining += 1
        await db.commit()
        logging.exception("Background swap failed")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process image: {str(e)}"
        )


@router.post("/upscale")
async def upscale(
    file: UploadFile = File(...),
    scale: int = Form(2),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_dependency),
):
    """
    1. Uploads original image temp
    2. Calls Fal.ai Upscale
    3. Re-uploads HD result to local S3
    """
    if current_user.credits_remaining <= 0:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit")

    current_user.credits_remaining -= 1
    await db.commit()

    try:
        from app.services.storage_service import upload_image
        from app.services.upscale_service import upscale_image

        # 1. Upload original image temporarily to get a URL for fal.ai
        temp_url = await upload_image(
            content,
            content_type=file.content_type,
            prefix=f"temp_upscale_{current_user.id}"
        )

        # 2. Call Upscale Service
        upscale_result = await upscale_image(temp_url, scale=scale)

        # 3. Download from fal.ai and re-upload to our S3 Storage
        async with httpx.AsyncClient() as http_client:
            hd_resp = await http_client.get(
                upscale_result["url"], timeout=60.0
            )
            hd_resp.raise_for_status()
            hd_bytes = hd_resp.content

        final_url = await upload_image(
            hd_bytes,
            content_type="image/png",
            prefix=f"tools_upscale_{current_user.id}"
        )

        return {"url": final_url}

    except Exception as e:
        current_user.credits_remaining += 1
        await db.commit()
        logging.exception("Upscale failed")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upscale image: {str(e)}"
        )
