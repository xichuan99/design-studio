"""Service for applying watermarks (logos or text) to images."""

import io
from typing import Optional

from PIL import Image, ImageDraw, ImageEnhance, ImageStat

# Constants for watermark positions
POSITIONS = ["bottom-right", "bottom-left", "top-right", "top-left", "center", "tiled"]
VISIBILITY_PRESETS = {
    "subtle": {"min_opacity": 0.25, "min_scale": 0.12, "backdrop_alpha": 64},
    "balanced": {"min_opacity": 0.40, "min_scale": 0.16, "backdrop_alpha": 86},
    "protective": {"min_opacity": 0.58, "min_scale": 0.22, "backdrop_alpha": 110},
}


def _normalize_watermark_settings(position: str, opacity: float, scale: float) -> tuple[str, float, float]:
    normalized_position = position if position in POSITIONS else "bottom-right"

    normalized_opacity = max(0.0, min(1.0, float(opacity)))
    normalized_scale = max(0.05, min(1.0, float(scale)))

    # Keep watermark legible for single-placement mode.
    if normalized_position != "tiled":
        normalized_opacity = max(0.25, normalized_opacity)
        normalized_scale = max(0.12, normalized_scale)

    return normalized_position, normalized_opacity, normalized_scale


def _resolve_visibility_preset(preset: str) -> dict:
    return VISIBILITY_PRESETS.get(str(preset or "balanced").strip().lower(), VISIBILITY_PRESETS["balanced"])


def _average_luminance(region: Image.Image, mask: Optional[Image.Image] = None) -> float:
    stat = ImageStat.Stat(region.convert("L"), mask=mask)
    if not stat.mean:
        return 127.0
    return float(stat.mean[0])


def _trim_transparent_padding(watermark_img: Image.Image) -> Image.Image:
    """Trim fully transparent borders so sizing and backdrop follow visible logo content."""
    alpha = watermark_img.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError("Watermark image is fully transparent")
    return watermark_img.crop(bbox)


async def apply_watermark(
    base_image_bytes: bytes,
    watermark_bytes: bytes,
    position: str = "bottom-right",
    opacity: float = 0.5,
    scale: float = 0.2,  # Watermark max size as a percentage of base image width/height
    visibility_preset: str = "balanced",
    padding_ratio: float = 0.05,  # Padding as a percentage of base image dimensions
) -> bytes:
    """
    Applies a watermark (logo or text image) over a base image.

    Args:
        base_image_bytes (bytes): The original product image.
        watermark_bytes (bytes): The logo or watermark image (supports PNG with transparency).
        position (str): Where to place the watermark ("bottom-right", "bottom-left", "top-right", "top-left", "center", "tiled"). Defaults to "bottom-right".
        opacity (float): Transparency level from 0.0 (invisible) to 1.0 (fully opaque). Defaults to 0.5.
        scale (float): The size of the watermark relative to the base image (0.1 to 1.0). Defaults to 0.2.
        padding_ratio (float): Margin from the edge of the image. Defaults to 0.05.

    Returns:
        bytes: Raw bytes of the composited image (always JPEG to save space, but preserves visual transparency of watermark).

    Raises:
        Exception: If opening, resizing, pasting, or saving the images fails.
    """
    position, opacity, scale = _normalize_watermark_settings(position, opacity, scale)
    profile = _resolve_visibility_preset(visibility_preset)

    try:
        # Load images
        base_img = Image.open(io.BytesIO(base_image_bytes))
        watermark_img = Image.open(io.BytesIO(watermark_bytes))

        # Convert base to RGBA to support alpha compositing safely, even if outputting to JPEG
        if base_img.mode != "RGBA":
            base_img = base_img.convert("RGBA")

        # Convert watermark to RGBA to ensure it has an alpha channel
        if watermark_img.mode != "RGBA":
            watermark_img = watermark_img.convert("RGBA")

        watermark_img = _trim_transparent_padding(watermark_img)

        # 1. Resize the watermark based on the base image dimensions and scale factor
        base_w, base_h = base_img.size
        wm_w, wm_h = watermark_img.size

        if position != "tiled":
            opacity = max(opacity, profile["min_opacity"])
            scale = max(scale, profile["min_scale"])

        # Calculate target size from base width so typical logos remain visible.
        target_wm_w = int(base_w * scale)
        ratio = target_wm_w / max(wm_w, 1)
        new_wm_w = int(wm_w * ratio)
        new_wm_h = int(wm_h * ratio)

        # Keep text logo readable on large images.
        if position != "tiled":
            min_wm_w = max(72, int(base_w * 0.08))
            min_wm_h = max(28, int(base_h * 0.05))
            if new_wm_w < min_wm_w:
                ratio = min_wm_w / max(new_wm_w, 1)
                new_wm_w = min_wm_w
                new_wm_h = int(new_wm_h * ratio)
            if new_wm_h < min_wm_h:
                ratio = min_wm_h / max(new_wm_h, 1)
                new_wm_h = min_wm_h
                new_wm_w = int(new_wm_w * ratio)

        # Prevent watermark from being overly tall.
        max_wm_h = int(base_h * 0.35)
        if new_wm_h > max_wm_h:
            height_ratio = max_wm_h / max(new_wm_h, 1)
            new_wm_w = int(new_wm_w * height_ratio)
            new_wm_h = max_wm_h

        watermark_img = watermark_img.resize(
            (max(new_wm_w, 1), max(new_wm_h, 1)), Image.Resampling.LANCZOS
        )

        # 2. Apply Opacity
        if opacity < 1.0:
            # Get alpha channel of the resized watermark
            alpha = watermark_img.split()[3]
            # Reduce alpha based on opacity
            alpha = ImageEnhance.Brightness(alpha).enhance(opacity)
            # Put modified alpha back
            watermark_img.putalpha(alpha)

        # Create a blank transparent layer the size of the base image
        transparent_layer = Image.new("RGBA", base_img.size, (0, 0, 0, 0))

        # Calculate padding
        pad_x = int(base_w * padding_ratio)
        pad_y = int(base_h * padding_ratio)

        # 3. Handle specific positions
        if position == "tiled":
            # Tile the watermark across the entire image
            for y in range(0, base_h, new_wm_h + pad_y):
                for x in range(0, base_w, new_wm_w + pad_x):
                    transparent_layer.paste(watermark_img, (x, y), mask=watermark_img)
        else:
            # Single placement logic
            x = pad_x
            y = pad_y

            if position == "bottom-right":
                x = base_w - new_wm_w - pad_x
                y = base_h - new_wm_h - pad_y
            elif position == "bottom-left":
                x = pad_x
                y = base_h - new_wm_h - pad_y
            elif position == "top-right":
                x = base_w - new_wm_w - pad_x
                y = pad_y
            elif position == "top-left":
                x = pad_x
                y = pad_y
            elif position == "center":
                x = (base_w - new_wm_w) // 2
                y = (base_h - new_wm_h) // 2

            # Add adaptive backdrop for contrast in single-placement mode.
            backdrop_pad = max(4, int(min(base_w, base_h) * 0.008))
            backdrop_pad = min(backdrop_pad, max(6, int(min(new_wm_w, new_wm_h) * 0.18)))
            crop_left = max(0, x)
            crop_top = max(0, y)
            crop_right = min(base_w, x + new_wm_w)
            crop_bottom = min(base_h, y + new_wm_h)
            region = base_img.crop((crop_left, crop_top, crop_right, crop_bottom))
            luminance = _average_luminance(region, mask=watermark_img.getchannel("A"))

            if luminance >= 145:
                backdrop_rgb = (0, 0, 0)
            else:
                backdrop_rgb = (255, 255, 255)

            draw = ImageDraw.Draw(transparent_layer)
            draw.rounded_rectangle(
                (
                    x - backdrop_pad,
                    y - backdrop_pad,
                    x + new_wm_w + backdrop_pad,
                    y + new_wm_h + backdrop_pad,
                ),
                radius=max(8, backdrop_pad + 4),
                fill=(*backdrop_rgb, profile["backdrop_alpha"]),
            )

            transparent_layer.paste(watermark_img, (x, y), mask=watermark_img)

        # 4. Composite the layers together
        final_img = Image.alpha_composite(base_img, transparent_layer)

        # 5. Convert back to RGB for JPEG saving (drops alpha, but visual composite is baked in)
        final_img = final_img.convert("RGB")

        # Save to bytes
        img_byte_arr = io.BytesIO()
        final_img.save(img_byte_arr, format="JPEG", quality=95, optimize=True, progressive=True)
        return img_byte_arr.getvalue()

    except Exception as e:
        import logging

        logging.error(f"Failed to apply watermark: {str(e)}")
        raise e


async def apply_logo_overlay(
    base_image_bytes: bytes,
    logo_bytes: bytes,
    x: int,
    y: int,
    width: int,
    height: int,
    opacity: float = 1.0,
) -> bytes:
    """
    Applies a logo watermark at specific exact coordinates and scale.
    """
    try:
        base_img = Image.open(io.BytesIO(base_image_bytes))
        watermark_img = Image.open(io.BytesIO(logo_bytes))

        if base_img.mode != "RGBA":
            base_img = base_img.convert("RGBA")
        if watermark_img.mode != "RGBA":
            watermark_img = watermark_img.convert("RGBA")

        watermark_img = watermark_img.resize((width, height), Image.Resampling.LANCZOS)

        if opacity < 1.0:
            alpha = watermark_img.split()[3]
            alpha = ImageEnhance.Brightness(alpha).enhance(opacity)
            watermark_img.putalpha(alpha)

        transparent_layer = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
        transparent_layer.paste(watermark_img, (x, y), mask=watermark_img)

        final_img = Image.alpha_composite(base_img, transparent_layer)
        final_img = final_img.convert("RGB")

        img_byte_arr = io.BytesIO()
        final_img.save(img_byte_arr, format="JPEG", quality=95)
        return img_byte_arr.getvalue()
    except Exception as e:
        import logging

        logging.error(f"Failed to apply logo overlay: {str(e)}")
        raise e

