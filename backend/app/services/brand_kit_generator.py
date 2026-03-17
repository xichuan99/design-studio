import json
import logging
import asyncio
import httpx
from typing import Dict, Any
from google import genai
from google.genai import types
from app.core.config import settings
from app.core.exceptions import AppException
from fastapi import status

BRAND_KIT_SYSTEM_PROMPT = """
You are an expert Brand Identity Designer.
Your task is to generate a comprehensive Brand Kit based on the provided business description.

Requirements:
1. Provide a brand name if one isn't explicitly given in the prompt, or use the one provided.
2. Provide exactly 5 distinct colors with the following roles: "primary", "secondary", "accent", "background", "text". Make sure the hex codes are valid and well-coordinated (e.g., text color should contrast well with background color). Include a descriptive Indonesian name for each color.
3. Provide a typography pairing using standard Google Fonts (e.g., "Inter", "Playfair Display", "Roboto", "Montserrat"). Provide a primaryFont (for headings) and secondaryFont (for body text).
4. Provide a highly descriptive "logo_prompt" in English that can be used by an AI image generator (like FLUX) to create a beautiful, minimalist, vector-style logo on a solid white background. It MUST NOT include text/words inside the logo itself.

Return your response strictly as a JSON object matching this schema exactly:
{
  "name": "Brand Name",
  "colors": [
    {"hex": "#...", "name": "...", "role": "primary"},
    ...
  ],
  "typography": {
    "primaryFont": "...",
    "secondaryFont": "..."
  },
  "logo_prompt": "A minimalist flat vector logo of..."
}
"""

async def generate_brand_identity_json(prompt: str) -> Dict[str, Any]:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")

    def call_gemini():
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[BRAND_KIT_SYSTEM_PROMPT, f"Business Description: {prompt}"],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )
        return json.loads(response.text)

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
        # fal-ai/flux-2/dev text to image.
        result = await fal_client.run_async("fal-ai/flux-2/dev", arguments=arguments)

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
