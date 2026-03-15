"""Service for orchestrating the generation of professional product scenes."""

import logging
import httpx
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
    no_bg_bytes: bytes = await bg_removal_service.remove_background(image_bytes)

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
    final_bytes: bytes = await bg_removal_service.composite_with_shadow(
        product_png_bytes=no_bg_bytes,
        background_bytes=bg_bytes,
        scale_factor=0.65,  # Make product slightly smaller than BG swap
        offset_x_ratio=0.5,  # Center X
        offset_y_ratio=0.55,  # Slightly lower Y
        add_shadow=True,
    )

    logger.info("Product scene generation complete")
    return final_bytes
