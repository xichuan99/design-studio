"""
Image generation service using Fal.ai SDXL/Flux with IP-Adapter for style transfer.
Generates background images (no text) for the design tool.
"""

from __future__ import annotations
import os
import fal_client
import logging
from app.core.ai_models import (
    FAL_IMAGE_IMAGE_TO_IMAGE_PRIMARY,
    FAL_IMAGE_TEXT_TO_IMAGE_FALLBACK,
    FAL_IMAGE_TEXT_TO_IMAGE_PRIMARY,
)
from app.core.config import settings
from app.services.prompt_builder import PromptBuilder, STYLE_PRESETS, STYLE_SUFFIXES  # noqa: F401 – re-exported for backward compat

logger = logging.getLogger(__name__)

# Aspect ratio → pixel resolution mapping
ASPECT_RATIO_MAP = {
    "1:1": {"width": 1024, "height": 1024},
    "9:16": {"width": 768, "height": 1344},
    "16:9": {"width": 1344, "height": 768},
    "4:5": {"width": 896, "height": 1120},
}


async def generate_background(
    visual_prompt: str,
    reference_image_url: str | None = None,
    style: str = "auto",
    aspect_ratio: str = "1:1",
    integrated_text: bool = False,
    preserve_product: bool = False,
    seed: str | None = None,
) -> dict:
    """
    Generates a background image using Fal.ai.

    Args:
        visual_prompt (str): The image generation prompt (from LLM output).
        reference_image_url (str | None): Optional reference image for style transfer.
        style (str): Style preset key (auto, macro, cinematic, comic, infographic,
                     isometric_3d, product_hero, blueprint). Defaults to "auto".
        aspect_ratio (str): Target aspect ratio (1:1, 9:16, 16:9, 4:5). Defaults to "1:1".
        integrated_text (bool): If True, allow text in the generated image.
        preserve_product (bool): If True, add product identity preservation constraint
                                 for image-to-image redesign flows.

    Returns:
        dict: image_url, width, height, seed, content_type.

    Raises:
        ValueError: If the FAL_KEY environment variable is missing.
        RuntimeError: If Fal.ai returns no images.
    """
    if not settings.FAL_KEY:
        raise ValueError("FAL_KEY is missing from environment")

    # Set the key in the environment for fal_client
    os.environ["FAL_KEY"] = settings.FAL_KEY

    # Assemble the enhanced prompt via the modular PromptBuilder
    if integrated_text:
        # User wants text rendered into the image itself
        enhanced_prompt = PromptBuilder.build(
            visual_prompt=visual_prompt,
            style_key=style,
            text_instruction="high quality typography, readable text, clear lettering, professional graphic design",
            preserve_product=preserve_product,
        )
        actual_negative_prompt = PromptBuilder.build_negative_prompt(
            style_key=style,
            extra_negatives=["misspelled words", "random letters"],
        )
    else:
        # Standard: clean background, copy-space area, no text
        enhanced_prompt = PromptBuilder.build(
            visual_prompt=visual_prompt,
            style_key=style,
            text_instruction="copy space area for text overlay, empty background for product placement",
            preserve_product=preserve_product,
        )
        actual_negative_prompt = PromptBuilder.build_negative_prompt(style_key=style)

    resolution = ASPECT_RATIO_MAP.get(aspect_ratio, ASPECT_RATIO_MAP["1:1"])

    import asyncio

    # Choose model based on whether we have a reference image (image-to-image vs text-to-image)
    if reference_image_url:
        primary_model_id = FAL_IMAGE_IMAGE_TO_IMAGE_PRIMARY
    else:
        primary_model_id = FAL_IMAGE_TEXT_TO_IMAGE_PRIMARY

    max_retries = 3
    base_delay = 2.0
    result = None

    for attempt in range(max_retries):
        try:
            fal_args = {
                "prompt": enhanced_prompt,
                "image_size": resolution,
                "num_images": 1,
                "num_inference_steps": 28,
                "guidance_scale": 3.5,
                "negative_prompt": actual_negative_prompt,
            }
            if reference_image_url:
                fal_args["image_url"] = reference_image_url
                fal_args["strength"] = 0.70

            if seed:
                try:
                    fal_args["seed"] = int(seed)
                except ValueError:
                    pass

            result = await fal_client.run_async(primary_model_id, arguments=fal_args)
            break  # Success, exit retry loop
        except Exception as e:
            logger.warning(f"Fal.ai image generation failed on attempt {attempt + 1}: {e}")
            if attempt == max_retries - 1:
                # Fallback to faster, more robust model if pro fails completely
                if not reference_image_url:
                    fallback_model = FAL_IMAGE_TEXT_TO_IMAGE_FALLBACK
                    logger.warning(f"Attempting final fallback to {fallback_model}")
                    try:
                        result = await fal_client.run_async(
                            fallback_model,
                            arguments={
                                "prompt": enhanced_prompt,
                                "image_size": resolution,
                                "num_images": 1,
                            },
                        )
                        break
                    except Exception as fallback_err:
                        logger.error(f"Fallback model also failed: {fallback_err}")
                        raise e  # Raise original error
                else:
                    raise e

            # Exponential backoff
            await asyncio.sleep(base_delay * (2 ** attempt))

    # Extract the generated image info
    images = result.get("images", [])
    if not images:
        raise RuntimeError("Fal.ai returned no images")

    image_data = images[0]
    return {
        "image_url": image_data["url"],
        "width": image_data.get("width", resolution["width"]),
        "height": image_data.get("height", resolution["height"]),
        "seed": result.get("seed"),
        "content_type": image_data.get("content_type", "image/jpeg"),
    }

