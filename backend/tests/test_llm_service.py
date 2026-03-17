"""Tests for llm_service.py.

All tests mock asyncio.to_thread so no real Gemini API calls are made.
This makes tests CI-safe (no GOOGLE_API_KEY needed, no 503 flakiness).
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.llm_service import parse_design_text, modify_visual_prompt
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
    with patch("asyncio.to_thread", new=AsyncMock(return_value=_fake_response(payload))):
        result = await parse_design_text("Promo Seblak Pedas, Diskon 50% khusus Jumat")

    assert isinstance(result, ParsedTextElements)
    assert result.headline
    assert result.visual_prompt
    assert len(result.suggested_colors) >= 1
    assert all(c.startswith("#") for c in result.suggested_colors)


@pytest.mark.asyncio
async def test_parse_minimal():
    payload = {**_BASE, "headline": "Flash Sale", "sub_headline": None, "cta": None}
    with patch("asyncio.to_thread", new=AsyncMock(return_value=_fake_response(payload))):
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
    with patch("asyncio.to_thread", new=AsyncMock(return_value=_fake_response(payload))):
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
    with patch("asyncio.to_thread", new=AsyncMock(return_value=_fake_response(payload))):
        result = await parse_design_text("Bakso Mercon Promo Beli 2 Gratis 1")

    assert isinstance(result, ParsedTextElements)
    assert isinstance(result.headline, str)
    assert isinstance(result.visual_prompt, str)
    assert isinstance(result.suggested_colors, list)


@pytest.mark.asyncio
async def test_parse_english_text():
    payload = {**_BASE, "headline": "Summer Collection 30% OFF"}
    with patch("asyncio.to_thread", new=AsyncMock(return_value=_fake_response(payload))):
        result = await parse_design_text("Summer Collection 2026 - 30% OFF everything")

    assert isinstance(result, ParsedTextElements)
    assert result.headline
    assert result.visual_prompt


# ---------------------------------------------------------------------------
# modify_visual_prompt test
# ---------------------------------------------------------------------------

_MODIFY_PAYLOAD = {
    "modified_prompt_parts": [
        {"category": "subject", "label": "Objek Utama", "value": "A dark coffee cup", "enabled": True},
        {"category": "style",  "label": "Gaya",       "value": "dramatic, moody",    "enabled": True},
    ],
    "modified_visual_prompt": "A dark coffee cup, dramatic, moody",
    "indonesian_translation": "Cangkir kopi gelap, dramatis dan misterius",
}


@pytest.mark.asyncio
async def test_modify_visual_prompt():
    original_parts = [
        {"category": "subject", "label": "Objek Utama", "value": "A cup of coffee", "enabled": True},
        {"category": "style",   "label": "Gaya",        "value": "minimalist",       "enabled": True},
    ]
    with patch("asyncio.to_thread", new=AsyncMock(return_value=_fake_response(_MODIFY_PAYLOAD))):
        result = await modify_visual_prompt(
            original_parts,
            "A cup of coffee, minimalist",
            "Buat lebih gelap dan dramatis",
        )

    assert "modified_prompt_parts" in result
    assert "modified_visual_prompt" in result
    assert isinstance(result["modified_prompt_parts"], list)
    assert len(result["modified_prompt_parts"]) > 0
