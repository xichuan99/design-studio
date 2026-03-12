import os
import io
import logging
from PIL import Image

logger = logging.getLogger(__name__)


def _get_rembg_session():
    """Lazy load rembg session to avoid slow startup for all workers."""
    try:
        from rembg import new_session
        # U2net is the standard model for general background removal
        return new_session("u2net")
    except ImportError:
        logger.error(
            "rembg is not installed. "
            "Please install it with `pip install rembg[cpu]`."
        )
        return None


async def remove_background(image_bytes: bytes) -> bytes:
    """
    Removes the background from an image.
    Uses rembg by default since we are running locally.
    """
    try:
        from rembg import remove

        # Determine if we should use Gemini (env var GEMINI_BG_REMOVAL=true)
        # For now, default to rembg as specified in plan.
        use_gemini = os.environ.get(
            "GEMINI_BG_REMOVAL", "false"
        ).lower() == "true"

        if use_gemini:
            # Placeholder for Gemini experimental BG removal
            logger.info(
                "Gemini BG removal requested but not implemented. "
                "Falling back to rembg."
            )

        session = _get_rembg_session()
        if not session:
            raise RuntimeError("rembg session could not be initialized")

        input_image = Image.open(io.BytesIO(image_bytes))
        # Ensure image has no orientation issues
        if hasattr(input_image, '_getexif') and input_image._getexif():
            from PIL import ImageOps
            input_image = ImageOps.exif_transpose(input_image)

        # Convert to RGB if necessary (rembg accepts PIL Images)
        output_image = remove(input_image, session=session)

        output_buffer = io.BytesIO()
        output_image.save(output_buffer, format="PNG")
        return output_buffer.getvalue()

    except Exception as e:
        logger.exception(f"Failed to remove background: {str(e)}")
        raise


async def composite_product_on_background(
    product_png_bytes: bytes, background_bytes: bytes
) -> bytes:
    """
    Overlays a transparent product image onto a background image.
    Centers the product and scales it to fit nicely within the background.
    """
    try:
        product_img = Image.open(
            io.BytesIO(product_png_bytes)
        ).convert("RGBA")
        background_img = Image.open(
            io.BytesIO(background_bytes)
        ).convert("RGBA")

        bg_w, bg_h = background_img.size

        # Scale product to ~70% of shortest background dimension
        max_product_dim = int(min(bg_w, bg_h) * 0.7)
        product_img.thumbnail(
            (max_product_dim, max_product_dim),
            Image.Resampling.LANCZOS,
        )

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
        logger.exception(
            f"Failed to composite product on background: {str(e)}"
        )
        raise

async def composite_with_shadow(
    product_png_bytes: bytes,
    background_bytes: bytes,
    scale_factor: float = 0.7,
    offset_x_ratio: float = 0.5,
    offset_y_ratio: float = 0.55,
    add_shadow: bool = True
) -> bytes:
    """
    Advanced compositing: overlays product on background with scale, offset, and optional drop shadow.
    """
    try:
        from PIL import ImageFilter
        product_img = Image.open(io.BytesIO(product_png_bytes)).convert("RGBA")
        background_img = Image.open(io.BytesIO(background_bytes)).convert("RGBA")

        bg_w, bg_h = background_img.size

        # Scale product
        max_dim = int(min(bg_w, bg_h) * scale_factor)
        product_img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        p_w, p_h = product_img.size

        # Calc offset
        offset_x = int((bg_w - p_w) * offset_x_ratio)
        offset_y = int((bg_h - p_h) * offset_y_ratio)

        if add_shadow:
            shadow = Image.new("RGBA", (int(p_w * 1.5), int(p_h * 1.5)), (0, 0, 0, 0))

            # Create black shadow from alpha mask
            product_alpha = product_img.split()[-1]
            black_mask = Image.new("RGBA", (p_w, p_h), (0, 0, 0, 160)) # semi-transparent black
            black_mask.putalpha(product_alpha)

            # Paste to padded shadow image to avoid cropping when blurring
            pad_x = int(p_w * 0.25)
            pad_y = int(p_h * 0.25)
            shadow.paste(black_mask, (pad_x, pad_y), black_mask)

            # Apply blur
            shadow = shadow.filter(ImageFilter.GaussianBlur(radius=int(max_dim * 0.04)))

            # Offset shadow slightly down
            shadow_x = offset_x - pad_x + int(p_w * 0.05)
            shadow_y = offset_y - pad_y + int(p_h * 0.08)

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
