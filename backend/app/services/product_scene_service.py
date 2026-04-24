"""Service for orchestrating the generation of professional product scenes."""

import io
import logging
import httpx
from PIL import Image
from typing import Dict, Any, Tuple, Optional

from app.services import bg_removal_service
from app.services.image_service import generate_background

logger = logging.getLogger(__name__)

_AUTO_PAD_RATIO = 0.15
_SPARSE_NORMALIZE_THRESHOLD = 0.38

_LIGHTING_BY_THEME = {
    "studio": "three-point studio lighting with key light from left-front and soft fill from right",
    "nature": "natural directional sunlight from upper-left with soft ambient bounce",
    "cafe": "warm window light from side-left with gentle interior ambient fill",
    "minimalist": "clean directional key light from right-front with crisp but controlled shadows",
    "kitchen": "bright morning key light from left with balanced overhead ambient illumination",
    "bathroom": "soft diffused spa lighting from front-left with gentle reflective highlights",
}

_PLACEMENT_HINT_BY_THEME = {
    "studio": "product sitting stably on display platform, grounded in lower third of frame",
    "nature": "product resting naturally on mossy ground surface, grounded in lower third of frame",
    "cafe": "food resting on wooden table surface, lower third of frame, slight overhead angle",
    "minimalist": "product placed on minimalist pedestal, grounded in lower third of frame",
    "kitchen": "product resting on kitchen counter top surface, grounded in lower third of frame",
    "bathroom": "product placed on marble tray surface, grounded in lower third of frame",
}


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
        "visual_prompt": "professional photography studio setup, infinite smooth backdrop gradient, premium product display platform, clean 8k resolution",
        "style": "minimalist",
    },
    "nature": {
        "visual_prompt": "outdoor nature setting, placed on mossy rock or wooden stump, surrounded by green leaves, dappled sunlight, shallow depth of field",
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


def _build_scene_prompt(theme: str, visual_prompt: str, include_placement: bool = False) -> str:
    """Compose an object-aware scene prompt with explicit lighting guidance."""
    lighting = _LIGHTING_BY_THEME.get(theme, _LIGHTING_BY_THEME["studio"])
    placement = ""
    if include_placement:
        hint = _PLACEMENT_HINT_BY_THEME.get(theme, "product placed in lower third of frame")
        placement = f", {hint}"
    return (
        f"{visual_prompt}, {lighting}{placement}, "
        "maintain realistic contact shadows under the subject, "
        "harmonize subject color temperature with environment, "
        "photorealistic commercial product photography"
    )


def _build_scene_prompt_lite(theme: str, visual_prompt: str) -> str:
    """Compose a lighter inpaint prompt for standard quality grounding."""
    lighting = _LIGHTING_BY_THEME.get(theme, _LIGHTING_BY_THEME["studio"])
    hint = _PLACEMENT_HINT_BY_THEME.get(theme, "product placed in lower third of frame")
    return (
        f"{visual_prompt}, {lighting}, {hint}, "
        "natural grounding and realistic surface contact, "
        "photorealistic product photography"
    )


def _reframe_subject_lower(
    original_bytes: bytes,
    no_bg_bytes: bytes,
    target_bottom_ratio: float = 0.80,
) -> tuple:
    """
    Shifts the subject downward within the same canvas so the inpaint model
    has more vertical space above to render scene context, and more space
    below for a natural ground surface.

    Returns originals unchanged when no shift is needed (subject already grounded).
    """
    try:
        orig_img = Image.open(io.BytesIO(original_bytes)).convert("RGB")
        no_bg_img = Image.open(io.BytesIO(no_bg_bytes)).convert("RGBA")
        nobg_w, nobg_h = no_bg_img.size

        if orig_img.size != no_bg_img.size:
            orig_img = orig_img.resize((nobg_w, nobg_h), Image.Resampling.LANCZOS)

        bbox = no_bg_img.getbbox()
        if not bbox:
            return original_bytes, no_bg_bytes

        sub_bottom = bbox[3]
        target_bottom_px = int(nobg_h * target_bottom_ratio)
        shift_y = target_bottom_px - sub_bottom

        if shift_y <= 5:
            # Subject is already grounded or below target — no reframe needed.
            return original_bytes, no_bg_bytes

        max_shift = nobg_h - sub_bottom - 5
        shift_y = min(shift_y, max_shift)
        if shift_y <= 5:
            return original_bytes, no_bg_bytes

        # Reframe the transparent mask: paste whole image shifted down.
        new_nobg = Image.new("RGBA", (nobg_w, nobg_h), (0, 0, 0, 0))
        new_nobg.paste(no_bg_img, (0, shift_y), no_bg_img)

        # Reframe the original: extract subject pixels (via alpha) on a neutral
        # gray canvas at the new shifted position.  Non-subject area will be
        # fully inpainted by the model, so the fill colour does not matter.
        alpha = no_bg_img.split()[-1]
        subject_rgba = Image.new("RGBA", (nobg_w, nobg_h), (0, 0, 0, 0))
        subject_rgba.paste(orig_img, (0, 0))
        subject_rgba.putalpha(alpha)

        shifted_subject = Image.new("RGBA", (nobg_w, nobg_h), (0, 0, 0, 0))
        shifted_subject.paste(subject_rgba, (0, shift_y), subject_rgba)

        new_orig = Image.new("RGB", (nobg_w, nobg_h), (210, 210, 210))
        new_orig.paste(
            shifted_subject.convert("RGB"), mask=shifted_subject.split()[-1]
        )

        nobg_buf = io.BytesIO()
        new_nobg.save(nobg_buf, format="PNG")
        orig_buf = io.BytesIO()
        new_orig.save(orig_buf, format="JPEG", quality=95)

        logger.debug(
            "Reframed subject lower by %dpx (target_bottom=%.0f%% of %dpx height)",
            shift_y,
            target_bottom_ratio * 100,
            nobg_h,
        )
        return orig_buf.getvalue(), nobg_buf.getvalue()

    except Exception as e:
        logger.warning("Subject reframe failed, using originals: %s", e)
        return original_bytes, no_bg_bytes


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

    # 2. Map theme to prompt
    theme_config = SCENE_THEMES.get(theme, SCENE_THEMES["studio"])
    scene_prompt_lite = _build_scene_prompt_lite(theme, theme_config["visual_prompt"])
    scene_prompt = _build_scene_prompt(
        theme, theme_config["visual_prompt"], include_placement=(quality == "ultra")
    )

    # 3. Ultra quality path: object-aware inpainting on the original context.
    if quality == "ultra":
        logger.debug("Using object-aware inpaint path for product_scene ultra")
        try:
            inpaint_orig, inpaint_mask = _reframe_subject_lower(
                processed_image_bytes, no_bg_bytes
            )
            result_bytes = await bg_removal_service.inpaint_background(
                original_bytes=inpaint_orig,
                transparent_png_bytes=inpaint_mask,
                prompt=scene_prompt,
            )
            logger.info("Product scene generation complete (object-aware ultra)")
            return result_bytes
        except Exception as e:
            logger.error(f"Object-aware inpaint failed for product scene ultra: {e}")
            raise RuntimeError(
                f"Gagal membuat product scene object-aware (ultra). Error: {str(e)}"
            )

    # 4. Standard quality path: try object-aware inpaint-lite first,
    #    then fall back to legacy background+composite on failure.
    logger.debug("Using hybrid inpaint-lite path for product_scene standard")
    try:
        inpaint_orig, inpaint_mask = _reframe_subject_lower(
            processed_image_bytes, no_bg_bytes
        )
        result_bytes = await bg_removal_service.inpaint_background(
            original_bytes=inpaint_orig,
            transparent_png_bytes=inpaint_mask,
            prompt=scene_prompt_lite,
        )
        logger.info("Product scene generation complete (hybrid inpaint-lite)")
        return result_bytes
    except Exception as e:
        logger.warning(
            "Hybrid inpaint-lite failed, falling back to legacy composite path: %s",
            e,
        )

    # 5. Fallback standard path: normalize sparse subject and compute adaptive placement.
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

    # 6. Fallback standard quality path: background generation + compositing.
    logger.debug(f"Generating background prompt: {scene_prompt} [quality={quality}]")
    bg_result: Dict[str, Any] = await generate_background(
        visual_prompt=scene_prompt,
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

