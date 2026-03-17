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
from app.services.llm_client import get_genai_client

# System Prompt for Gemini Vision
VISION_ANALYSIS_PROMPT = """
You are an expert graphic designer and art director.
Analyze the provided reference image and extract its core visual components so they can be accurately replicated or inspired from by another Image AI.

Pay close attention to:
1. OVERALL STYLE & VIBE: Is it minimalist, bold, cyberpunk, watercolor, 3D render, flat design, corporate, etc.?
2. DOMINANT COLORS: Give me the main hex color codes.
3. MOOD: What is the feeling? (e.g., energetic, calm, professional, playful).
4. COMPOSITION & LIGHTING: How are things arranged? Is the lighting soft, dramatic, cinematic, studio?

Provide a detailed 'suggested_prompt_suffix' that I can append to a text-to-image prompt to capture this exact style and mood.

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
        # Call Gemini Vision synchronously in a thread
        def call_gemini():
            genai_client = get_genai_client()
            response = genai_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes, mime_type="image/jpeg"
                    ),  # Assuming jpeg/png is fine, Gemini auto-detects
                    VISION_ANALYSIS_PROMPT,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ReferenceAnalysis,
                    temperature=0.2,  # Low temp for consistent analysis
                ),
            )
            return json.loads(response.text)

        result_dict = await asyncio.to_thread(call_gemini)
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
        "image_url": image_url,
        "strength": strength,
        "image_size": image_size,
        "num_inference_steps": 28,
        "guidance_scale": 3.5,
    }

    try:
        # Run fal client
        result = await fal_client.run_async(
            "fal-ai/flux-2/dev/image-to-image", arguments=arguments
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

