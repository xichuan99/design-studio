"""Magic text LLM services."""

import json
from typing import Optional
from google.genai import types
from app.core.ai_models import LLM_VISION_FALLBACK, LLM_VISION_PRIMARY
from app.core.config import settings

from app.services.llm_prompts import MAGIC_TEXT_SYSTEM
from app.services.llm_client import get_genai_client, call_gemini_with_fallback
from app.services.llm_json_utils import parse_llm_json


async def generate_magic_text_layout(
    text: str,
    image_base64: str,
    style_hint: Optional[str] = None,
    canvas_width: int = 1024,
    canvas_height: int = 1024,
    brand_colors: Optional[list[str]] = None,
) -> dict:
    """
    Generates a layout for text overlaid on a specific image.

    Args:
        text (str): The text to overlay.
        image_base64 (str): The base64-encoded image to analyze.
        style_hint (Optional[str]): A hint for the desired text style. Defaults to None.
        canvas_width (int): The width of the target canvas. Defaults to 1024.
        canvas_height (int): The height of the target canvas. Defaults to 1024.
        brand_colors (Optional[list[str]]): List of brand hex colors to incorporate. Defaults to None.

    Returns:
        dict: A dictionary describing the layout of the text elements.

    Raises:
        Exception: If the LLM call or base64 decoding fails.
    """
    from app.schemas.design import MagicTextResponse
    import base64

    if not settings.OPENROUTER_API_KEY:
        import logging

        logging.warning("OPENROUTER_API_KEY is missing – returning mock magic text")
        return MagicTextResponse(
            elements=[
                {
                    "text": text.split()[0] if text else "PROMO",
                    "font_family": "Montserrat",
                    "font_size": 72,
                    "font_weight": 700,
                    "color": "#FFFFFF",
                    "align": "center",
                    "x": 0.5,
                    "y": 0.3,
                    "letter_spacing": 0.0,
                    "line_height": 1.1,
                    "text_transform": "uppercase",
                    "text_shadow": "2px 2px 8px rgba(0,0,0,0.6)",
                    "opacity": 1.0,
                    "rotation": 0.0,
                }
            ]
        ).model_dump()

    client = get_genai_client()

    # Pre-process base64 if it has data URI prefix
    if "," in image_base64:
        image_base64 = image_base64.split(",")[1]

    image_bytes = base64.b64decode(image_base64)

    # Inject style hint and canvas size context
    aspect_context = f"\nCanvas dimensions: {canvas_width}x{canvas_height}px. Place text within the safe area proportionally.\nFor portrait (height > width): prefer horizontal text bands, stack vertically.\nFor landscape (width > height): spread text horizontally, use left or right thirds."
    style_context = (
        f"\nUSER STYLE PREFERENCE: [{style_hint}]\nAdapt your font choices, colors, and layout to strongly match this style vibe."
        if style_hint
        else ""
    )

    brand_colors_instruction = ""
    if brand_colors:
        brand_colors_instruction = f"""
        10. BRAND COLORS:
           - The user has established specific brand colors: {json.dumps(brand_colors)}.
           - You MUST strongly prefer using these exact colors (or variations of them) for text `color`, `background_color`, or `shadowColor` if they contrast well against the image background.
        """

    context_string = aspect_context + style_context + brand_colors_instruction

    response = call_gemini_with_fallback(
        client=client,
        primary_model=LLM_VISION_PRIMARY,
        fallback_model=LLM_VISION_FALLBACK,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
            f"Here is the text I want to place on this image: {text}{context_string}",
        ],
        config=types.GenerateContentConfig(
            system_instruction=MAGIC_TEXT_SYSTEM,
            response_mime_type="application/json",
            response_schema=MagicTextResponse,
        ),
    )

    return parse_llm_json(response.text)

