import json
import logging
import asyncio
from typing import Dict, Any, Optional

from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.exceptions import AppException
from fastapi import status
from app.services.llm_client import get_genai_client, call_gemini_with_fallback
from app.models.brand_kit import BrandKit

logger = logging.getLogger(__name__)

AD_CREATOR_SYSTEM_PROMPT = """
You are an expert Creative Director and AI Prompt Engineer specializing in the Indonesian MSME (UMKM) market.
Your task is to analyze an uploaded product photo and propose exactly 3 visually stunning, distinct advertising concepts.

TARGET AUDIENCE & AESTHETIC REQUIREMENTS:
- The target audience is Indonesian consumers on local e-commerce and social media.
- Emphasize "professional studio lighting" (bright, sharp, commercial product photography style).
- Incorporate "local marketplace aesthetics" (vibrant, trustworthy, clean, high-conversion layouts appealing to the Indonesian market).
- Copywriting (headline, tagline, CTA) MUST be in engaging, natural Indonesian (or familiar terms like "Promo", "Sale").

For each concept, you must provide:
1. `id`: A simple string ID (e.g. "studio_minimalis", "lokal_vibrant", "premium_elegan")
2. `concept_name`: A human-readable name for the concept.
3. `visual_prompt`: A highly detailed prompt for a Text-to-Image AI to generate the background scene. Focus intensely on "professional studio lighting", props, and setting. The product will be composited later, so explicitly require "copy space for text" and an "empty space for product placement".
4. `headline`: A catchy, short headline text (2-5 words) in Indonesian.
5. `tagline`: A supportive, engaging tagline (4-8 words) in Indonesian.
6. `call_to_action`: A short action phrase (e.g., "Beli Sekarang", "Cek Promo", "Pesan di Sini").

REQUIREMENTS:
- Output exactly 3 diverse concepts.
- The output MUST be a valid JSON matching this schema:
{
  "concepts": [
    {
      "id": "...",
      "concept_name": "...",
      "visual_prompt": "...",
      "headline": "...",
      "tagline": "...",
      "call_to_action": "..."
    }
  ]
}

If BRAND GUIDELINES are provided below, ensure the `visual_prompt` strictly incorporates the brand colors, and the text copy aligns with the brand personality.
"""

async def build_ad_concepts(
    image_bytes: bytes,
    mime_type: str,
    brief: Optional[str] = None,
    brand_kit_id: Optional[str] = None,
    db: Optional[AsyncSession] = None,
) -> Dict[str, Any]:
    """
    Analyzes a product photo and returns 3 diverse Ad concepts (prompts + texts).
    Optionally incorporates Brand Kit guidelines.
    """
    brand_guidelines = ""
    if brand_kit_id and db:
        res = await db.execute(select(BrandKit).filter(BrandKit.id == brand_kit_id))
        brand_kit = res.scalars().first()
        if brand_kit:
            brand_guidelines = "\\n\\n--- BRAND GUIDELINES ---\\n"

            # Extract basic info
            if getattr(brand_kit, "name", None):
                brand_guidelines += f"Brand Name: {brand_kit.name}\\n"

            # Extract colors
            if getattr(brand_kit, "colors", None):
                colors = brand_kit.colors
                color_desc = ", ".join([f"{c.get('name')} ({c.get('hex')})" for c in colors])
                brand_guidelines += f"Brand Colors to integrate in the scene: {color_desc}\\n"

            # Extract brand strategy
            strategy = getattr(brand_kit, "brand_strategy", {})
            if strategy:
                personality = strategy.get("personality", [])
                if personality:
                    brand_guidelines += f"Brand Personality: {', '.join(personality)}\\n"
                target_audience = strategy.get("targetAudience", "")
                if target_audience:
                    brand_guidelines += f"Target Audience: {target_audience}\\n"

    # Prepare context message
    user_message = "Analyze the attached product photo to generate 3 ad concepts."
    if brief:
        user_message += f"\\n\\nUSER BRIEF/REQUIREMENTS: {brief}"
    if brand_guidelines:
        user_message += brand_guidelines

    try:
        def call_ai():
            client = get_genai_client()

            contents = [
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                user_message
            ]

            response = call_gemini_with_fallback(
                client=client,
                primary_model="openrouter/minimax/minimax-m2.7",
                fallback_model="google/gemini-2.5-flash",  # OpenRouter fallback
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=AD_CREATOR_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.7,
                ),
            )
            return response.text

        result_text = await asyncio.to_thread(call_ai)

        # Strip markdown fences if any
        result_text = result_text.strip()
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]

        parsed = json.loads(result_text.strip())
        return parsed

    except Exception as e:
        logger.error(f"Failed to build ad concepts: {e}", exc_info=True)
        raise AppException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal menghasilkan konsep iklan: {str(e)}"
        )
