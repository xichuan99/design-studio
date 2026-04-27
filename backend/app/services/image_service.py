"""
Image generation service using Fal.ai SDXL/Flux with IP-Adapter for style transfer.
Generates background images (no text) for the design tool.
"""

from __future__ import annotations
import os
import fal_client
import logging
from app.core.ai_models import (
    FAL_IMAGE_BRIA_FIBO_EDIT,
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


# ─────────────────────────────────────────────────────────────────────────────
# gpt-image-2 helpers (ultra quality, via fal-ai/gpt-image-2)
# Note: gpt-image-2 does NOT support negative_prompt / guidance_scale / steps.
# ─────────────────────────────────────────────────────────────────────────────

# Map our internal resolution dicts → fal.ai gpt-image-2 preset names
_GPT2_SIZE_PRESETS = {
    (1024, 1024): "square_hd",
    (512, 512): "square",
    (768, 1024): "portrait_4_3",
    (576, 1024): "portrait_16_9",
    (1024, 768): "landscape_4_3",
    (1024, 576): "landscape_16_9",
}


def _resolution_to_gpt2_size(width: int, height: int) -> dict | str:
    """Convert pixel resolution to a gpt-image-2 image_size value."""
    preset = _GPT2_SIZE_PRESETS.get((width, height))
    if preset:
        return preset
    # Custom dimensions — both must be multiples of 16
    w = max(16, (width // 16) * 16)
    h = max(16, (height // 16) * 16)
    return {"width": w, "height": h}


def build_gpt2_text_to_image_args(
    prompt: str,
    width: int = 1024,
    height: int = 1024,
    num_images: int = 1,
    output_format: str = "png",
) -> dict:
    """Build fal_client arguments for fal-ai/gpt-image-2 text-to-image."""
    return {
        "prompt": prompt,
        "image_size": _resolution_to_gpt2_size(width, height),
        "quality": "high",
        "num_images": num_images,
        "output_format": output_format,
    }


def build_gpt2_image_edit_args(
    prompt: str,
    image_urls: list[str],
    mask_image_url: str | None = None,
    quality: str = "high",
) -> dict:
    """Build fal_client arguments for fal-ai/gpt-image-2/image-to-image editing."""
    args: dict = {
        "prompt": prompt,
        "image_urls": image_urls,
        "quality": quality,
    }
    if mask_image_url:
        args["mask_image_url"] = mask_image_url
    return args


def build_background_swap_ultra_prompt(prompt: str) -> str:
    """Build a constrained prompt tuned for gpt-image-2 background replacement."""
    base_prompt = (prompt or "").strip()
    return (
        f"Professional product photography background replacement, {base_prompt}, "
        "ultra-detailed, photorealistic, seamless edge blending, "
        "natural lighting continuity, clean background details, "
        "keep foreground object unchanged, background-only edit focused on requested visual elements, "
        "no random text, no blurry letters, no gibberish typography, "
        "no letters, no words, no signage, no labels, no numbers, no symbols, "
        "no watermark, no logo"
    )


def _is_not_found_endpoint_error(exc: Exception) -> bool:
    """Return True when fal endpoint path/model is unavailable (404/path not found)."""
    msg = str(exc).lower()
    return (
        "path /image-to-image not found" in msg
        or "not found" in msg
        or "404" in msg
        or "model not found" in msg
    )


async def run_gpt2_image_edit(args: dict) -> dict:
    """
    Run gpt-image-2 image editing with endpoint fallbacks.

    Some fal deployments use different endpoint ids (e.g. `/edit` vs `/image-to-image`).
    We try the configured model first, then known alternatives.
    """
    from app.core.ai_models import FAL_IMAGE_GPT2_IMAGE_TO_IMAGE

    endpoint_candidates = [
        FAL_IMAGE_GPT2_IMAGE_TO_IMAGE,
        "openai/gpt-image-2/edit",
        "fal-ai/gpt-image-2/edit",
        "openai/gpt-image-2/image-to-image",
        "fal-ai/gpt-image-2/image-to-image",
    ]

    tried: set[str] = set()
    last_error: Exception | None = None

    for endpoint_id in endpoint_candidates:
        if endpoint_id in tried:
            continue
        tried.add(endpoint_id)

        try:
            return await fal_client.run_async(endpoint_id, arguments=args)
        except Exception as exc:
            last_error = exc
            if _is_not_found_endpoint_error(exc):
                logger.warning("gpt-image-2 edit endpoint unavailable: %s (%s)", endpoint_id, exc)
                continue
            raise

    if last_error:
        raise last_error
    raise RuntimeError("No gpt-image-2 editing endpoint candidates available")


def build_bria_fibo_edit_args(
    instruction: str,
    image_url: str,
    mask_url: str | None = None,
    seed: int | None = None,
) -> dict:
    """Build fal_client arguments for bria/fibo-edit/edit."""
    args: dict = {
        "instruction": instruction,
        "image_url": image_url,
    }
    if mask_url:
        args["mask_url"] = mask_url
    if seed is not None:
        args["seed"] = seed
    return args


def _extract_image_url(result: dict) -> str | None:
    """Extract an output image URL from heterogeneous partner response formats."""
    if not isinstance(result, dict):
        return None

    direct_keys = ("url", "image_url", "result_url", "output_url", "after_url")
    for key in direct_keys:
        value = result.get(key)
        if isinstance(value, str) and value:
            return value

    images = result.get("images")
    if isinstance(images, list) and images:
        for image in reversed(images):
            if isinstance(image, dict):
                url = image.get("url") or image.get("image_url")
                if isinstance(url, str) and url:
                    return url

    nested_keys = ("image", "output", "result", "after")
    for key in nested_keys:
        value = result.get(key)
        if isinstance(value, dict):
            nested_url = _extract_image_url(value)
            if nested_url:
                return nested_url

    return None


async def run_bria_fibo_edit(args: dict) -> dict:
    """Run BRIA FIBO image edit with endpoint fallback and normalized output."""
    endpoint_candidates = [
        FAL_IMAGE_BRIA_FIBO_EDIT,
        "bria/fibo-edit/edit",
    ]

    tried: set[str] = set()
    last_error: Exception | None = None

    for endpoint_id in endpoint_candidates:
        if endpoint_id in tried:
            continue
        tried.add(endpoint_id)

        try:
            result = await fal_client.run_async(endpoint_id, arguments=args)
            normalized_url = _extract_image_url(result)
            if not normalized_url:
                raise RuntimeError("bria/fibo-edit/edit returned no output image URL")
            return {
                "url": normalized_url,
                "raw": result,
            }
        except Exception as exc:
            last_error = exc
            if _is_not_found_endpoint_error(exc):
                logger.warning("bria fibo edit endpoint unavailable: %s (%s)", endpoint_id, exc)
                continue
            raise

    if last_error:
        raise last_error
    raise RuntimeError("No bria fibo edit endpoint candidates available")


async def generate_background_ultra(
    visual_prompt: str,
    aspect_ratio: str = "1:1",
) -> dict:
    """
    Generate a background image using gpt-image-2 (ultra quality).

    Uses the same FAL_KEY as standard generation — no additional API key needed.
    """
    from app.core.ai_models import FAL_IMAGE_GPT2_TEXT_TO_IMAGE

    if not settings.FAL_KEY:
        raise ValueError("FAL_KEY is missing from environment")

    os.environ["FAL_KEY"] = settings.FAL_KEY

    resolution = ASPECT_RATIO_MAP.get(aspect_ratio, ASPECT_RATIO_MAP["1:1"])
    fal_args = build_gpt2_text_to_image_args(
        prompt=visual_prompt,
        width=resolution["width"],
        height=resolution["height"],
    )

    try:
        result = await fal_client.run_async(FAL_IMAGE_GPT2_TEXT_TO_IMAGE, arguments=fal_args)
    except Exception as e:
        logger.error(f"gpt-image-2 generation failed: {e}")
        raise

    images = result.get("images", [])
    if not images:
        raise RuntimeError("gpt-image-2 returned no images")

    image_data = images[0]
    return {
        "image_url": image_data["url"],
        "width": image_data.get("width", resolution["width"]),
        "height": image_data.get("height", resolution["height"]),
        "seed": result.get("seed"),
        "content_type": image_data.get("content_type", "image/png"),
    }

