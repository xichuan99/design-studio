"""Tests for llm_service.py.

All tests mock asyncio.to_thread so no real Gemini API calls are made.
This makes tests CI-safe (no GOOGLE_API_KEY needed, no 503 flakiness).
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.llm_service import (
    generate_copywriting_questions,
    generate_unified_brief_questions,
    modify_visual_prompt,
    parse_design_text,
)
from app.services.pipeline_prompt_builder import build_final_prompt, build_rules_a, build_rules_b
from app.schemas.design import ParsedTextElements


def _fake_response(payload: dict) -> MagicMock:
    """Minimal fake of a Gemini GenerateContentResponse."""
    mock = MagicMock()
    mock.text = json.dumps(payload)
    return mock


async def _async_fake(payload: dict):
    """Async wrapper that returns the fake response, used as side_effect."""
    return _fake_response(payload)


# ---------------------------------------------------------------------------
# Baseline payload (matches ParsedTextElements schema)
# ---------------------------------------------------------------------------
_BASE = {
    "headline": "Summer Sale 30% Off",
    "sub_headline": "Limited time offer",
    "cta": "Shop Now",
    "visual_prompt": "sunny beach scene, vibrant colors",
    "visual_prompt_parts": [
        {"category": "style", "label": "Style", "value": "vibrant", "enabled": True}
    ],
    "suggested_colors": ["#FF6B6B", "#4ECDC4"],
    "font_suggestion": "Inter",
    "text_position": "bottom",
    "headline_layout": None,
    "sub_headline_layout": None,
    "cta_layout": None,
    "indonesian_translation": "Scene pantai cerah, warna vibrant",
}


# ---------------------------------------------------------------------------
# parse_design_text tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_parse_food_promo():
    payload = {**_BASE, "headline": "Seblak Pedas 50% OFF"}
    with patch(
        "asyncio.to_thread", new=AsyncMock(return_value=_fake_response(payload))
    ):
        result = await parse_design_text("Promo Seblak Pedas, Diskon 50% khusus Jumat")

    assert isinstance(result, ParsedTextElements)
    assert result.headline
    assert result.visual_prompt
    assert len(result.suggested_colors) >= 1
    assert all(c.startswith("#") for c in result.suggested_colors)


@pytest.mark.asyncio
async def test_parse_minimal():
    payload = {**_BASE, "headline": "Flash Sale", "sub_headline": None, "cta": None}
    with patch(
        "asyncio.to_thread", new=AsyncMock(return_value=_fake_response(payload))
    ):
        result = await parse_design_text("Flash Sale")

    assert isinstance(result, ParsedTextElements)
    assert result.headline
    assert result.visual_prompt


@pytest.mark.asyncio
async def test_parse_long_text():
    payload = {
        **_BASE,
        "headline": "Grand Opening",
        "sub_headline": "Diskon 70% semua item",
        "cta": "Kunjungi Sekarang",
    }
    with patch(
        "asyncio.to_thread", new=AsyncMock(return_value=_fake_response(payload))
    ):
        result = await parse_design_text(
            "Grand Opening Toko Baju Anak Matahari, Diskon up to 70% semua item, "
            "gratis goodie bag untuk 100 pembeli pertama, tanggal 15 Maret 2026."
        )

    assert isinstance(result, ParsedTextElements)
    assert len(result.headline.split()) <= 6
    assert result.sub_headline is not None
    assert result.cta is not None


@pytest.mark.asyncio
async def test_output_matches_schema():
    payload = {**_BASE, "headline": "Bakso Mercon Beli 2 Gratis 1"}
    with patch(
        "asyncio.to_thread", new=AsyncMock(return_value=_fake_response(payload))
    ):
        result = await parse_design_text("Bakso Mercon Promo Beli 2 Gratis 1")

    assert isinstance(result, ParsedTextElements)
    assert isinstance(result.headline, str)
    assert isinstance(result.visual_prompt, str)
    assert isinstance(result.suggested_colors, list)


@pytest.mark.asyncio
async def test_parse_english_text():
    payload = {**_BASE, "headline": "Summer Collection 30% OFF"}
    with patch(
        "asyncio.to_thread", new=AsyncMock(return_value=_fake_response(payload))
    ):
        result = await parse_design_text("Summer Collection 2026 - 30% OFF everything")

    assert isinstance(result, ParsedTextElements)
    assert result.headline
    assert result.visual_prompt


@pytest.mark.asyncio
async def test_parse_design_text_accepts_chattery_json_response():
    payload = {**_BASE, "headline": "Weekend Sale"}
    response = MagicMock()
    response.text = (
        "Baik, berikut hasil terstrukturnya.\n"
        f"{json.dumps(payload)}\n"
        "{\"ignored_debug\": true}"
    )

    with patch("asyncio.to_thread", new=AsyncMock(return_value=response)):
        result = await parse_design_text("Weekend sale 40% off")

    assert isinstance(result, ParsedTextElements)
    assert result.headline == "Weekend Sale"


@pytest.mark.asyncio
async def test_generate_unified_brief_questions_accepts_list_payload():
    payload = [
        {
            "id": "audience",
            "question": "Siapa target audiens utama?",
            "type": "choice",
            "options": ["Remaja", "Dewasa"],
            "default": "Dewasa",
        }
    ]

    with patch(
        "asyncio.to_thread", new=AsyncMock(return_value=_fake_response(payload))
    ):
        result = await generate_unified_brief_questions("Promo kopi susu")

    assert "questions" in result
    assert isinstance(result["questions"], list)
    assert result["questions"][0]["id"] == "audience"


@pytest.mark.asyncio
async def test_generate_copywriting_questions_accepts_clarification_questions_key(monkeypatch):
    payload = {
        "clarification_questions": [
            {
                "id": "promo_detail",
                "question": "Promo apa yang mau ditonjolkan?",
                "type": "text",
                "options": [],
                "default": "",
            }
        ]
    }

    with patch(
        "app.services.llm_copywriting_service.get_genai_client",
        return_value=MagicMock(),
    ), patch("asyncio.to_thread", new=AsyncMock(return_value=_fake_response(payload))):
        result = await generate_copywriting_questions("Diskon kopi 30%")

    assert "questions" in result
    assert result["questions"][0]["id"] == "promo_detail"


def test_build_rules_a_includes_brand_and_clarification_context():
    prompt = build_rules_a(
        clarification_answers={"mood": "Minimalis & Modern"},
        brand_colors=["#112233", "#445566"],
        brand_typography={"primary_font": "Inter", "secondary_font": "Poppins"},
        brand_memory_context=["Hindari gaya terlalu ramai"],
    )

    assert "RULES A" in prompt
    assert "USER'S CLARIFICATION ANSWERS" in prompt
    assert "#112233" in prompt
    assert "Primary Font: \"Inter\"" in prompt
    assert "Hindari gaya terlalu ramai" in prompt


def test_build_rules_b_constrains_backend_controlled_composition():
    prompt = build_rules_b()

    assert "RULES B" in prompt
    assert "backend selects the final composition" in prompt.lower()
    assert "do not invent, override, or contradict copy-space" in prompt.lower()
    assert "layout coordinates are advisory fallback hints only" in prompt.lower()


@pytest.mark.asyncio
async def test_parse_design_text_uses_rules_a_and_rules_b_prompt_builder():
    captured = {}

    async def _capture_to_thread(func, *args, **kwargs):
        captured["system_instruction"] = kwargs["config"].system_instruction
        return _fake_response(_BASE)

    with patch("app.services.llm_design_service.get_genai_client", return_value=MagicMock()), patch(
        "app.services.llm_design_service.settings.OPENROUTER_API_KEY", "test-key"
    ), patch("asyncio.to_thread", new=_capture_to_thread):
        result = await parse_design_text("Promo kopi susu kekinian")

    assert isinstance(result, ParsedTextElements)
    assert "RULES A" in captured["system_instruction"]
    assert "RULES B" in captured["system_instruction"]
    assert "backend selects the final composition" in captured["system_instruction"].lower()


# ---------------------------------------------------------------------------
# modify_visual_prompt test
# ---------------------------------------------------------------------------

_MODIFY_PAYLOAD = {
    "modified_prompt_parts": [
        {
            "category": "subject",
            "label": "Objek Utama",
            "value": "A dark coffee cup",
            "enabled": True,
        },
        {
            "category": "style",
            "label": "Gaya",
            "value": "dramatic, moody",
            "enabled": True,
        },
    ],
    "modified_visual_prompt": "A dark coffee cup, dramatic, moody",
    "indonesian_translation": "Cangkir kopi gelap, dramatis dan misterius",
}


@pytest.mark.asyncio
async def test_modify_visual_prompt():
    original_parts = [
        {
            "category": "subject",
            "label": "Objek Utama",
            "value": "A cup of coffee",
            "enabled": True,
        },
        {"category": "style", "label": "Gaya", "value": "minimalist", "enabled": True},
    ]
    with patch(
        "asyncio.to_thread", new=AsyncMock(return_value=_fake_response(_MODIFY_PAYLOAD))
    ):
        result = await modify_visual_prompt(
            original_parts,
            "A cup of coffee, minimalist",
            "Buat lebih gelap dan dramatis",
        )

    assert "modified_prompt_parts" in result
    assert "modified_visual_prompt" in result
    assert isinstance(result["modified_prompt_parts"], list)
    assert len(result["modified_prompt_parts"]) > 0
