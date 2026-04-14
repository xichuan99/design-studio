"""Service for outpainting (expanding) an image using Fal.ai."""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

from app.core.exceptions import AppException
import fal_client


MAX_DIRECTIONAL_EXPAND_PIXELS = 700


async def outpaint_image(
    image_url: str,
    direction: str = None,
    pixels: int = None,
    target_width: int = None,
    target_height: int = None,
    prompt: Optional[str] = None,
) -> dict:
    """
    Outpaints (expands) an image using the fal-ai/image-apps-v2/outpaint model.
    Support either directional expansion (left/right/top/bottom) OR target dimensions.

    Args:
        image_url (str): URL of the base image.
        direction (str, optional): Direction to expand ("left", "right", "top", "bottom"). Required if target_dims aren't provided. Defaults to None.
        pixels (int, optional): Number of pixels to expand. Required if direction is provided. Defaults to None.
        target_width (int, optional): Desired target width. Used instead of direction/pixels. Defaults to None.
        target_height (int, optional): Desired target height. Used instead of direction/pixels. Defaults to None.
        prompt (Optional[str], optional): Optional prompt to describe the expanded content. Defaults to None.

    Returns:
        dict: A dictionary containing the 'url', 'width', and 'height' of the processed image.

    Raises:
        ValueError: If neither direction/pixels nor target_width/target_height are provided, or if an invalid direction is given.
        HTTPException: If the Fal.ai service fails or returns an invalid output.
    """
    try:
        arguments = {"image_url": image_url, "output_format": "jpeg"}

        if prompt:
            arguments["prompt"] = prompt

        # Support either discrete directions OR target dimensions (e.g., from resize tool)
        if direction and pixels:
            normalized_pixels = max(1, min(int(pixels), MAX_DIRECTIONAL_EXPAND_PIXELS))
            if normalized_pixels != pixels:
                logger.warning(
                    "Clamping outpaint pixels from %s to %s for provider compatibility",
                    pixels,
                    normalized_pixels,
                )
            if direction == "left":
                arguments["expand_left"] = normalized_pixels
            elif direction == "right":
                arguments["expand_right"] = normalized_pixels
            elif direction == "top":
                arguments["expand_top"] = normalized_pixels
            elif direction == "bottom":
                arguments["expand_bottom"] = normalized_pixels
            else:
                raise ValueError(f"Invalid direction: {direction}")
        elif target_width and target_height:
            arguments["target_width"] = target_width
            arguments["target_height"] = target_height
        else:
            raise ValueError(
                "Either direction/pixels OR target_width/target_height must be provided"
            )

        # We use fal-ai/image-apps-v2/outpaint for Generative Expand
        result = await fal_client.run_async(
            "fal-ai/image-apps-v2/outpaint", arguments=arguments
        )

        # Result structure usually contains 'images' or 'image'
        if "images" in result and len(result["images"]) > 0:
            image_data = result["images"][0]
        elif "image" in result:
            image_data = result["image"]
        else:
            # Fallback looking for direct url
            image_data = {"url": result.get("image_url") or result.get("url")}

        if not image_data or not image_data.get("url"):
            raise AppException(
                status_code=500, detail="Failed to get valid output from model"
            )

        return {
            "url": image_data["url"],
            "width": image_data.get("width"),
            "height": image_data.get("height"),
        }

    except Exception as e:
        logger.exception("Error in outpaint_image")
        raise AppException(
            status_code=500, detail=f"Outpainting service error: {str(e)}"
        )

