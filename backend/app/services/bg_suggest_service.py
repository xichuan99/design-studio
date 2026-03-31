"""
Service for AI-powered background suggestions for the Background Swap tool.

Pipeline:
  1. Upload product image to storage → get a public URL
  2. Call fal-ai/florence-2-large/caption (Vision model) → get a text description of the product
  3. Send that description to Gemini Flash (text-only, cheap) → generate 3 background suggestions in JSON

This hybrid approach is cost-effective: Florence-2 on fal.ai handles vision (~$0.001/req),
and Gemini only processes text (no image), which is far cheaper than Gemini Vision.
"""

import json
import logging
import uuid

import fal_client
from google.genai import types as genai_types

from app.core.config import settings
from app.services.storage_service import upload_image
from app.services.llm_client import get_genai_client

logger = logging.getLogger(__name__)


SUGGESTION_SYSTEM_PROMPT = """\
You are a professional product photographer and creative director.
You will receive a short description of a product/object (detected by a vision AI).
Your task is to suggest exactly 3 beautiful, aesthetically pleasing background settings for a product photo.

REQUIREMENTS:
1. Return exactly 3 suggestions.
2. Each suggestion must have:
   - "title": short Indonesian name (2-4 words, e.g. "Studio Minimalis", "Alam Terbuka")
   - "emoji": a single relevant emoji
   - "prompt": a detailed English prompt (30-50 words) for an AI image generator.
     The prompt must include: setting, lighting style, mood, surface material, depth of field.
     Always end with: "professional product photography, 8k, photorealistic"
3. Vary the styles — e.g. one studio, one nature/outdoor, one lifestyle/contextual.
4. Output MUST be valid JSON only, matching this schema:
{"suggestions": [{"title": "...", "emoji": "...", "prompt": "..."}, ...]}
"""


async def suggest_backgrounds(
    image_bytes: bytes, mime_type: str = "image/jpeg"
) -> dict:
    """
    Analyzes a product image and returns 3 AI-generated background suggestions.

    Args:
        image_bytes: Raw bytes of the product image.
        mime_type: MIME type of the image. Defaults to "image/jpeg".

    Returns:
        dict with key "suggestions" — a list of 3 dicts, each with
        "title" (str), "emoji" (str), and "prompt" (str).

    Raises:
        ValueError: If required API keys are missing.
        RuntimeError: If Florence-2 or Gemini fails to return a valid result.
    """
    if not settings.FAL_KEY:
        raise ValueError("FAL_KEY is missing from environment")
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is missing from environment")

    import os

    os.environ["FAL_KEY"] = settings.FAL_KEY

    # ─────────────────────────────────────────
    # Step 1: Upload image → get a public URL
    # ─────────────────────────────────────────
    temp_id = str(uuid.uuid4())[:8]
    temp_url = await upload_image(
        image_bytes,
        content_type=mime_type,
        prefix=f"temp_suggest_{temp_id}",
    )

    # ─────────────────────────────────────────
    # Step 2: Florence-2 vision → product description
    # ─────────────────────────────────────────
    product_description = "a product"  # safe fallback
    try:
        florence_result = await fal_client.run_async(
            "fal-ai/florence-2-large/caption",
            arguments={"image_url": temp_url},
        )
        # Florence-2 returns {"results": "A watch placed on..."}
        raw_caption = (
            florence_result.get("results") or florence_result.get("caption") or ""
        )
        if raw_caption and len(raw_caption) > 5:
            product_description = raw_caption.strip()
        logger.info(f"Florence-2 caption: {product_description[:100]}")
    except Exception:
        logger.warning(
            "Florence-2 caption failed, using fallback description", exc_info=True
        )

    # ─────────────────────────────────────────
    # Step 3: Gemini Flash (text only) → 3 background suggestions
    # ─────────────────────────────────────────
    client = get_genai_client()
    user_message = (
        f"Product/object detected: {product_description}\n\n"
        "Generate 3 background suggestions for this product photo."
    )

    try:
        from app.services.llm_client import call_gemini_with_fallback

        response = call_gemini_with_fallback(
            client=client,
            primary_model="gemini-2.5-flash",
            fallback_model="qwen/qwen-2.5-72b-instruct",
            contents=[user_message],
            config=genai_types.GenerateContentConfig(
                system_instruction=SUGGESTION_SYSTEM_PROMPT,
                response_mime_type="application/json",
            ),
        )

        result_text = response.text.strip()
        # Strip possible markdown fences
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]

        parsed = json.loads(result_text.strip())
        suggestions = parsed.get("suggestions", [])

        # Guarantee at most 3 items
        return {"suggestions": suggestions[:3]}
    except Exception:
        logger.warning(
            "Gemini suggestion generation failed, using fallback suggestions", exc_info=True
        )
        return {
            "suggestions": [
                {
                    "title": "Studio Minimal",
                    "emoji": "✨",
                    "prompt": "Minimalist clean studio setting, neutral background, soft even lighting, professional product photography, 8k, photorealistic"
                },
                {
                    "title": "Alam Terbuka",
                    "emoji": "🌿",
                    "prompt": "Natural outdoor setting, dappled sunlight, blurred soft foliage background, professional product photography, 8k, photorealistic"
                },
                {
                    "title": "Meja Kayu",
                    "emoji": "🪵",
                    "prompt": "Rustic wooden table surface, warm golden hour lighting, cozy atmosphere, professional product photography, 8k, photorealistic"
                }
            ]
        }

