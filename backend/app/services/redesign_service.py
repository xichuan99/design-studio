"""Redesign Service."""

import httpx
import json
import logging
import asyncio
from google.genai import types

from app.core.config import settings
from app.schemas.design import ReferenceAnalysis, AspectRatio
from app.core.exceptions import AppException
from fastapi import status
from app.services.llm_client import (
    DEFAULT_OPENROUTER_VISION_MODEL,
    DEFAULT_XAI_VISION_MODEL,
    call_gemini_with_fallback,
    get_genai_client,
)

# System Prompt for Gemini Vision
VISION_ANALYSIS_PROMPT = """
Analyze the provided reference image and extract its core visual components.
Return the result in JSON format with the following keys:
- 'style_description': Analyze overall style & vibe (minimalist, bold, etc.) and composition/lighting.
- 'dominant_colors': List of main hex color codes.
- 'mood': The feeling (energetic, calm, etc.).
- 'suggested_prompt_suffix': A detailed style prompt I can append to a text-to-image prompt to capture this exact look and feel.

DO NOT describe the literal subject matter (e.g., "a cup of coffee"). ONLY describe the stylistic and execution elements.
"""

# Map our app's aspect ratio strings to fal.ai's expected strings
# fal.ai flux accepts: "square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"
FAL_ASPECT_RATIO_MAP = {
    AspectRatio.SQUARE.value: "square_hd",
    AspectRatio.STORY.value: "portrait_16_9",
    AspectRatio.LANDSCAPE.value: "landscape_16_9",
    AspectRatio.POST.value: "portrait_4_3",  # Closest mapping for 4:5
}


async def analyze_reference_image(image_url: str) -> ReferenceAnalysis:
    """
    Downloads an image from a URL, analyzes it using Gemini Vision,
    and returns structured style parameters.
    """
    if not settings.GEMINI_API_KEY:
        logging.warning("GEMINI_API_KEY is missing, returning mock reference analysis")
        return ReferenceAnalysis(
            style_description="A placeholder style due to missing API key.",
            dominant_colors=["#FFFFFF", "#000000"],
            mood="Neutral",
            suggested_prompt_suffix="in a standard, generic style",
        )

    try:
        # Download image
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
            image_bytes = resp.content
    except Exception as e:
        logging.error(f"Failed to download reference image: {e}")
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tidak dapat mengunduh gambar referensi: {str(e)}",
        )

    try:
        # Call xAI Vision via client utility
        def call_llm():
            genai_client = get_genai_client()
            response = call_gemini_with_fallback(
                client=genai_client,
                primary_model=DEFAULT_XAI_VISION_MODEL,
                fallback_model=DEFAULT_OPENROUTER_VISION_MODEL,
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes, mime_type="image/jpeg"
                    ),
                    VISION_ANALYSIS_PROMPT,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ReferenceAnalysis,
                    temperature=0.2,  # Low temp for consistent analysis
                ),
            )
            return json.loads(response.text)

        result_dict = await asyncio.to_thread(call_llm)
        return ReferenceAnalysis(**result_dict)

    except Exception as e:
        logging.error(f"Failed to analyze image with Gemini Vision: {e}")
        raise AppException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal menganalisa gambar referensi: {str(e)}",
        )


async def run_flux_redesign(
    image_url: str, enriched_prompt: str, strength: float, aspect_ratio: str
) -> bytes:
    """
    Calls fal.ai FLUX.2 Dev image-to-image API using fal_client.
    Returns the generated image as bytes.
    """
    import fal_client
    import os

    if not settings.FAL_KEY:
        logging.warning("FAL_KEY is missing! Using a mock image return.")
        raise AppException(
            status_code=500, detail="FAL_KEY is missing. Cannot run redesign."
        )

    os.environ["FAL_KEY"] = settings.FAL_KEY

    image_size = FAL_ASPECT_RATIO_MAP.get(aspect_ratio, "square_hd")

    arguments = {
        "prompt": enriched_prompt,
        "image_urls": [image_url],
        "strength": strength,
        "image_size": image_size,
        "num_inference_steps": 8,  # fal-ai/flux-2/flash/edit requires max 8
        "guidance_scale": 3.5,
    }

    try:
        # Run fal client
        result = await fal_client.run_async(
            "fal-ai/flux-2/flash/edit", arguments=arguments
        )

        if "images" in result and len(result["images"]) > 0:
            result_url = result["images"][0]["url"]

            # Download the final image to return bytes
            async with httpx.AsyncClient(timeout=30.0) as client:
                img_resp = await client.get(result_url)
                img_resp.raise_for_status()
                return img_resp.content
        else:
            raise ValueError("No images returned from fal.ai")

    except Exception as e:
        logging.error(f"Fal.ai generation failed: {e}")
        raise AppException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gagal melakukan redesign dari fal.ai: {str(e)}",
        )

