"""Service for background removal and image compositing operations."""

import asyncio
import os
import io
import logging
import httpx
import uuid
from typing import Optional
import fal_client
from PIL import Image, ImageFilter

from app.core.ai_models import (
    FAL_BG_INPAINT_FILL,
    FAL_BG_REMOVE_FALLBACK,
    FAL_BG_REMOVE_PRIMARY,
)
from app.core.config import settings
from app.services.storage_service import upload_image

logger = logging.getLogger(__name__)

_BG_SWAP_STANDARD_QUALITY_GUARDRAILS = (
    "photorealistic, high quality, studio-grade lighting, "
    "sharp focus on subject, cinematic depth of field, "
    "clean background details, no random text, no blurry letters, "
    "no gibberish typography, no watermark, no logo"
)

_SHADOW_PROFILE_SETTINGS = {
    "default": {
        "alpha": 150,
        "blur_ratio": 0.03,
        "pad_ratio": 0.2,
        "x_shift_ratio": 0.012,
        "y_shift_ratio": 0.035,
    },
    "grounded": {
        "alpha": 170,
        "blur_ratio": 0.024,
        "pad_ratio": 0.18,
        "x_shift_ratio": 0.01,
        "y_shift_ratio": 0.03,
    },
    "soft": {
        "alpha": 132,
        "blur_ratio": 0.038,
        "pad_ratio": 0.24,
        "x_shift_ratio": 0.015,
        "y_shift_ratio": 0.042,
    },
}


def _ensure_fal_key() -> None:
    if not settings.FAL_KEY:
        raise ValueError("FAL_KEY is missing from environment")
    os.environ["FAL_KEY"] = settings.FAL_KEY


async def _download_result_bytes(output_url: str, timeout: float) -> bytes:
    if output_url.startswith("data:"):
        import base64

        base64_data = output_url.split(",", 1)[1]
        return base64.b64decode(base64_data)

    async with httpx.AsyncClient() as http_client:
        resp = await http_client.get(output_url, timeout=timeout)
        resp.raise_for_status()
        return resp.content


async def _remove_background_from_source_url(image_url: str) -> bytes:
    # Using BRIA RMBG v2 — significantly more accurate than birefnet for
    # fine-detail objects (watch straps, product edges, transparent materials)
    result = await fal_client.run_async(
        FAL_BG_REMOVE_PRIMARY,
        arguments={"image_url": image_url},
    )

    output_url = result.get("image", {}).get("url")
    if not output_url:
        # Fallback to birefnet if bria returns unexpected format
        logger.warning("BRIA RMBG-v2 returned no URL, falling back to birefnet")
        result = await fal_client.run_async(
            FAL_BG_REMOVE_FALLBACK,
            arguments={"image_url": image_url},
        )
        output_url = result.get("image", {}).get("url")
        if not output_url:
            raise RuntimeError("Both BRIA and birefnet returned no image URL")

    return await _download_result_bytes(output_url, timeout=60.0)


async def remove_background(image_bytes: bytes) -> bytes:
    """
    Removes the background from an image using Fal.ai (birefnet model).
    This offloads processing to avoid out-of-memory errors on the local VPS.

    Args:
        image_bytes (bytes): The raw bytes of the image to process.

    Returns:
        bytes: The raw bytes of the resulting transparent PNG image.

    Raises:
        ValueError: If the FAL_KEY environment variable is missing.
        RuntimeError: If the Fal.ai API fails to return a valid image URL.
        httpx.HTTPError: If downloading the result from Fal.ai fails.
        Exception: For any other unexpected errors during the process.
    """
    _ensure_fal_key()

    try:
        # 1. Upload the image temporarily to get a public URL for Fal.ai
        temp_id = str(uuid.uuid4())[:8]
        temp_url = await upload_image(
            image_bytes,
            content_type="image/jpeg",  # Assume JPEG, Fal will figure it out
            prefix=f"temp_bgrm_{temp_id}",
        )

        # 2. Call Fal.ai background removal model and download transparent PNG
        return await _remove_background_from_source_url(temp_url)

    except Exception as e:
        logger.exception(f"Failed to remove background via Fal.ai: {str(e)}")
        raise


async def remove_background_from_url(image_url: str) -> bytes:
    """
    Removes the background from a publicly accessible image URL.

    This path avoids re-uploading the original image when a storage URL already
    exists (for example in async job flows).
    """
    _ensure_fal_key()

    try:
        return await _remove_background_from_source_url(image_url)
    except Exception as e:
        logger.exception(f"Failed to remove background from URL via Fal.ai: {str(e)}")
        raise


def _feather_edges(img: Image.Image, radius: float = 1.0) -> Image.Image:
    """Softens the edges of a transparent PNG to avoid sharp seams."""
    if img.mode != "RGBA":
        return img
    alpha = img.split()[-1]
    alpha = alpha.filter(ImageFilter.GaussianBlur(radius=radius))
    # Erode the alpha slightly to remove the bright rim sometimes left by BG removal
    img.putalpha(alpha)
    return img


def _extract_inpaint_mask(transparent_png_bytes: bytes) -> bytes:
    """
    Creates an inpainting mask from a transparent PNG.

    The RMBG alpha channel is:  255 = subject (keep), 0 = background (generate)
    For flux-pro/v1/fill mask:  255 (white) = area to generate, 0 (black) = area to keep

    So we simply invert the alpha channel and save as a grayscale PNG.
    """
    img = Image.open(io.BytesIO(transparent_png_bytes)).convert("RGBA")
    alpha = img.split()[-1]  # L mode, 0–255

    # Invert: subject pixels (bright) → black (keep), bg pixels (dark) → white (generate)
    inverted = alpha.point(lambda x: 255 - x)

    # Slight dilation + blur on edges so the inpaint blends cleanly at seams
    inverted = inverted.filter(ImageFilter.MaxFilter(3))
    inverted = inverted.filter(ImageFilter.GaussianBlur(radius=1.2))

    output = io.BytesIO()
    inverted.save(output, format="PNG")
    return output.getvalue()


async def inpaint_background(
    original_bytes: Optional[bytes],
    transparent_png_bytes: bytes,
    prompt: str,
    *,
    original_url: Optional[str] = None,
) -> bytes:
    """
    Generates a new background by inpainting directly onto the original image.

    Instead of compositing a separately-generated background (which causes
    mismatched lighting/shadows), we let the Flux Fill model see the subject
    in context and fill the background region — resulting in natural lighting
    and seamless edges automatically.

    Steps:
        1. Derive inpaint mask from the RMBG transparent PNG (inverted alpha)
        2. Upload original image + mask
        3. Call fal-ai/flux-pro/v1/fill with the background prompt
        4. Download and return the composited result bytes

    Args:
        original_bytes: Raw bytes of the *original* (non-removed) image.
            Optional when `original_url` is provided.
        transparent_png_bytes: Transparent PNG returned by remove_background().
        prompt: User-supplied description of the desired new background.
        original_url: Public URL to the original image. If provided, skips
            re-uploading original bytes and only uploads the inpaint mask.

    Returns:
        bytes: Final JPEG image with the new background baked in.
    """
    import uuid

    base_id = str(uuid.uuid4())[:8]

    # 1. Build mask
    mask_bytes = _extract_inpaint_mask(transparent_png_bytes)

    # 2. Upload assets to get public URLs.
    #    If original URL already exists, only upload the mask.
    resolved_original_url = original_url
    if resolved_original_url:
        mask_url = await upload_image(
            mask_bytes,
            content_type="image/png",
            prefix=f"bgswap_mask_{base_id}",
        )
    else:
        if original_bytes is None:
            raise ValueError("Either original_bytes or original_url must be provided")

        resolved_original_url, mask_url = await asyncio.gather(
            upload_image(
                original_bytes,
                content_type="image/jpeg",
                prefix=f"bgswap_orig_{base_id}",
            ),
            upload_image(
                mask_bytes,
                content_type="image/png",
                prefix=f"bgswap_mask_{base_id}",
            ),
        )

    # 3. Enhance prompt for professional product photography.
    enhanced_prompt = build_background_swap_standard_prompt(prompt)

    # 4. Inpaint via flux-pro/v1/fill
    #    white mask = generate new background, black mask = preserve subject
    result = await fal_client.run_async(
        FAL_BG_INPAINT_FILL,
        arguments={
            "image_url": resolved_original_url,
            "mask_url": mask_url,
            "prompt": enhanced_prompt,
            "sync_mode": True,
            "output_format": "jpeg",
        },
    )

    # Parse result (flux-pro/v1/fill returns 'images' list or 'image' dict)
    if "images" in result and len(result["images"]) > 0:
        output_url = result["images"][0].get("url")
    elif "image" in result:
        output_url = result["image"].get("url")
    else:
        output_url = result.get("image_url") or result.get("url")

    if not output_url:
        raise RuntimeError("flux-pro/v1/fill returned no image URL")

    # 5. Download and return result
    return await _download_result_bytes(output_url, timeout=90.0)


def build_background_swap_standard_prompt(prompt: str) -> str:
    """Build a quality-guarded prompt for standard background swap generation."""
    base_prompt = (prompt or "").strip()
    return (
        f"Professional product photography, {base_prompt}, "
        f"{_BG_SWAP_STANDARD_QUALITY_GUARDRAILS}"
    )


async def composite_product_on_background(
    product_png_bytes: bytes, background_bytes: bytes
) -> bytes:
    """
    Overlays a transparent product image onto a background image.
    Centers the product and scales it to fit nicely within the background.

    Args:
        product_png_bytes (bytes): Raw bytes of the transparent product image (PNG).
        background_bytes (bytes): Raw bytes of the background image.

    Returns:
        bytes: Raw bytes of the composited image in JPEG format.

    Raises:
        Exception: If image loading, resizing, pasting, or saving fails.
    """
    try:
        product_img = Image.open(io.BytesIO(product_png_bytes)).convert("RGBA")
        background_img = Image.open(io.BytesIO(background_bytes)).convert("RGBA")

        bg_w, bg_h = background_img.size

        # Scale product to ~70% of shortest background dimension
        max_product_dim = int(min(bg_w, bg_h) * 0.7)
        product_img.thumbnail(
            (max_product_dim, max_product_dim),
            Image.Resampling.LANCZOS,
        )

        # Apply edge feathering to hide seam artifacts
        product_img = _feather_edges(product_img, radius=1.5)

        p_w, p_h = product_img.size

        # Center horizontally, place slightly below vertical center
        offset_x = (bg_w - p_w) // 2
        offset_y = (bg_h - p_h) // 2 + int(bg_h * 0.05)

        # Paste using the product's alpha channel as the mask
        background_img.paste(product_img, (offset_x, offset_y), product_img)

        # Convert back to RGB to save as JPEG
        final_img = background_img.convert("RGB")
        output_buffer = io.BytesIO()
        final_img.save(output_buffer, format="JPEG", quality=95)

        return output_buffer.getvalue()

    except Exception as e:
        logger.exception(f"Failed to composite product on background: {str(e)}")
        raise


async def composite_with_shadow(
    product_png_bytes: bytes,
    background_bytes: bytes,
    scale_factor: float = 0.8,
    offset_x_ratio: float = 0.5,
    offset_y_ratio: float = 0.55,
    add_shadow: bool = True,
    shadow_profile: str = "default",
) -> bytes:
    """
    Advanced compositing: overlays product on background with scale, offset, and optional drop shadow.

    Args:
        product_png_bytes (bytes): Raw bytes of the transparent product image (PNG).
        background_bytes (bytes): Raw bytes of the background image.
        scale_factor (float): Ratio to scale the product relative to the shortest background dimension. Defaults to 0.7.
        offset_x_ratio (float): Horizontal position ratio (0.0 left, 1.0 right). Defaults to 0.5.
        offset_y_ratio (float): Vertical position ratio (0.0 top, 1.0 bottom). Defaults to 0.55.
        add_shadow (bool): Whether to generate and apply a drop shadow. Defaults to True.

    Returns:
        bytes: Raw bytes of the composited image in JPEG format.

    Raises:
        Exception: If compositing or applying the shadow filter fails.
    """
    try:
        product_img = Image.open(io.BytesIO(product_png_bytes)).convert("RGBA")
        background_img = Image.open(io.BytesIO(background_bytes)).convert("RGBA")

        bg_w, bg_h = background_img.size

        # Scale product
        max_dim = int(min(bg_w, bg_h) * scale_factor)
        product_img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        # Adaptive feathering: keep large products crisp, soften smaller cutouts a bit more.
        if scale_factor >= 0.82:
            feather_radius = 0.65
        elif scale_factor >= 0.74:
            feather_radius = 0.8
        elif scale_factor <= 0.68:
            feather_radius = 1.05
        else:
            feather_radius = 0.9

        product_img = _feather_edges(product_img, radius=feather_radius)

        p_w, p_h = product_img.size

        # Calc offset
        offset_x = int((bg_w - p_w) * offset_x_ratio)
        offset_y = int((bg_h - p_h) * offset_y_ratio)

        if add_shadow:
            profile = _SHADOW_PROFILE_SETTINGS.get(
                shadow_profile,
                _SHADOW_PROFILE_SETTINGS["default"],
            )
            shadow = Image.new("RGBA", (int(p_w * 1.5), int(p_h * 1.5)), (0, 0, 0, 0))

            # Create black shadow from alpha mask
            product_alpha = product_img.split()[-1]
            black_mask = Image.new(
                "RGBA", (p_w, p_h), (0, 0, 0, profile["alpha"])
            )  # semi-transparent black
            black_mask.putalpha(product_alpha)

            # Paste to padded shadow image to avoid cropping when blurring
            pad_x = int(p_w * profile["pad_ratio"])
            pad_y = int(p_h * profile["pad_ratio"])
            shadow.paste(black_mask, (pad_x, pad_y), black_mask)

            # Apply blur
            blur_radius = max(1, int(max_dim * profile["blur_ratio"]))
            shadow = shadow.filter(ImageFilter.GaussianBlur(radius=blur_radius))

            # Ratio-based shadow offset keeps visual contact stable across varying object sizes.
            shadow_x = offset_x - pad_x + int(p_w * profile["x_shift_ratio"])
            shadow_y = offset_y - pad_y + int(p_h * profile["y_shift_ratio"])

            logger.debug(
                "Composite shadow profile=%s blur=%s offset=(%s,%s) size=(%s,%s)",
                shadow_profile,
                blur_radius,
                shadow_x,
                shadow_y,
                p_w,
                p_h,
            )

            # Paste shadow first using its own alpha as mask
            background_img.paste(shadow, (shadow_x, shadow_y), shadow)

        # Paste product
        background_img.paste(product_img, (offset_x, offset_y), product_img)

        final_img = background_img.convert("RGB")
        output_buffer = io.BytesIO()
        final_img.save(output_buffer, format="JPEG", quality=95)

        return output_buffer.getvalue()

    except Exception as e:
        logger.exception(f"Failed to composite product with shadow: {str(e)}")
        raise

