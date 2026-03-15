"""Service for applying watermarks (logos or text) to images."""

import io
from PIL import Image, ImageEnhance

# Constants for watermark positions
POSITIONS = ["bottom-right", "bottom-left", "top-right", "top-left", "center", "tiled"]


async def apply_watermark(
    base_image_bytes: bytes,
    watermark_bytes: bytes,
    position: str = "bottom-right",
    opacity: float = 0.5,
    scale: float = 0.2,  # Watermark max size as a percentage of base image width/height
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
    if position not in POSITIONS:
        position = "bottom-right"

    # Ensure opacity is within bounds
    opacity = max(0.0, min(1.0, float(opacity)))

    # Ensure scale is reasonable (0.05 to 1.0)
    scale = max(0.05, min(1.0, float(scale)))

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

        # 1. Resize the watermark based on the base image dimensions and scale factor
        base_w, base_h = base_img.size
        wm_w, wm_h = watermark_img.size

        # Calculate target size (bound by scale * base_dimension)
        target_wm_w = int(base_w * scale)
        target_wm_h = int(base_h * scale)

        # Maintain aspect ratio for watermark
        ratio = min(target_wm_w / wm_w, target_wm_h / wm_h)
        new_wm_w = int(wm_w * ratio)
        new_wm_h = int(wm_h * ratio)

        watermark_img = watermark_img.resize(
            (new_wm_w, new_wm_h), Image.Resampling.LANCZOS
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

            transparent_layer.paste(watermark_img, (x, y), mask=watermark_img)

        # 4. Composite the layers together
        final_img = Image.alpha_composite(base_img, transparent_layer)

        # 5. Convert back to RGB for JPEG saving (drops alpha, but visual composite is baked in)
        final_img = final_img.convert("RGB")

        # Save to bytes
        img_byte_arr = io.BytesIO()
        final_img.save(img_byte_arr, format="JPEG", quality=90)
        return img_byte_arr.getvalue()

    except Exception as e:
        import logging

        logging.error(f"Failed to apply watermark: {str(e)}")
        raise e
