"""Service for generating decorative text banners."""

import os
import logging
import httpx
import uuid
import fal_client

from app.core.ai_models import (
    FAL_BANNER_DRAFT,
    FAL_BANNER_STANDARD,
    XAI_IMAGE_GENERATION,
)
from app.core.config import settings
from app.services.bg_removal_service import remove_background
from app.services.storage_service import upload_image
from app.services.llm_client import generate_image_xai

logger = logging.getLogger(__name__)

# Style prompts for banners
STYLE_PROMPTS = {
    "ribbon": "A beautiful, floating decorative ribbon banner, {color_hint} color palette, elegant curves, centered, flat lighting",
    "badge": "A circular promotional badge/sticker, {color_hint} color scheme, modern vector graphic style, sharp edges, centered",
    "cloud": "A soft, fluffy cloud-shaped dialogue bubble, {color_hint} tint, cute and friendly style, centered, clean background",
    "star": "A dynamic starburst or explosion shape, {color_hint} colors, energetic sale tag style, centered, high contrast",
    "banner": "A classic rectangular scroll banner with folded ends, {color_hint} theme, elegant and clean, centered",
}


async def generate_text_banner(
    text: str,
    style: str = "ribbon",
    color_hint: str = "colorful",
    quality: str = "standard",
) -> dict:
    """
    Generates a decorative banner containing text, removes the background,
    and uploads it to storage.

    Quality tiers:
    - draft:    fal-ai/flux/schnell (fast, cheap)
    - standard: fal-ai/flux/dev (good quality)
    - premium:  grok-imagine-image (best text rendering)

    Args:
        text (str): The text to display on the banner.
        style (str): The visual style of the banner (e.g., "ribbon", "badge"). Defaults to "ribbon".
        color_hint (str): A hint for the color palette. Defaults to "colorful".
        quality (str): Quality tier for the generation ("draft", "standard", "premium"). Defaults to "standard".

    Returns:
        dict: A dictionary containing the generated image's "url", "width", and "height".

    Raises:
        ValueError: If a required API key (GEMINI_API_KEY or FAL_KEY) is missing.
        RuntimeError: If the external API fails to return a valid image.
        Exception: For any other errors during the generation or upload process.
    """
    try:
        # 1. Prepare Prompt — support both preset keys and free-text
        if style in STYLE_PROMPTS:
            base_prompt = STYLE_PROMPTS[style].replace("{color_hint}", color_hint)
        else:
            # Treat as free-text creative description
            base_prompt = (
                f"{style}, {color_hint} color palette, centered, clean composition"
            )

        # Add text instructions
        prompt = (
            f'{base_prompt}. '
            f'The graphic MUST contain the exact text: "{text}" written boldly and legibly. '
            "Do not paraphrase, translate, summarize, or add extra promotional words that are not present in the provided text. "
            "If the provided text is non-promotional, keep it non-promotional. "
            "Clean solid white background behind the object for easy extraction."
        )

        banner_url = None

        # 2. Generate Image based on quality
        if quality == "premium":
            # Use xAI (Grok) for high fidelity text rendering
            if not settings.XAI_API_KEY:
                raise ValueError(
                    "XAI_API_KEY is not configured for premium generation"
                )

            import asyncio
            loop = asyncio.get_running_loop()

            def run_xai():
                return generate_image_xai(
                    model_id=XAI_IMAGE_GENERATION,
                    prompt=prompt,
                    aspect_ratio="1:1"
                )

            response = await loop.run_in_executor(None, run_xai)

            if not response:
                raise RuntimeError("xAI API returned no response")

            # Check if we got bytes or a URL
            img_obj = response.generated_images[0].image
            if hasattr(img_obj, "image_bytes") and img_obj.image_bytes:
                image_bytes_data = img_obj.image_bytes
                temp_id = str(uuid.uuid4())[:8]
                banner_url = await upload_image(
                    image_bytes_data,
                    content_type="image/jpeg",
                    prefix=f"temp_xai_{temp_id}",
                )
            elif hasattr(img_obj, "url") and img_obj.url:
                banner_url = img_obj.url
            else:
                raise RuntimeError("xAI API returned no valid image data or URL")

        else:
            # Use Fal.ai (Flux)
            if not settings.FAL_KEY:
                raise ValueError("FAL_KEY is missing from environment")

            os.environ["FAL_KEY"] = settings.FAL_KEY

            model_id = (
                FAL_BANNER_DRAFT if quality == "draft" else FAL_BANNER_STANDARD
            )

            result = await fal_client.run_async(
                model_id,
                arguments={
                    "prompt": prompt,
                    "image_size": "square_hd" if quality == "standard" else "square",
                },
            )

            images = result.get("images", [])
            if not images or not images[0].get("url"):
                raise RuntimeError("Fal.ai returned no image URL")

            banner_url = images[0]["url"]

        # 3. Remove Background
        # We need to download the generated image first to pass bytes to remove_background
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(banner_url, timeout=30.0)
            resp.raise_for_status()
            image_bytes = resp.content

        # bg_removal_service takes bytes and returns bytes
        transparent_bytes = await remove_background(image_bytes)

        # 4. Upload Final Image
        final_id = str(uuid.uuid4())[:12]
        final_url = await upload_image(
            transparent_bytes, content_type="image/png", prefix=f"banners/{final_id}"
        )

        return {
            "url": final_url,
            "width": 1024,  # Approximate standard size
            "height": 1024,
        }

    except Exception as e:
        logger.exception(f"Failed to generate text banner: {str(e)}")
        raise

