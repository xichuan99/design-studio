"""Service for inpainting (filling) specific areas of an image."""

import io
import logging
from typing import Optional

from PIL import Image, ImageFilter

logger = logging.getLogger(__name__)

from app.core.ai_models import FAL_BG_INPAINT_FILL
from app.core.exceptions import AppException
import fal_client

DEFAULT_INPAINT_PROMPT = "Improve visual quality"
DEFAULT_MAGIC_ERASER_PROMPT = "Remove the masked object and reconstruct the original background naturally"
MAGIC_ERASER_STRICT_GUARDRAILS = (
    "Preserve original scene, lighting, and perspective. "
    "Do not add new objects, people, masks, text, logos, labels, or extra decorations. "
    "Continue only nearby existing textures and surfaces in the masked region."
)
MAGIC_ERASER_CREATIVE_GUARDRAILS = (
    "Preserve original scene, lighting, and perspective. "
    "Prefer realistic continuity with nearby context and avoid jarring artifacts."
)


def build_magic_eraser_prompt(
    prompt: Optional[str] = None,
    *,
    strict_mode: bool = True,
) -> str:
    """Build a constrained prompt for object removal without introducing new elements."""
    base_prompt = (prompt or "").strip() or DEFAULT_MAGIC_ERASER_PROMPT
    guardrails = (
        MAGIC_ERASER_STRICT_GUARDRAILS
        if strict_mode
        else MAGIC_ERASER_CREATIVE_GUARDRAILS
    )
    return f"{base_prompt}. {guardrails}"


def prepare_magic_eraser_mask(
    mask_bytes: bytes,
    *,
    strict_mode: bool = True,
) -> bytes:
    """Improve mask usability by thresholding, dilation, and soft edge blending."""
    try:
        mask = Image.open(io.BytesIO(mask_bytes)).convert("L")
        mask = mask.point(lambda px: 255 if px > 10 else 0)
        dilation = 5 if strict_mode else 9
        blur_radius = 1.0 if strict_mode else 2.0
        # Strict mode keeps edits tighter to avoid replacing nearby context.
        mask = mask.filter(ImageFilter.MaxFilter(dilation))
        mask = mask.filter(ImageFilter.GaussianBlur(radius=blur_radius))

        out = io.BytesIO()
        mask.save(out, format="PNG")
        return out.getvalue()
    except Exception:
        return mask_bytes


def validate_mask_has_content(mask_bytes: bytes) -> bool:
    """Return True if the mask contains at least one white (>127) pixel."""
    try:
        mask = Image.open(io.BytesIO(mask_bytes)).convert("L")
        return any(px > 127 for px in mask.getdata())
    except Exception:
        return True  # Be permissive on parse failure — let downstream handle it


async def inpaint_image(
    image_url: str,
    mask_url: str,
    prompt: Optional[str] = None,
    *,
    magic_eraser_mode: bool = False,
    strict_mode: bool = True,
) -> dict:
    """
    Inpaints an image using the fal-ai/flux-pro/v1/fill model.

    Args:
        image_url (str): URL of the base image.
        mask_url (str): URL of the mask image (white=fill, black=keep).
        prompt (Optional[str]): Optional prompt to describe the desired fill content.
        magic_eraser_mode (bool): Enables prompt fallback optimized for object removal.

    Returns:
        dict: A dictionary containing the 'url', 'width', and 'height' of the processed image.

    Raises:
        HTTPException: If the inpainting service fails to return a valid output or encounters an error.
    """
    try:
        resolved_prompt = (prompt or "").strip()
        if not resolved_prompt:
            resolved_prompt = (
                DEFAULT_MAGIC_ERASER_PROMPT
                if magic_eraser_mode
                else DEFAULT_INPAINT_PROMPT
            )
        if magic_eraser_mode:
            resolved_prompt = build_magic_eraser_prompt(
                resolved_prompt,
                strict_mode=strict_mode,
            )

        arguments = {
            "image_url": image_url,
            "mask_url": mask_url,
            "sync_mode": True,
            "output_format": "jpeg",
            "prompt": resolved_prompt,
        }

        # We use fal-ai/flux-pro/v1/fill as it offers excellent inpainting capabilities
        result = await fal_client.run_async(
            FAL_BG_INPAINT_FILL, arguments=arguments
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
        logger.exception("Error in inpaint_image")
        raise AppException(
            status_code=500, detail=f"Inpainting service error: {str(e)}"
        )

