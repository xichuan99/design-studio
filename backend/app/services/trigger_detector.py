"""
Trigger Reaktif Set 4 — Auto-detect studio shot center.

After image generation, this module analyzes the output image to determine
if it naturally produces a studio-shot with centered subject and empty space
around it. If so, the pipeline overrides the composition to Set 4 (Center Drama),
which places headline/sub in the top strip, CTA in the bottom strip, and leaves
the center 60% free for the subject.

Implements Pipeline Design Document v1.0, page 5: "Set 4 — Trigger Reaktif".
"""
from __future__ import annotations

import logging
from typing import Optional

from app.services.llm_client import get_direct_gemini_client
from google.genai import types

logger = logging.getLogger(__name__)


async def detect_studio_shot_center(image_url: str) -> Optional[dict]:
    """
    Analyze generated image via Gemini Vision to determine if it's a studio shot
    with centered subject and surrounding empty space.

    Returns composition override dict if studio shot detected, None otherwise.
    The override dict contains:
        {
            "triggered": True,
            "set_num": 4,
            "copy_space_side": "top_bottom",
            "image_prompt_modifier": "composition: CENTERED subject with clean studio space..."
        }
    """
    try:
        client = get_direct_gemini_client()

        # Download image bytes
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as http:
            resp = await http.get(image_url)
            resp.raise_for_status()
            image_bytes = resp.content

        prompt = (
            "Analyze this generated design image. Answer ONLY with a JSON object.\n\n"
            "Question: Is this image a studio-shot product photo with a centered subject "
            "and clean empty space around it (top and bottom zones are clear for text overlay)?\n\n"
            "Return format: {\"is_studio_center\": true/false, \"confidence\": 0.0-1.0, "
            "\"reason\": \"one short sentence\"}\n\n"
            "A studio center shot has: single subject centered, clean/uniform background, "
            "clear space above and below the subject suitable for text overlay. "
            "NOT studio center: busy backgrounds, lifestyle scenes, text already present, "
            "subjects off-center, cluttered compositions."
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                prompt,
            ],
            config=types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=150,
            ),
        )

        if not response.text:
            return None

        import json
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
        data = json.loads(text)

        if data.get("is_studio_center") and data.get("confidence", 0) >= 0.7:
            logger.info(
                "Trigger reaktif Set 4 activated: studio center detected "
                "(confidence=%.2f, reason=%s)",
                data.get("confidence", 0),
                data.get("reason", ""),
            )
            return {
                "triggered": True,
                "set_num": 4,
                "copy_space_side": "top_bottom",
                "image_prompt_modifier": (
                    "composition: CENTERED subject with clean studio space around it. "
                    "Top 20% and bottom 15% of frame are clear zones for text overlay. "
                    "Center 65% belongs entirely to the subject. Use premium studio "
                    "lighting, clean or minimal background."
                ),
            }

        return None

    except Exception as exc:
        logger.debug("Trigger reaktif detection skipped (non-critical): %s", exc)
        return None
