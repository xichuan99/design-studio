"""Service for orchestrating the generation of professional product scenes."""

import io
import logging
import httpx
from PIL import Image
from typing import Dict, Any, Tuple, Optional

from app.services import bg_removal_service
from app.services.image_service import generate_background, generate_background_ultra

logger = logging.getLogger(__name__)

_AUTO_PAD_RATIO = 0.15
_SPARSE_NORMALIZE_THRESHOLD = 0.38


def _compute_subject_metrics(img: Image.Image) -> Tuple[Optional[Tuple[int, int, int, int]], float, float, float]:
    """Compute bbox occupancy metrics for a transparent product image."""
    bbox = img.getbbox()
    if not bbox:
        return None, 0.0, 0.0, 0.0

    obj_w = bbox[2] - bbox[0]
    obj_h = bbox[3] - bbox[1]
    img_w, img_h = img.size
    area_ratio = (obj_w * obj_h) / max(1, (img_w * img_h))
    width_ratio = obj_w / max(1, img_w)
    height_ratio = obj_h / max(1, img_h)
    return bbox, area_ratio, width_ratio, height_ratio


def _should_auto_pad(orig_img: Image.Image) -> bool:
    """Pad only when edge activity indicates close-up framing near borders."""
    img = orig_img.convert("RGB")
    w, h = img.size
    if w < 64 or h < 64:
        return False

    band_x = max(2, int(w * 0.05))
    band_y = max(2, int(h * 0.05))
    edge_color = img.getpixel((0, 0))

    border_pixels = []
    border_pixels.extend(img.crop((0, 0, w, band_y)).getdata())
    border_pixels.extend(img.crop((0, h - band_y, w, h)).getdata())
    border_pixels.extend(img.crop((0, band_y, band_x, h - band_y)).getdata())
    border_pixels.extend(img.crop((w - band_x, band_y, w, h - band_y)).getdata())

    if not border_pixels:
        return False

    # If many border pixels differ from edge color, subject likely touches edges.
    def _is_different(px: Tuple[int, int, int]) -> bool:
        return (
            abs(px[0] - edge_color[0]) > 20
            or abs(px[1] - edge_color[1]) > 20
            or abs(px[2] - edge_color[2]) > 20
        )

    diff_count = sum(1 for px in border_pixels if _is_different(px))
    diff_ratio = diff_count / len(border_pixels)
    return diff_ratio > 0.08


def _normalize_sparse_subject(no_bg_img: Image.Image) -> Image.Image:
    """Crop to subject bbox and re-pad lightly for sparse subjects to reduce floating."""
    bbox, area_ratio, _, _ = _compute_subject_metrics(no_bg_img)
    if not bbox or area_ratio >= _SPARSE_NORMALIZE_THRESHOLD:
        return no_bg_img

    subject = no_bg_img.crop(bbox)
    sub_w, sub_h = subject.size
    pad_x = max(4, int(sub_w * 0.1))
    pad_y = max(4, int(sub_h * 0.1))

    canvas = Image.new("RGBA", (sub_w + pad_x * 2, sub_h + pad_y * 2), (0, 0, 0, 0))
    canvas.paste(subject, (pad_x, pad_y), subject)
    return canvas


def _pick_scale_factor(area_ratio: float, width_ratio: float, height_ratio: float) -> float:
    """Balanced scale tuning based on occupancy metrics."""
    if area_ratio > 0.78 or width_ratio > 0.92 or height_ratio > 0.92:
        return 0.82
    if area_ratio > 0.62 or width_ratio > 0.82 or height_ratio > 0.82:
        return 0.76
    if area_ratio < 0.2:
        return 0.86
    if area_ratio < 0.32:
        return 0.8
    return 0.72


def _pick_offset_y_ratio(area_ratio: float) -> float:
    """Lower sparse subjects further to increase contact, lift very large ones to avoid clipping."""
    if area_ratio < 0.22:
        return 0.68
    if area_ratio < 0.35:
        return 0.65
    if area_ratio > 0.7:
        return 0.56
    if area_ratio > 0.55:
        return 0.58
    return 0.62

# Predefined themes to make it easy for UMKM users without requiring complex prompting
SCENE_THEMES = {
    "studio": {
        "visual_prompt": "professional photography studio setup, soft lighting, infinite smooth backdrop gradient, premium product display platform, clean 8k resolution",
        "style": "minimalist",
    },
    "nature": {
        "visual_prompt": "outdoor nature setting, placed on mossy rock or wooden stump, surrounded by green leaves, dappled sunlight, shallow depth of field, natural lighting",
        "style": "bold",
    },
    "cafe": {
        "visual_prompt": "cozy cafe setting, placed on wooden table, blurred coffee shop background with warm fairy lights, morning sunlight coming from window",
        "style": "elegant",
    },
    "minimalist": {
        "visual_prompt": "abstract minimalist geometry, white and cream tones, simple pedestal, harsh sunlight casting sharp modern shadows, architectural feel",
        "style": "minimalist",
    },
    "kitchen": {
        "visual_prompt": "bright modern kitchen counter top, marble surface, blurred kitchen appliances in background, bright morning light, lifestyle photography",
        "style": "bold",
    },
    "bathroom": {
        "visual_prompt": "luxury spa bathroom, placed on white marble sink tray, soft towel textures, spa stones, calm lighting, water reflections",
        "style": "elegant",
    },
}


async def generate_product_scene(
    image_bytes: bytes,
    theme: str = "studio",
    aspect_ratio: str = "1:1",
    quality: str = "standard",
    composite_profile: str = "default",
) -> bytes:
    """
    Orchestrates the creation of a professional product scene:
    1. Removes background from the original product
    2. Generates a new background based on a predefined theme
    3. Composites the product onto the background with a shadow

    Args:
        image_bytes (bytes): The raw bytes of the original product image.
        theme (str): The scene theme to use (e.g., "studio", "nature", "cafe"). Defaults to "studio".
        aspect_ratio (str): The target aspect ratio for the scene. Defaults to "1:1".

    Returns:
        bytes: The raw bytes of the composited product scene in JPEG format.

    Raises:
        Exception: If background removal, background generation, image downloading, or compositing fails.
    """
    logger.info(f"Generating product scene with theme: {theme}")

    # 0. Auto-pad the image only when close-up framing is detected.
    try:
        from PIL import ImageOps

        orig_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        if _should_auto_pad(orig_img):
            w, h = orig_img.size
            pad_w = int(w * _AUTO_PAD_RATIO)
            pad_h = int(h * _AUTO_PAD_RATIO)
            edge_color = orig_img.getpixel((0, 0))

            padded_img = ImageOps.expand(
                orig_img, border=(pad_w, pad_h, pad_w, pad_h), fill=edge_color
            )

            padded_buffer = io.BytesIO()
            padded_img.save(padded_buffer, format="JPEG", quality=95)
            processed_image_bytes = padded_buffer.getvalue()
            logger.debug("Applied conditional auto-padding before background removal")
        else:
            processed_image_bytes = image_bytes
            logger.debug("Skipped auto-padding; border activity below threshold")
    except Exception as e:
        logger.warning(f"Failed to auto-pad image, proceeding with original: {e}")
        processed_image_bytes = image_bytes

    # 1. Background removal using existing service
    logger.debug("Removing background...")
    try:
        no_bg_bytes: bytes = await bg_removal_service.remove_background(
            processed_image_bytes
        )
    except Exception as e:
        logger.error(f"Background removal failed for product scene: {e}")
        raise RuntimeError(
            f"Gagal menghapus background gambar asli. Pastikan foto produk cukup jelas. Error: {str(e)}"
        )

    # Normalize sparse subject geometry, then compute adaptive scale/placement.
    try:
        img = Image.open(io.BytesIO(no_bg_bytes)).convert("RGBA")
        normalized_img = _normalize_sparse_subject(img)

        if normalized_img is not img:
            normalized_buffer = io.BytesIO()
            normalized_img.save(normalized_buffer, format="PNG")
            no_bg_bytes = normalized_buffer.getvalue()

        _, area_ratio, width_ratio, height_ratio = _compute_subject_metrics(normalized_img)
        scale_factor = _pick_scale_factor(area_ratio, width_ratio, height_ratio)
        offset_y_ratio = _pick_offset_y_ratio(area_ratio)

        logger.info(
            "Product scene metrics: area=%.2f width=%.2f height=%.2f -> scale=%.2f offset_y=%.2f",
            area_ratio,
            width_ratio,
            height_ratio,
            scale_factor,
            offset_y_ratio,
        )
    except Exception as e:
        logger.warning(f"Error analyzing image bounding box: {e}")
        scale_factor = 0.72
        offset_y_ratio = 0.62

    # 2. Map theme to prompt
    theme_config = SCENE_THEMES.get(theme, SCENE_THEMES["studio"])

    # 3. Generate background (standard: Flux Pro, ultra: gpt-image-2)
    logger.debug(f"Generating background prompt: {theme_config['visual_prompt']} [quality={quality}]")
    if quality == "ultra":
        bg_result: Dict[str, Any] = await generate_background_ultra(
            visual_prompt=theme_config["visual_prompt"],
            aspect_ratio=aspect_ratio,
        )
    else:
        bg_result: Dict[str, Any] = await generate_background(
            visual_prompt=theme_config["visual_prompt"],
            style=theme_config["style"],
            aspect_ratio=aspect_ratio,
            integrated_text=False,
        )

    # 4. Fetch the generated background image
    logger.debug("Downloading generated background...")
    if bg_result["image_url"].startswith("data:"):
        import base64

        base64_data = bg_result["image_url"].split(",", 1)[1]
        bg_bytes: bytes = base64.b64decode(base64_data)
    else:
        async with httpx.AsyncClient() as http_client:
            bg_resp = await http_client.get(bg_result["image_url"], timeout=30.0)
            bg_resp.raise_for_status()
            bg_bytes: bytes = bg_resp.content

    # 5. Composite product onto background
    logger.debug("Compositing product with shadow...")
    try:
        final_bytes: bytes = await bg_removal_service.composite_with_shadow(
            product_png_bytes=no_bg_bytes,
            background_bytes=bg_bytes,
            scale_factor=scale_factor,
            offset_x_ratio=0.5,  # Center X
            offset_y_ratio=offset_y_ratio,
            add_shadow=True,
            shadow_profile=composite_profile,
        )
    except Exception as e:
        logger.error(f"Compositing failed for product scene: {e}")
        raise RuntimeError(
            f"Gagal menggabungkan produk dengan background baru. Error: {str(e)}"
        )

    logger.info("Product scene generation complete")
    return final_bytes

