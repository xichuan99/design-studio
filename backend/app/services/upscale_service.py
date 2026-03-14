import os
import fal_client
from typing import Dict, Any
from app.core.config import settings


async def upscale_image(image_url: str, scale: int = 2) -> Dict[str, Any]:
    """
    Upscales an image using fal-ai/aura-sr endpoint.
    Returns the result containing the upscaled image URL.
    """
    if not settings.FAL_KEY:
        raise ValueError("FAL_KEY is missing from environment")

    # Ensure fal_client has the key
    os.environ["FAL_KEY"] = settings.FAL_KEY

    # aura-sr accepts image_url and output_format
    # Other models like creative-upscaler might have different params,
    # but aura-sr is fast and works well for general images.

    # We will use "fal-ai/ccsr" or "fal-ai/aura-sr". We will try aura-sr first.
    # Actually, fal-ai/clarity-upscaler is another good one. Let's use fal-ai/ccsr for upscale or creative-upscaler if we want prompt.
    # We will use 'fal-ai/fast-lightning-sdxl-upscale' or equivalent.
    # For now, let's use fal-ai/aura-sr which is generally available.

    # If using fal-ai/esrgan:
    model_id = "fal-ai/esrgan"

    scale_param = scale if scale in [2, 4, 8] else 4

    result = await fal_client.run_async(
        model_id,
        arguments={
            "image_url": image_url,
            "scale": scale_param,
        },
    )

    # Result structure from esrgan is typically {"image": {"url": "...", "width": ..., "height": ..., ...}}
    # Check what fal returns
    image_data = result.get("image", {})
    if not image_data or not image_data.get("url"):
        raise RuntimeError("Upscale model returned invalid result")

    return {
        "url": image_data["url"],
        "width": image_data.get("width"),
        "height": image_data.get("height"),
        "content_type": image_data.get("content_type", "image/png"),
    }
