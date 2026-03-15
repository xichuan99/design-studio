"""Service for orchestrating the generation of professional product scenes."""

import io
import logging
import httpx
from PIL import Image
from typing import Dict, Any

from app.services import bg_removal_service
from app.services.image_service import generate_background

logger = logging.getLogger(__name__)

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
    image_bytes: bytes, theme: str = "studio", aspect_ratio: str = "1:1"
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

    # 1. Background removal using existing service
    logger.debug("Removing background...")
    try:
        no_bg_bytes: bytes = await bg_removal_service.remove_background(image_bytes)
    except Exception as e:
        logger.error(f"Background removal failed for product scene: {e}")
        raise RuntimeError(f"Gagal menghapus background gambar asli. Pastikan foto produk cukup jelas. Error: {str(e)}")

    # Analyze if it's a closeup photo
    try:
        img = Image.open(io.BytesIO(no_bg_bytes))
        bbox = img.getbbox()
        scale_factor = 0.65
        
        if bbox:
            obj_w = bbox[2] - bbox[0]
            obj_h = bbox[3] - bbox[1]
            img_w, img_h = img.size
            
            area_ratio = (obj_w * obj_h) / (img_w * img_h)
            
            if area_ratio > 0.6 or (obj_w / img_w) > 0.8 or (obj_h / img_h) > 0.8:
                scale_factor = 0.85
                logger.info(f"Detected closeup product (area_ratio: {area_ratio:.2f}), increasing scale_factor to {scale_factor}")
    except Exception as e:
        logger.warning(f"Error analyzing image bounding box: {e}")
        scale_factor = 0.65


    # 2. Map theme to prompt
    theme_config = SCENE_THEMES.get(theme, SCENE_THEMES["studio"])

    # 3. Generate background with Fal.ai
    logger.debug(f"Generating background prompt: {theme_config['visual_prompt']}")
    bg_result: Dict[str, Any] = await generate_background(
        visual_prompt=theme_config["visual_prompt"],
        style=theme_config["style"],
        aspect_ratio=aspect_ratio,
        integrated_text=False,
    )

    # 4. Fetch the generated background image
    logger.debug("Downloading generated background...")
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
            scale_factor=scale_factor,  # Dynamically set based on closeup detection
            offset_x_ratio=0.5,  # Center X
            offset_y_ratio=0.55,  # Slightly lower Y
            add_shadow=True,
        )
    except Exception as e:
        logger.error(f"Compositing failed for product scene: {e}")
        raise RuntimeError(f"Gagal menggabungkan produk dengan background baru. Error: {str(e)}")

    logger.info("Product scene generation complete")
    return final_bytes
