from __future__ import annotations
"""
Image generation service using Fal.ai SDXL/Flux with IP-Adapter for style transfer.
Generates background images (no text) for the design tool.
"""
import os
import fal_client
from app.core.config import settings

# Aspect ratio → pixel resolution mapping
ASPECT_RATIO_MAP = {
    "1:1": {"width": 1024, "height": 1024},
    "9:16": {"width": 768, "height": 1344},
    "16:9": {"width": 1344, "height": 768},
}

# Style preference → prompt suffix mapping
STYLE_SUFFIXES = {
    "bold": "bold vibrant colors, high contrast, eye-catching, dynamic composition",
    "minimalist": "clean minimal design, soft colors, lots of whitespace, simple elegant",
    "elegant": "luxury premium feel, gold accents, dark moody lighting, sophisticated",
    "playful": "fun colorful cartoon style, happy energetic vibe, bubbly shapes",
}

# Negative prompt to ensure no text is generated in the image
NEGATIVE_PROMPT = (
    "text, letters, words, numbers, watermark, signature, logo, "
    "blurry, low quality, deformed, ugly, bad anatomy"
)


async def generate_background(
    visual_prompt: str,
    reference_image_url: str | None = None,
    style: str = "bold",
    aspect_ratio: str = "1:1",
) -> dict:
    """
    Generates a background image using Fal.ai.

    Args:
        visual_prompt: The image generation prompt (from LLM output).
        reference_image_url: Optional reference image for style transfer.
        style: Style preference (bold, minimalist, elegant, playful).
        aspect_ratio: Target aspect ratio (1:1, 9:16, 16:9).

    Returns:
        dict with keys: image_url, width, height, seed
    """
    if not settings.FAL_KEY:
        raise ValueError("FAL_KEY is missing from environment")

    # Set the key in the environment for fal_client
    os.environ["FAL_KEY"] = settings.FAL_KEY

    # Enhance prompt with style suffix and copy-space instructions
    style_suffix = STYLE_SUFFIXES.get(style, STYLE_SUFFIXES["bold"])
    enhanced_prompt = (
        f"{visual_prompt}, {style_suffix}, "
        "professional graphic design background, copy space area for text overlay, "
        "no text, no letters, no words"
    )

    resolution = ASPECT_RATIO_MAP.get(aspect_ratio, ASPECT_RATIO_MAP["1:1"])

    # Choose model based on whether we have a reference image (image-to-image vs text-to-image)
    if reference_image_url:
        # Image-to-image with IP-Adapter for style transfer
        result = await fal_client.run_async(
            "fal-ai/flux/dev/image-to-image",
            arguments={
                "prompt": enhanced_prompt,
                "image_url": reference_image_url,
                "image_size": resolution,
                "num_images": 1,
                "strength": 0.70,  # How much to deviate from reference (0=identical, 1=ignore)
                "num_inference_steps": 28,
                "guidance_scale": 3.5,
                "negative_prompt": NEGATIVE_PROMPT,
            },
        )
    else:
        # Text-to-image generation (no reference)
        result = await fal_client.run_async(
            "fal-ai/flux/dev",
            arguments={
                "prompt": enhanced_prompt,
                "image_size": resolution,
                "num_images": 1,
                "num_inference_steps": 28,
                "guidance_scale": 3.5,
                "negative_prompt": NEGATIVE_PROMPT,
            },
        )

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
