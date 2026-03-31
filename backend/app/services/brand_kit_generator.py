import json
import logging
import asyncio
import httpx
from typing import Dict, Any
from google.genai import types
from app.core.config import settings
from app.core.exceptions import AppException
from fastapi import status
from app.services.llm_client import get_genai_client

BRAND_KIT_SYSTEM_PROMPT = """
You are an expert Brand Identity Designer, Color Psychologist, and Master Typographer.
Your task is to generate a comprehensive Brand Kit based on the provided business description and brand parameters.

Requirements:
1. Provide exactly 5 distinct colors with roles: "primary", "secondary", "accent", "background", "text". Include a descriptive Indonesian name, psychological reasoning, and UI/application instruction.
2. Formulate a Typography pairing using standard Google Fonts (e.g., "Inter", "Playfair Display", "Outfit", "Space Grotesk"). Provide the logic behind the font choice, use case, and an exact CSS typography hierarchy.
3. Formulate a 'brand_strategy' focusing on target audience appeal and design differentiator.
4. Provide a highly descriptive "logo_prompt" in English that can be used by an AI image generator (like FLUX) to create a beautiful, minimalist, vector-style logo on a solid white background matching the brand's aesthetic. NO TEXT in the logo.

Return your response strictly as a JSON object matching this schema exactly:
{
  "name": "Brand Name",
  "colors": [
    {
      "hex": "#...",
      "name": "...",
      "role": "primary",
      "reasoning": "Psikologi warna ini...",
      "application": "Cocok digunakan untuk..."
    }
  ],
  "typography": {
    "primaryFont": "...", "primaryFontSource": "Google Fonts", "primaryFontReasoning": "...", "primaryFontUse": "...",
    "secondaryFont": "...", "secondaryFontSource": "Google Fonts", "secondaryFontReasoning": "...", "secondaryFontUse": "...",
    "hierarchy": {
      "h1": {"size": "64px", "weight": "700", "letterSpacing": "-0.02em", "lineHeight": "1.1"},
      "h2": {"size": "40px", "weight": "600", "letterSpacing": "-0.01em", "lineHeight": "1.2"},
      "body": {"size": "16px", "weight": "400", "letterSpacing": "normal", "lineHeight": "1.6"},
      "caption": {"size": "12px", "weight": "400", "letterSpacing": "0.02em", "lineHeight": "1.4"}
    }
  },
  "brand_strategy": {
    "personality": ["..."],
    "targetAudience": "...",
    "designStyle": "...",
    "differentiator": "..."
  },
  "logo_prompt": "A minimalist flat vector logo of..."
}
"""


async def generate_brand_identity_json(
    prompt: str,
    brand_personality: list[str] = None,
    target_audience: str = "",
    design_style: str = "",
    emotional_tone: str = "",
) -> Dict[str, Any]:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")

    traits = ", ".join(brand_personality) if brand_personality else "Modern, minimal"

    context = f"""
Business/Brand Description: {prompt}
Personality Traits: {traits}
Target Audience: {target_audience}
Preferred Design Style: {design_style}
Desired Emotional Tone: {emotional_tone}
"""

    def call_gemini():
        from app.services.llm_client import call_gemini_with_fallback

        client = get_genai_client()
        response = call_gemini_with_fallback(
            client=client,
            primary_model="gemini-2.5-flash",
            fallback_model="qwen/qwen-2.5-72b-instruct",
            contents=[BRAND_KIT_SYSTEM_PROMPT, context],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )

        result_text = response.text.strip()
        if result_text.startswith("```json"):
            result_text = result_text[7:-3].strip()
        elif result_text.startswith("```"):
            result_text = result_text[3:-3].strip()

        return json.loads(result_text)

    try:
        return await asyncio.to_thread(call_gemini)
    except Exception as e:
        logging.error(f"Failed to generate brand identity JSON with Gemini: {e}")
        raise AppException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal men-*generate* identitas merek: {str(e)}",
        )


async def generate_logo_from_prompt(prompt: str) -> bytes:
    import fal_client
    import os

    if not settings.FAL_KEY:
        raise AppException(status_code=500, detail="FAL_KEY is missing")

    os.environ["FAL_KEY"] = settings.FAL_KEY

    # Force minimalist logo style
    enriched_prompt = f"{prompt}, flat vector logo design, minimalist, modern, isolated on pure white background, no text, clean geometric shapes"

    arguments = {
        "prompt": enriched_prompt,
        "image_size": "square_hd",
        "num_inference_steps": 28,
        "guidance_scale": 3.5,
    }

    try:
        # fal-ai/flux/dev text to image.
        result = await fal_client.run_async("fal-ai/flux/dev", arguments=arguments)

        if "images" in result and len(result["images"]) > 0:
            result_url = result["images"][0]["url"]
            async with httpx.AsyncClient(timeout=30.0) as client:
                img_resp = await client.get(result_url)
                img_resp.raise_for_status()
                return img_resp.content
        else:
            raise ValueError("No images returned from fal.ai")
    except Exception as e:
        logging.error(f"Fal.ai logo generation failed: {e}")
        raise AppException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gagal generate logo: {str(e)}",
        )
