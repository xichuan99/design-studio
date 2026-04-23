"""
Service for AI-powered background suggestions for the Background Swap tool.

Pipeline:
  1. Upload product image to storage → get a public URL
  2. Call fal-ai/florence-2-large/caption (Vision model) → get a text description of the product
  3. Send that description to Gemini Flash (text-only, cheap) → generate 3 background suggestions in JSON

This hybrid approach is cost-effective: Florence-2 on fal.ai handles vision (~$0.001/req),
and Gemini only processes text (no image), which is far cheaper than Gemini Vision.
"""

import logging
import uuid
from typing import Any, Dict, List, Optional

import fal_client
from google.genai import types as genai_types

from app.core.ai_models import (
    FAL_BG_SUGGEST_CAPTION,
    LLM_BG_SUGGEST_PRIMARY,
)
from app.core.config import settings
from app.services.llm_json_utils import parse_llm_json
from app.services.storage_service import upload_image
from app.services.llm_client import get_genai_client

logger = logging.getLogger(__name__)


CONTEXT_KEYS = (
    "product_category",
    "target_channel",
    "audience",
    "brand_tone",
    "price_tier",
)


SUGGESTION_SYSTEM_PROMPT = """\
You are a professional product photographer and creative director.
You will receive:
1) a short visual description of a product/object (detected by a vision AI), and
2) optional business context (category, channel, audience, brand tone, price tier).

Your task is to generate highly relevant background concepts for product photography.

REQUIREMENTS:
1. Return exactly 6 candidate suggestions.
2. Each suggestion must have:
   - "title": short Indonesian name (2-4 words, e.g. "Studio Minimalis", "Alam Terbuka")
   - "emoji": a single relevant emoji
   - "prompt": a detailed English prompt (30-50 words) for an AI image generator.
     The prompt must include: setting, lighting style, mood, surface material, depth of field.
     Always end with: "professional product photography, 8k, photorealistic"
   - "rationale": short Indonesian explanation why this background suits the product and context (1 sentence)
   - "best_for": one of ["marketplace", "social", "ads", "catalog"]
   - "risk_note": short Indonesian risk note (e.g. too busy for small thumbnails)
3. Vary the styles across candidates (studio, lifestyle, outdoor/nature, editorial, clean e-commerce).
4. Guardrails:
   - Avoid cluttered scenes and distracting objects.
   - Avoid unrealistic perspective and impossible shadows.
   - Avoid color clash with product subject.
   - Keep subject readability high for thumbnail use.
5. Output MUST be valid JSON only, matching this schema:
{"suggestions": [{"title": "...", "emoji": "...", "prompt": "...", "rationale": "...", "best_for": "marketplace", "risk_note": "..."}, ...]}
"""


def _compact_context(context: Optional[Dict[str, Optional[str]]]) -> Dict[str, str]:
    compact: Dict[str, str] = {}
    for key in CONTEXT_KEYS:
        value = str((context or {}).get(key, "")).strip()
        if value:
            compact[key] = value
    return compact


def _build_context_text(context: Dict[str, str]) -> str:
    if not context:
        return "No additional business context provided."

    lines = ["Business context:"]
    for key in CONTEXT_KEYS:
        if key in context:
            lines.append(f"- {key}: {context[key]}")
    return "\n".join(lines)


def _normalize_suggestion(item: Dict[str, Any]) -> Dict[str, str]:
    title = str(item.get("title", "")).strip() or "Saran Background"
    emoji = str(item.get("emoji", "✨")).strip() or "✨"
    prompt = str(item.get("prompt", "")).strip()
    rationale = str(item.get("rationale", "")).strip()
    best_for = str(item.get("best_for", "marketplace")).strip().lower() or "marketplace"
    risk_note = str(item.get("risk_note", "")).strip()

    allowed_best_for = {"marketplace", "social", "ads", "catalog"}
    if best_for not in allowed_best_for:
        best_for = "marketplace"

    if not prompt:
        prompt = (
            "Clean professional studio setup, soft controlled lighting, balanced shadows, "
            "neutral backdrop and subtle depth separation, professional product photography, "
            "8k, photorealistic"
        )

    normalized: Dict[str, str] = {
        "title": title,
        "emoji": emoji,
        "prompt": prompt,
    }

    if rationale:
        normalized["rationale"] = rationale
    if best_for:
        normalized["best_for"] = best_for
    if risk_note:
        normalized["risk_note"] = risk_note
    return normalized


def _keyword_score(text: str, keywords: List[str], weight: int = 1) -> int:
    lowered = text.lower()
    score = 0
    for keyword in keywords:
        if keyword in lowered:
            score += weight
    return score


def _score_suggestion(
    suggestion: Dict[str, str],
    context: Dict[str, str],
    product_description: str,
) -> int:
    combined_text = " ".join(
        [
            suggestion.get("title", ""),
            suggestion.get("prompt", ""),
            suggestion.get("rationale", ""),
            suggestion.get("risk_note", ""),
            product_description,
        ]
    ).lower()

    score = 0

    # Readability and commercial suitability bias.
    score += _keyword_score(
        combined_text,
        ["clean", "minimal", "soft", "neutral", "professional", "catalog"],
        weight=2,
    )
    score -= _keyword_score(
        combined_text,
        ["crowded", "chaotic", "busy", "noisy", "clutter"],
        weight=3,
    )

    channel = context.get("target_channel", "").lower()
    if channel:
        if "market" in channel:
            score += _keyword_score(combined_text, ["clean", "plain", "high contrast"], weight=2)
        if "social" in channel or "instagram" in channel or "tiktok" in channel:
            score += _keyword_score(combined_text, ["lifestyle", "editorial", "dramatic"], weight=2)

    category = context.get("product_category", "").lower()
    if category:
        if "fashion" in category or "apparel" in category:
            score += _keyword_score(combined_text, ["editorial", "studio", "textured"], weight=2)
        if "food" in category or "beverage" in category:
            score += _keyword_score(combined_text, ["table", "warm", "natural", "wood"], weight=2)
        if "beauty" in category or "cosmetic" in category:
            score += _keyword_score(combined_text, ["clean", "soft", "glossy", "pastel"], weight=2)

    return score


def _pick_top_suggestions(
    candidates: List[Dict[str, str]],
    context: Dict[str, str],
    product_description: str,
    limit: int = 3,
) -> List[Dict[str, str]]:
    ranked = sorted(
        candidates,
        key=lambda item: _score_suggestion(item, context, product_description),
        reverse=True,
    )
    return ranked[:limit]


def _fallback_suggestions(context: Dict[str, str]) -> List[Dict[str, str]]:
    category = context.get("product_category", "").lower()

    if "food" in category or "beverage" in category:
        return [
            {
                "title": "Meja Hangat",
                "emoji": "🍽️",
                "prompt": "Warm wooden tabletop setting with soft natural side light, appetizing cozy mood, clean composition with subtle bokeh background, commercial food styling surface, shallow depth of field, professional product photography, 8k, photorealistic",
                "rationale": "Nuansa hangat membantu produk makanan terlihat lebih menggugah selera.",
                "best_for": "social",
                "risk_note": "Hindari props berlebihan agar fokus tetap di produk.",
            },
            {
                "title": "Studio Putih",
                "emoji": "✨",
                "prompt": "Bright minimal white studio with softbox lighting and gentle shadow grounding, clean reflective surface, high product separation and crisp detail, shallow depth of field, professional product photography, 8k, photorealistic",
                "rationale": "Background bersih cocok untuk listing marketplace dan katalog.",
                "best_for": "marketplace",
                "risk_note": "Pastikan exposure produk tidak over terang.",
            },
            {
                "title": "Cafe Lifestyle",
                "emoji": "☕",
                "prompt": "Lifestyle cafe setting with soft ambient daylight, muted earthy palette, textured tabletop surface and blurred interior depth, relaxed premium mood, shallow depth of field, professional product photography, 8k, photorealistic",
                "rationale": "Scene lifestyle memberi konteks penggunaan nyata dan terasa premium.",
                "best_for": "ads",
                "risk_note": "Jaga kontras agar produk tetap menonjol di thumbnail.",
            },
        ]

    return [
        {
            "title": "Studio Minimal",
            "emoji": "✨",
            "prompt": "Minimalist clean studio setting with neutral seamless backdrop, soft even lighting, subtle grounding shadow and matte surface texture, strong product separation and shallow depth of field, professional product photography, 8k, photorealistic",
            "rationale": "Aman untuk berbagai kategori dan menjaga produk tetap jadi fokus utama.",
            "best_for": "marketplace",
            "risk_note": "Terlalu netral bisa terasa kurang emosional untuk campaign.",
        },
        {
            "title": "Alam Terbuka",
            "emoji": "🌿",
            "prompt": "Natural outdoor setting with diffused daylight, soft foliage bokeh, clean foreground surface and fresh airy mood, realistic shadows and shallow depth of field, professional product photography, 8k, photorealistic",
            "rationale": "Nuansa natural meningkatkan kesan fresh dan organik pada produk.",
            "best_for": "social",
            "risk_note": "Warna hijau dominan bisa bentrok dengan produk warna serupa.",
        },
        {
            "title": "Lifestyle Modern",
            "emoji": "🏠",
            "prompt": "Modern lifestyle interior with controlled window lighting, warm neutral tones, clean stone surface and subtle background depth, premium everyday mood, shallow depth of field, professional product photography, 8k, photorealistic",
            "rationale": "Memberi konteks pemakaian nyata yang efektif untuk materi iklan.",
            "best_for": "ads",
            "risk_note": "Jika terlalu ramai, elemen interior dapat mengalihkan fokus.",
        },
    ]


async def suggest_backgrounds(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    context: Optional[Dict[str, Optional[str]]] = None,
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
    if not settings.OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is missing from environment")

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
            FAL_BG_SUGGEST_CAPTION,
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
    compact_context = _compact_context(context)
    context_text = _build_context_text(compact_context)

    client = get_genai_client()
    user_message = (
        f"Product/object detected: {product_description}\n\n"
        f"{context_text}\n\n"
        "Generate 6 background suggestions for this product photo, then we will rank internally."
    )

    try:
        from app.services.llm_client import call_gemini_with_fallback

        response = call_gemini_with_fallback(
            client=client,
            primary_model=LLM_BG_SUGGEST_PRIMARY,
            fallback_model=LLM_BG_SUGGEST_PRIMARY,
            contents=[user_message],
            config=genai_types.GenerateContentConfig(
                system_instruction=SUGGESTION_SYSTEM_PROMPT,
                response_mime_type="application/json",
            ),
        )

        try:
            parsed = parse_llm_json(response.text)
        except Exception as e:
            logger.error(f"Failed to parse LLM JSON response: {e}\nRaw: {response.text}")
            raise
        raw_suggestions = parsed.get("suggestions", [])
        if not isinstance(raw_suggestions, list):
            raw_suggestions = []

        normalized_candidates: List[Dict[str, str]] = []
        for item in raw_suggestions:
            if isinstance(item, dict):
                normalized_candidates.append(_normalize_suggestion(item))

        if not normalized_candidates:
            raise RuntimeError("Suggestion response is empty")

        top_suggestions = _pick_top_suggestions(
            normalized_candidates,
            compact_context,
            product_description,
            limit=3,
        )

        # Keep response shape compatible: `suggestions` list always exists.
        return {"suggestions": top_suggestions}
    except Exception:
        logger.warning(
            "LLM suggestion generation failed, using fallback suggestions", exc_info=True
        )
        return {"suggestions": _fallback_suggestions(compact_context)}

