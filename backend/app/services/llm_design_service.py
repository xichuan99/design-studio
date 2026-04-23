import json
from typing import Optional
from google.genai import types
import asyncio
from app.core.ai_models import LLM_REASONING_FALLBACK, LLM_REASONING_PRIMARY
from app.core.config import settings
from app.schemas.design import ParsedTextElements
from app.services.llm_client import get_genai_client, call_gemini_with_fallback
from app.services.llm_json_utils import (
    extract_json_from_text as _extract_json_from_text,
    parse_llm_json,
)

from app.services.llm_prompts import (
    SYSTEM_PROMPT,
    BRIEF_QUESTIONS_SYSTEM,
    UNIFIED_BRIEF_SYSTEM,
    REDESIGN_BRIEF_SYSTEM,
    MODIFY_PROMPT_SYSTEM,
)
def normalize_brief_questions_payload(payload: object) -> dict:
    from app.schemas.design import BriefQuestionsResponse

    if isinstance(payload, list):
        normalized = {"questions": payload}
    elif isinstance(payload, dict):
        normalized = dict(payload)
        if "clarification_questions" in normalized and "questions" not in normalized:
            normalized["questions"] = normalized.pop("clarification_questions")
    else:
        raise TypeError(
            "Brief questions response must be a JSON object or list of questions"
        )

    parsed = BriefQuestionsResponse.model_validate(normalized)
    return parsed.model_dump()


def extract_json_from_text(raw_text: str) -> str:
    """Backward-compatible wrapper for legacy imports in tests/services."""
    return _extract_json_from_text(raw_text)


async def generate_design_brief_questions(raw_text: str) -> dict:
    """
    Generates clarifying questions based on the user's initial raw text.

    Args:
        raw_text (str): The initial brief provided by the user.

    Returns:
        dict: A dictionary containing a list of questions structured according to `BriefQuestionsResponse`.

    Raises:
        Exception: If the LLM call or response parsing fails.
    """
    from app.schemas.design import BriefQuestionsResponse

    if not settings.OPENROUTER_API_KEY:
        import logging
        from unittest.mock import AsyncMock

        # If tests patched `asyncio.to_thread` with an AsyncMock, call through
        # so tests can supply a fake LLM response. Otherwise return a static
        # development mock to keep local dev usable without API keys.
        if isinstance(asyncio.to_thread, AsyncMock):
            response = await asyncio.to_thread(lambda: None)
            try:
                data = parse_llm_json(response.text)
                return normalize_brief_questions_payload(data)
            except Exception:
                logging.exception("Error normalizing mocked brief questions response")
                raise

        import logging

        logging.warning("OPENROUTER_API_KEY is missing – returning mock brief questions")
        return {
            "questions": [
                {
                    "id": "mood",
                    "question": "Seperti apa nuansa/mood yang Anda inginkan untuk desain ini?",
                    "type": "choice",
                    "options": [
                        "Elegan & Premium",
                        "Ceria & Fun",
                        "Minimalis & Bersih",
                        "Hangat & Cozy",
                    ],
                    "default": "Minimalis & Bersih",
                },
                {
                    "id": "color_palette",
                    "question": "Ada preferensi warna utama?",
                    "type": "choice",
                    "options": [
                        "Warna bumi (Coklat/Krem)",
                        "Warna pastel lembut",
                        "Warna mencolok/Terang",
                        "Bebas, pilihin AI",
                    ],
                    "default": "Bebas, pilihin AI",
                },
                {
                    "id": "specific_elements",
                    "question": "Apakah ada objek spesifik yang harus muncul di gambar? (misal: 'cangkir kopi di meja kayu')",
                    "type": "text",
                    "options": [],
                    "default": "Sesuai konteks saja",
                },
            ]
        }

    client = get_genai_client()

    response = await asyncio.to_thread(
        call_gemini_with_fallback,
        client=client,
        primary_model=LLM_REASONING_PRIMARY,
        fallback_model=LLM_REASONING_FALLBACK,
        contents=[
            f"Buatkan pertanyaan klarifikasi desain untuk deskripsi ini:\n{raw_text}"
        ],
        config=types.GenerateContentConfig(
            system_instruction=BRIEF_QUESTIONS_SYSTEM,
            response_mime_type="application/json",
            response_schema=BriefQuestionsResponse,
            temperature=0.7,
        ),
    )

    try:
        data = parse_llm_json(response.text)
        return normalize_brief_questions_payload(data)
    except Exception as e:
        import logging

        snippet = response.text[:200] + "..." if len(response.text) > 200 else response.text
        logging.exception(f"Error extracting design questions via LLM. Snippet: {snippet}")
        raise e


async def generate_unified_brief_questions(
    raw_text: str, mode: str = "generate"
) -> dict:
    """
    Generates combined clarifying questions for both design and copywriting.

    Args:
        raw_text (str): The initial brief provided by the user.
        mode (str): The mode of generation ("generate" or "redesign").

    Returns:
        dict: A dictionary containing a list of questions structured according to `BriefQuestionsResponse`.

    Raises:
        Exception: If the LLM call or response parsing fails.
    """
    from app.schemas.design import BriefQuestionsResponse

    if not settings.OPENROUTER_API_KEY:
        import logging
        from unittest.mock import AsyncMock

        # Allow tests to patch `asyncio.to_thread` and provide a fake response
        # even when the API key isn't set. Otherwise return the dev mock.
        if isinstance(asyncio.to_thread, AsyncMock):
            response = await asyncio.to_thread(lambda: None)
            try:
                data = parse_llm_json(response.text)
                return normalize_brief_questions_payload(data)
            except Exception:
                logging.exception("Error normalizing mocked unified questions response")
                raise

        import logging

        logging.warning("OPENROUTER_API_KEY is missing – returning mock unified questions")

        if mode == "redesign":
            return {
                "questions": [
                    {
                        "id": "keep_elements",
                        "question": "Elemen apa yang paling INGIN DIPERTAHANKAN dari gambar asli?",
                        "type": "choice",
                        "options": [
                            "Warna dan Vibe",
                            "Layout / Posisi",
                            "Objek Utama Saja",
                            "Ganti Semua (Total Redesign)",
                        ],
                        "default": "Warna dan Vibe",
                    },
                    {
                        "id": "redesign_focus",
                        "question": "Perubahan apa yang paling difokuskan?",
                        "type": "text",
                        "options": [],
                        "default": "Bikin lebih modern",
                    },
                    {
                        "id": "text_copy",
                        "question": "Apakah teks/copywriting di desain lama tetap dipakai?",
                        "type": "choice",
                        "options": [
                            "Ya, tetap persis",
                            "Diganti dengan yang baru",
                            "Tidak perlu teks",
                        ],
                        "default": "Ya, tetap persis",
                    },
                ]
            }

        return {
            "questions": [
                {
                    "id": "audience_tone",
                    "question": "Siapakah target audiens Anda & gaya bahasa apa yang cocok?",
                    "type": "choice",
                    "options": [
                        "Anak Muda (Kasual & Santai)",
                        "Profesional (Formal & Elegan)",
                        "Ibu Rumah Tangga (Ramah & Hangat)",
                        "Umum (Persuasif)",
                    ],
                    "default": "Umum (Persuasif)",
                },
                {
                    "id": "design_mood",
                    "question": "Nuansa visual seperti apa yang Anda bayangkan untuk desainnya?",
                    "type": "choice",
                    "options": [
                        "Elegan & Mewah",
                        "Ceria & Colorful",
                        "Minimalis & Modern",
                        "Estetik & Kalem",
                    ],
                    "default": "Minimalis & Modern",
                },
                {
                    "id": "promo_benefit",
                    "question": "Apa keunggulan utama atau promo khusus yang ingin ditonjolkan?",
                    "type": "text",
                    "options": [],
                    "default": "",
                },
                {
                    "id": "specific_objects",
                    "question": "Apakah ada objek tertentu yang wajib ada di gambar? (misal: 'gelas es kopi di meja')",
                    "type": "text",
                    "options": [],
                    "default": "",
                },
            ]
        }

    client = get_genai_client()

    system_instruction = (
        REDESIGN_BRIEF_SYSTEM if mode.lower() == "redesign" else UNIFIED_BRIEF_SYSTEM
    )

    response = await asyncio.to_thread(
        call_gemini_with_fallback,
        client=client,
        primary_model=LLM_REASONING_PRIMARY,
        fallback_model=LLM_REASONING_FALLBACK,
        contents=[
            f"Buatkan pertanyaan klarifikasi desain & copywriting untuk deskripsi ini:\n{raw_text}"
        ],
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=BriefQuestionsResponse,
            temperature=0.7,
        ),
    )

    try:
        data = parse_llm_json(response.text)
        return normalize_brief_questions_payload(data)
    except Exception as e:
        import logging

        snippet = response.text[:200] + "..." if len(response.text) > 200 else response.text
        logging.exception(f"Error extracting unified questions via LLM. Snippet: {snippet}")
        raise e


async def parse_design_text(
    raw_text: str,
    integrated_text: bool = False,
    clarification_answers: Optional[dict] = None,
    brand_colors: Optional[list[str]] = None,
    brand_typography: Optional[dict] = None,
    brand_memory_context: Optional[list[str]] = None,
) -> ParsedTextElements:
    """
    Parses raw text into structured design elements and a visual prompt.

    Args:
        raw_text (str): The raw text to parse and design from.
        integrated_text (bool): Whether text should be integrated into the image generation. Defaults to False.
        clarification_answers (Optional[dict]): User's answers to clarification questions. Defaults to None.
        brand_colors (Optional[list[str]]): List of hex colors from the active brand kit. Defaults to None.
        brand_typography (Optional[dict]): Dictionary of fonts from the active brand kit. Defaults to None.
        brand_memory_context (Optional[list[str]]): RAG context retrieved from brand guidelines. Defaults to None.

    Returns:
        ParsedTextElements: An object containing layout details, visual prompt parts, and translations.

    Raises:
        Exception: If the LLM call or response parsing fails.
    """

    prompt_modifier = ""
    if integrated_text:
        prompt_modifier = """
        IMPORTANT INTEGRATED TEXT OVERRIDE:
        The user wants the text completely integrated into the image generation itself.
        Instead of asking for 'copy space', your `visual_prompt` MUST explicitly tell the image generator to render the headline text natively in the scene.
        - headline can be up to 8 words for reliable AI text rendering
        - sub_headline and CTA text SHOULD also be rendered in the image with proper visual hierarchy
        - Headline should be the largest, most prominent text. Sub-headline smaller. CTA as a button-like or badge-like element.
        - Use scene context for natural text (neon sign, chalkboard, banner, poster on wall)
        Example visual_prompt: "A hyper-realistic 3D render of a neon sign that spells 'MEGA SALE', vibrant cyberpunk street background, bold typography."
        """

    clarification_modifier = ""
    if clarification_answers:
        clarification_modifier = f"""
        USER'S CLARIFICATION ANSWERS:
        The user has provided the following specific details for the design. YOU MUST incorporate these into your visual_prompt and visual_prompt_parts.
        {json.dumps(clarification_answers, indent=2)}
        """

    brand_colors_modifier = ""
    if brand_colors:
        brand_colors_modifier = f"""
        BRAND COLORS:
        The user has an active Brand Kit. You MUST use these exact colors for the suggested_colors and coordinate the layout elements to use these colors:
        {json.dumps(brand_colors)}
        In the visual_prompt_parts 'colors' category, explicitly mention these hex codes or their nearest color name equivalents.
        """

    brand_typography_modifier = ""
    if brand_typography:
        primary_font = brand_typography.get("primary_font", "")
        secondary_font = brand_typography.get("secondary_font", "")
        if primary_font or secondary_font:
            brand_typography_modifier = f"""
        BRAND TYPOGRAPHY:
        The user has an active Brand Kit with specific fonts. You MUST use these fonts:
        - Primary Font: "{primary_font}" -> Use this for headline_layout.font_family
        - Secondary Font: "{secondary_font}" -> Use this for sub_headline_layout.font_family AND cta_layout.font_family
        Do NOT use any other font. These brand fonts are mandatory.
        """

    brand_memory_modifier = ""
    if brand_memory_context:
        brand_memory_modifier = f"""
        BRAND GUIDELINES & CONTEXT (RAG MEMORY):
        The user's brand has specific historical guidelines and constraints. YOU MUST incorporate these rules into your design decisions:
        {json.dumps(brand_memory_context, indent=2)}
        """

    final_prompt = (
        SYSTEM_PROMPT
        + prompt_modifier
        + clarification_modifier
        + brand_colors_modifier
        + brand_typography_modifier
        + brand_memory_modifier
    )

    if not settings.OPENROUTER_API_KEY:
        # Allow tests to patch asyncio.to_thread and provide fake LLM responses
        # even when API key is missing; otherwise return the development mock.
        import logging
        from unittest.mock import AsyncMock

        if isinstance(asyncio.to_thread, AsyncMock):
            response = await asyncio.to_thread(lambda: None)
            try:
                data = parse_llm_json(response.text)
                return ParsedTextElements(**data)
            except Exception:
                snippet = (
                    response.text[:200] + "..."
                    if len(response.text) > 200
                    else response.text
                )
                logging.exception(
                    "Error parsing mocked design text response. Snippet: %s", snippet
                )
                raise

        # Dev-mode mock: return sample parsed elements so the app is usable without an API key
        logging.warning(
            "OPENROUTER_API_KEY is missing – returning mock parsed data for development"
        )
        words = raw_text.split()
        headline = " ".join(words[:5]) if len(words) >= 5 else raw_text[:40]
        return ParsedTextElements(
            headline=headline.upper(),
            sub_headline=" ".join(words[5:15])
            if len(words) > 5
            else "Penawaran spesial untuk Anda",
            cta="Pesan Sekarang",
            visual_prompt=f"Professional product photography, {raw_text[:60]}, vibrant colors, clean composition with copy space on the right side, modern aesthetic",
            indonesian_translation=f"Fotografi produk profesional bertema '{raw_text[:40]}' dengan warna cerah, komposisi bersih, dan ruang kosong di sisi kanan untuk teks.",
            visual_prompt_parts=[
                {
                    "category": "style",
                    "label": "Gaya Visual",
                    "value": "Professional product photography",
                    "enabled": True,
                },
                {
                    "category": "subject",
                    "label": "Objek Utama",
                    "value": raw_text[:60],
                    "enabled": True,
                },
                {
                    "category": "colors",
                    "label": "Palet Warna",
                    "value": "vibrant colors",
                    "enabled": True,
                },
                {
                    "category": "setting",
                    "label": "Latar",
                    "value": "clean composition with copy space on the right side",
                    "enabled": True,
                },
                {
                    "category": "extra",
                    "label": "Estetika",
                    "value": "modern aesthetic",
                    "enabled": True,
                },
            ],
            suggested_colors=["#6C2BEE", "#F59E0B", "#10B981"],
            headline_layout={
                "x": 0.7,
                "y": 0.3,
                "font_family": "Montserrat",
                "font_size": 72,
                "font_weight": 700,
                "color": "#FFFFFF",
                "align": "center",
            },
            sub_headline_layout={
                "x": 0.7,
                "y": 0.5,
                "font_family": "Inter",
                "font_size": 36,
                "font_weight": 400,
                "color": "#FFFFFF",
                "align": "center",
            },
            cta_layout={
                "x": 0.7,
                "y": 0.7,
                "font_family": "Inter",
                "font_size": 28,
                "font_weight": 700,
                "color": "#F59E0B",
                "align": "center",
            },
        )

    # Initialize client lazily to prevent global collection crashes during testing
    client = get_genai_client()

    # We use Flash for lowest latency, passing schema to force JSON structure natively
    response = await asyncio.to_thread(
        call_gemini_with_fallback,
        client=client,
        primary_model=LLM_REASONING_PRIMARY,
        fallback_model=LLM_REASONING_FALLBACK,
        contents=[raw_text],
        config=types.GenerateContentConfig(
            system_instruction=final_prompt,
            response_mime_type="application/json",
            response_schema=ParsedTextElements,
        ),
    )

    # We parse the response text instead of using dynamic decoding structure, though the types are standard JSON
    try:
        data = parse_llm_json(response.text)
        return ParsedTextElements(**data)
    except Exception as e:
        import logging
        snippet = response.text[:200] + "..." if len(response.text) > 200 else response.text
        logging.exception(f"Error parsing design text via LLM. Snippet: {snippet}")
        raise e


async def modify_visual_prompt(
    original_parts: list, original_visual_prompt: str, instruction: str
) -> dict:
    """
    Modifies existing English prompt parts based on an Indonesian user instruction.

    Args:
        original_parts (list): The list of current visual prompt parts.
        original_visual_prompt (str): The current full visual prompt string.
        instruction (str): The user's instruction (in Indonesian) for how to modify the prompt.

    Returns:
        dict: A dictionary containing the updated parts and full prompt, structured according to `ModifyPromptResponse`.

    Raises:
        Exception: If the LLM call or response parsing fails.
    """
    from app.schemas.design import ModifyPromptResponse

    if not settings.OPENROUTER_API_KEY:
        import logging

        logging.warning("OPENROUTER_API_KEY is missing – returning mock modified data")
        # simple mock
        new_parts = []
        for p in original_parts:
            # We copy because dicts are mutable
            copied = dict(p) if isinstance(p, dict) else p.model_dump()
            if copied["category"] == "style" or copied["category"] == "extra":
                copied["value"] += f" ({instruction} applied)"
            new_parts.append(copied)

        combined = ", ".join(p["value"] for p in new_parts if p.get("enabled", True))
        return ModifyPromptResponse(
            modified_prompt_parts=new_parts,
            modified_visual_prompt=combined,
            indonesian_translation=f"Terjemahan mock untuk: {combined}",
        ).model_dump()

    client = get_genai_client()

    # Send the original parts as a JSON dumped string for Gemini to read easily
    # Ensure parts are dicts
    parts_dicts = [
        p.model_dump() if hasattr(p, "model_dump") else dict(p) for p in original_parts
    ]

    input_text = f"ORIGINAL FULL PROMPT:\n{original_visual_prompt}\n\nORIGINAL PROMPT PARTS:\n{json.dumps(parts_dicts, indent=2)}\n\nUSER INSTRUCTION (ID):\n{instruction}"

    response = await asyncio.to_thread(
        call_gemini_with_fallback,
        client=client,
        primary_model=LLM_REASONING_PRIMARY,
        fallback_model=LLM_REASONING_FALLBACK,
        contents=[input_text],
        config=types.GenerateContentConfig(
            system_instruction=MODIFY_PROMPT_SYSTEM,
            response_mime_type="application/json",
            response_schema=ModifyPromptResponse,
        ),
    )

    try:
        data = parse_llm_json(response.text)
    except Exception as e:
        import logging
        snippet = response.text[:200] + "..." if len(response.text) > 200 else response.text
        logging.exception(f"Error parsing modified prompt via LLM. Snippet: {snippet}")
        raise e

    # SAFETY NET: Reconstruct the combined prompt from the parts to guarantee No Shortening
    assembled_prompt = ", ".join(
        p["value"] for p in data["modified_prompt_parts"] if p.get("enabled", True)
    )

    # If Gemini returned a very short combined prompt, override it with our assembled one
    if len(assembled_prompt) > len(data.get("modified_visual_prompt", "")):
        data["modified_visual_prompt"] = assembled_prompt

    return data


async def generate_project_title(prompt: str) -> str:
    """
    Generates a short, catchy project title based on the user's prompt.

    Args:
        prompt (str): The description or prompt used for the project.

    Returns:
        str: A short, descriptive project title.

    Raises:
        ValueError: If the LLM returns an empty response.
        Exception: If the LLM call fails (handled internally by returning a fallback title).
    """
    if not settings.OPENROUTER_API_KEY:
        import logging

        logging.warning("OPENROUTER_API_KEY is missing – returning mock title")
        words = prompt.split()
        return " ".join(words[:4]).title() if words else "Desain AI Baru"

    client = get_genai_client()

    system_instruction = (
        "You are an assistant that creates short, descriptive, and catchy project titles "
        "(2 to 5 words max) based on a description. Respond ONLY with the title. "
        "Ensure the language matches the prompt's language (mostly Indonesian)."
    )

    try:
        response = await asyncio.to_thread(
            call_gemini_with_fallback,
            client=client,
            primary_model=LLM_REASONING_PRIMARY,
            fallback_model=LLM_REASONING_FALLBACK,
            contents=[f"Create a short title for this design prompt: {prompt}"],
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
                max_output_tokens=100,
            ),
        )
        if hasattr(response, "text") and response.text:
            title = response.text.strip().replace('"', "")
            return title if title else "Desain AI Baru"
        else:
            raise ValueError(
                "Empty response from LLM (potentially blocked by safety filters)"
            )
    except Exception as e:
        import logging

        logging.exception(f"Failed to generate project title: {e}")
        # Fallback to truncated prompt
        words = prompt.split()
        return (
            " ".join(words[:5]).title() + ("..." if len(words) > 5 else "")
            if words
            else "Desain AI Baru"
        )

