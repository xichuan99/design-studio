import json
import logging
import uuid
from typing import Optional

import asyncio
from google.genai import types

from app.core.config import settings
from app.schemas.carousel import (
    CarouselGenerateRequest,
    CarouselGenerateResponse,
    CarouselRegenerateSlideRequest,
    CarouselSlide,
)
from app.services.carousel_brand_tokens import derive_carousel_brand_tokens
from app.services.llm_client import call_gemini_with_fallback, get_genai_client
from app.services.llm_json_utils import parse_llm_json

logger = logging.getLogger(__name__)

_SLIDE_TYPE_SEQUENCE = [
    "hero",
    "problem",
    "solution",
    "features",
    "details",
    "how_to",
    "cta",
    "proof",
    "faq",
    "offer",
]


def _pick_slide_types(num_slides: int) -> list[str]:
    return _SLIDE_TYPE_SEQUENCE[:num_slides]


def _topic_stub(topic: str, max_len: int = 64) -> str:
    collapsed = " ".join(topic.split())
    if len(collapsed) <= max_len:
        return collapsed
    return collapsed[: max_len - 1].rstrip() + "…"


def _fallback_slide_content(
    topic: str,
    brand_name: str,
    slide_type: str,
    index: int,
    total: int,
    instruction: Optional[str] = None,
) -> CarouselSlide:
    topic_stub = _topic_stub(topic)
    instruction_suffix = f" Fokus tambahan: {instruction.strip()}" if instruction else ""
    content_map = {
        "hero": (
            f"{topic_stub}",
            f"{brand_name} merangkum ide utama ini menjadi carousel {total} slide yang ringkas dan mudah dipahami.{instruction_suffix}",
            None,
        ),
        "problem": (
            "Masalah yang Sering Muncul",
            f"Banyak orang masih tersendat saat membahas {topic_stub.lower()} karena arah praktiknya belum cukup jelas.{instruction_suffix}",
            None,
        ),
        "solution": (
            "Solusi yang Lebih Terarah",
            f"Mulailah dari kerangka sederhana, lalu ubah menjadi langkah yang bisa langsung dicoba oleh audiens {brand_name}.{instruction_suffix}",
            None,
        ),
        "features": (
            "Poin Penting yang Didapat",
            f"Ringkasan ini menyorot manfaat inti, konteks praktis, dan hal yang perlu diingat agar {topic_stub.lower()} terasa actionable.{instruction_suffix}",
            None,
        ),
        "details": (
            "Detail yang Perlu Diperhatikan",
            f"Tekankan bagian yang paling sering luput: prioritas, urutan kerja, dan alasan setiap langkah relevan untuk audiens Anda.{instruction_suffix}",
            None,
        ),
        "how_to": (
            "Cara Menerapkannya",
            f"Pecah materi menjadi langkah kecil: mulai dari yang paling mudah, ukur hasilnya, lalu tingkatkan konsistensinya.{instruction_suffix}",
            None,
        ),
        "cta": (
            "Simpan dan Coba Sekarang",
            f"Gunakan carousel ini sebagai bahan posting {brand_name}, lalu arahkan audiens untuk lanjut ke langkah berikutnya.{instruction_suffix}",
            "Ikuti @brand untuk insight berikutnya",
        ),
        "proof": (
            "Kenapa Ini Layak Dicoba",
            f"Format carousel membantu audiens memahami konteks lebih cepat dan mendorong mereka menyimpan postingan untuk dibaca ulang.{instruction_suffix}",
            None,
        ),
        "faq": (
            "Pertanyaan yang Sering Muncul",
            f"Siapkan satu jawaban singkat untuk pertanyaan paling umum seputar {topic_stub.lower()} agar slide tetap padat dan meyakinkan.{instruction_suffix}",
            None,
        ),
        "offer": (
            "Langkah Lanjutan",
            f"Akhiri dengan ajakan yang jelas: baca caption, kunjungi profil, atau hubungi {brand_name} untuk info lebih detail.{instruction_suffix}",
            "Lanjut cek profil",
        ),
    }
    headline, body, cta = content_map.get(slide_type, content_map["details"])
    return CarouselSlide(index=index, type=slide_type, headline=headline, body=body, cta=cta)


def _build_fallback_slides(request: CarouselGenerateRequest) -> list[CarouselSlide]:
    slide_types = _pick_slide_types(request.num_slides)
    return [
        _fallback_slide_content(request.topic, request.brand_name, slide_type, index + 1, request.num_slides)
        for index, slide_type in enumerate(slide_types)
    ]


def _normalize_slide_payload(payload: object, request: CarouselGenerateRequest) -> list[CarouselSlide]:
    if isinstance(payload, dict):
        items = payload.get("slides", [])
    else:
        items = payload

    if not isinstance(items, list):
        raise TypeError("slides payload must be a JSON array")

    slide_types = _pick_slide_types(request.num_slides)
    slides: list[CarouselSlide] = []
    for index, slide_type in enumerate(slide_types, start=1):
        if index - 1 < len(items) and isinstance(items[index - 1], dict):
            current = dict(items[index - 1])
            current.setdefault("index", index)
            current.setdefault("type", slide_type)
            slides.append(CarouselSlide.model_validate(current))
        else:
            slides.append(
                _fallback_slide_content(
                    request.topic,
                    request.brand_name,
                    slide_type,
                    index,
                    request.num_slides,
                )
            )
    return slides


async def generate_carousel(request: CarouselGenerateRequest) -> CarouselGenerateResponse:
    brand_tokens = derive_carousel_brand_tokens(request.primary_color, request.font_style)
    slides = _build_fallback_slides(request)

    if settings.GEMINI_API_KEY:
        prompt = f"""
Generate {request.num_slides} Instagram carousel slides in Indonesian for this topic: {request.topic}
Brand: {request.brand_name}
Handle: {request.ig_handle or '@' + request.brand_name.lower().replace(' ', '')}
Tone: {request.tone}
Font style: {request.font_style}

Return JSON only with this shape:
{{
  "slides": [
    {{"index": 1, "type": "hero", "headline": "...", "body": "...", "cta": null}}
  ]
}}

Rules:
- headline max 12 words
- body max 30 words
- CTA only on the final slide when useful
- slide sequence should follow a strong narrative arc from hook to CTA
"""
        try:
            client = get_genai_client()
            response = await asyncio.to_thread(
                call_gemini_with_fallback,
                client=client,
                primary_model="openrouter/minimax/minimax-01",
                fallback_model="openrouter/qwen/qwen-2.5-72b-instruct",
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.7,
                ),
            )
            slides = _normalize_slide_payload(parse_llm_json(response.text), request)
        except Exception:
            logger.exception("Carousel generation fallback activated")

    return CarouselGenerateResponse(
        carousel_id=f"car_{uuid.uuid4().hex[:12]}",
        brand_tokens=brand_tokens,
        slides=slides,
    )


async def regenerate_carousel_slide(
    request: CarouselRegenerateSlideRequest,
) -> CarouselSlide:
    target_type = _pick_slide_types(request.num_slides)[request.slide_index - 1]
    fallback = _fallback_slide_content(
        request.topic,
        request.brand_name,
        target_type,
        request.slide_index,
        request.num_slides,
        request.instruction,
    )

    if not settings.GEMINI_API_KEY:
        return fallback

    prompt = {
        "topic": request.topic,
        "brand_name": request.brand_name,
        "tone": request.tone,
        "font_style": request.font_style,
        "slide_index": request.slide_index,
        "slide_type": target_type,
        "instruction": request.instruction,
        "slides": [slide.model_dump() for slide in request.slides],
    }

    try:
        client = get_genai_client()
        response = await asyncio.to_thread(
            call_gemini_with_fallback,
            client=client,
            primary_model="openrouter/minimax/minimax-01",
            fallback_model="openrouter/qwen/qwen-2.5-72b-instruct",
            contents=[json.dumps(prompt)],
            config=types.GenerateContentConfig(
                system_instruction=(
                    "Regenerate only the requested Instagram carousel slide. "
                    "Return JSON only with keys index, type, headline, body, cta."
                ),
                response_mime_type="application/json",
                temperature=0.8,
            ),
        )
        data = parse_llm_json(response.text)
        if isinstance(data, dict) and "slide" in data:
            data = data["slide"]
        data.setdefault("index", request.slide_index)
        data.setdefault("type", target_type)
        return CarouselSlide.model_validate(data)
    except Exception:
        logger.exception("Carousel slide regeneration fallback activated")
        return fallback
