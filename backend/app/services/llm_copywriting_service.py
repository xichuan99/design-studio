"""Copywriting-related LLM services."""

from typing import Optional
import asyncio
from app.core.config import settings
from google.genai import types

from app.services.llm_prompts import (
    COPYWRITING_BRIEF_SYSTEM,
    COPYWRITING_SYSTEM_PROMPT,
)
from app.services.llm_client import get_genai_client, call_gemini_with_fallback
from app.services.llm_design_service import extract_json_from_text


async def generate_copywriting_questions(raw_text: str) -> dict:
    """
    Generates clarifying questions specifically for copywriting using Gemini.

    Args:
        raw_text (str): The initial brief provided by the user.

    Returns:
        dict: A dictionary containing a list of questions structured according to `BriefQuestionsResponse`.

    Raises:
        Exception: If the LLM call or response parsing fails.
    """
    from app.schemas.design import BriefQuestionsResponse

    if not settings.GEMINI_API_KEY:
        import logging

        logging.warning(
            "GEMINI_API_KEY is missing – returning mock copywriting questions"
        )
        return {
            "questions": [
                {
                    "id": "target_audience",
                    "question": "Siapakah target pelanggan utama Anda?",
                    "type": "choice",
                    "options": [
                        "Anak Muda / Gen Z",
                        "Ibu Rumah Tangga",
                        "Profesional / Pekerja",
                        "Umum",
                    ],
                    "default": "Umum",
                },
                {
                    "id": "promo_detail",
                    "question": "Apakah ada promo atau diskon khusus yang ingin ditonjolkan?",
                    "type": "text",
                    "options": [],
                    "default": "",
                },
                {
                    "id": "key_benefit",
                    "question": "Apa keunggulan utama dari produk Anda dibandingkan yang lain?",
                    "type": "choice",
                    "options": [
                        "Harga Terjangkau",
                        "Kualitas Premium",
                        "Cepat / Instan",
                        "Estetik / Kekinian",
                    ],
                    "default": "Kualitas Premium",
                },
            ]
        }

    response = await asyncio.to_thread(
        call_gemini_with_fallback,
        client=client,
        primary_model="openrouter/minimax/minimax-01",
        fallback_model="openrouter/qwen/qwen-2.5-72b-instruct",
        contents=[
            f"Buatkan pertanyaan klarifikasi copywriting untuk deskripsi ini:\n{raw_text}"
        ],
        config=types.GenerateContentConfig(
            system_instruction=COPYWRITING_BRIEF_SYSTEM,
            response_mime_type="application/json",
            response_schema=BriefQuestionsResponse.model_json_schema(),
            temperature=0.7,
        ),
    )

    try:
        import json
        data = extract_json_from_text(response.text)
        if "clarification_questions" in data and "questions" not in data:
            data["questions"] = data.pop("clarification_questions")

        parsed = BriefQuestionsResponse.model_validate(data)
        return parsed.model_dump()
    except Exception as e:
        import logging
        snippet = response.text[:200] + "..." if len(response.text) > 200 else response.text
        logging.exception(f"Error extracting copywriting questions via LLM. Snippet: {snippet}")
        raise e


async def generate_ai_copywriting(
    product_description: str,
    tone: str = "persuasive",
    brand_name: Optional[str] = None,
    clarification_answers: Optional[dict] = None,
) -> dict:
    """
    Generates 3 variations of copywriting using Gemini.

    Args:
        product_description (str): A description of the product or service.
        tone (str): The desired tone for the copy (e.g., "persuasive", "casual", "professional", "funny"). Defaults to "persuasive".
        brand_name (Optional[str]): The name of the brand to include in the copy. Defaults to None.
        clarification_answers (Optional[dict]): Answers to previously asked clarifying questions. Defaults to None.

    Returns:
        dict: A dictionary containing 3 variations of the generated copy, structured according to `CopywritingResponse`.

    Raises:
        Exception: If the LLM call or response parsing fails.
    """
    from app.schemas.design import CopywritingResponse

    tone_map = {
        "casual": "TONE: Gunakan bahasa yang santai, gaul, akrab, bisa pakai emoticon jika relevan.",
        "professional": "TONE: Gunakan bahasa yang formal, profesional, terpercaya, dan elegan.",
        "persuasive": "TONE: Gunakan teknik copywriting persuasif, menonjolkan urgensi, dan sangat meyakinkan pembaca untuk langsung bertindak.",
        "funny": "TONE: Gunakan gaya bahasa yang lucu, nyeleneh, out-of-the-box, menarik perhatian.",
    }
    tone_instruction = tone_map.get(tone, tone_map["persuasive"])

    brand_instruction = (
        f"BRAND: Tolong sisipkan nama brand '{brand_name}' secara natural di salah satu bagian (Headline, Subline, atau CTA)."
        if brand_name
        else "BRAND: Tidak ada nama brand khusus yang disertakan."
    )

    system_prompt_formatted = COPYWRITING_SYSTEM_PROMPT.format(
        tone_instruction=tone_instruction, brand_instruction=brand_instruction
    )

    prompt_payload = f"Deskripsi Produk:\n{product_description}\n\n"
    if clarification_answers:
        prompt_payload += "Info Tambahan (Jawaban Klarifikasi):\n"
        for key, value in clarification_answers.items():
            prompt_payload += f"- {key}: {value}\n"

    if not settings.GEMINI_API_KEY:
        import logging

        logging.warning("GEMINI_API_KEY is missing – returning mock copywriting")
        headline = "PROMO DISKON HARI INI"
        subline = f"Dapatkan {product_description[:20]} dengan harga spesial."
        cta = "BELI SEKARANG"
        return {
            "variations": [
                {
                    "style": "FOMO",
                    "headline": headline,
                    "subline": subline,
                    "cta": cta,
                    "full_text": f"{headline}\n{subline}\n{cta}",
                },
                {
                    "style": "Benefit",
                    "headline": "KUALITAS TERJAMIN UNTUK ANDA",
                    "subline": "Rasakan manfaat perlindungan optimal tiap hari.",
                    "cta": "COBA SEKARANG",
                    "full_text": "KUALITAS TERJAMIN UNTUK ANDA\nRasakan manfaat perlindungan optimal tiap hari.\nCOBA SEKARANG",
                },
                {
                    "style": "Social Proof",
                    "headline": "RIBUAN ORANG SUDAH BUKTIKAN",
                    "subline": "Pilihan nomor 1 pelanggan di Indonesia.",
                    "cta": "ORDER SEKARANG",
                    "full_text": "RIBUAN ORANG SUDAH BUKTIKAN\nPilihan nomor 1 pelanggan di Indonesia.\nORDER SEKARANG",
                },
            ]
        }

    response = await asyncio.to_thread(
        call_gemini_with_fallback,
        client=client,
        primary_model="openrouter/minimax/minimax-01",
        fallback_model="openrouter/qwen/qwen-2.5-72b-instruct",
        contents=[prompt_payload],
        config=types.GenerateContentConfig(
            system_instruction=system_prompt_formatted,
            response_mime_type="application/json",
            response_schema=CopywritingResponse.model_json_schema(),
            temperature=0.8,
        ),
    )

    try:
        clean_json = extract_json_from_text(response.text)
        parsed = CopywritingResponse.model_validate_json(clean_json)
        return parsed.model_dump()
    except Exception as e:
        import logging
        snippet = response.text[:200] + "..." if len(response.text) > 200 else response.text
        logging.exception(f"Error extracting copywriting via LLM. Snippet: {snippet}")
        raise e

