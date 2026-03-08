import pytest
from app.services.llm_service import parse_design_text
from app.schemas.design import ParsedTextElements

@pytest.mark.asyncio
async def test_parse_food_promo():
    result = await parse_design_text("Promo Seblak Pedas, Diskon 50% khusus Jumat")
    assert isinstance(result, ParsedTextElements)
    assert result.headline
    assert result.visual_prompt
    assert len(result.suggested_colors) >= 1
    assert all(c.startswith("#") for c in result.suggested_colors)

@pytest.mark.asyncio
async def test_parse_minimal():
    result = await parse_design_text("Flash Sale")
    assert isinstance(result, ParsedTextElements)
    assert result.headline
    assert result.visual_prompt

@pytest.mark.asyncio
async def test_parse_long_text():
    text = "Grand Opening Toko Baju Anak Matahari, Diskon up to 70% semua item, gratis goodie bag untuk 100 pembeli pertama, tanggal 15 Maret 2026, di Mall Kelapa Gading Lt.2"
    result = await parse_design_text(text)
    assert isinstance(result, ParsedTextElements)
    assert len(result.headline.split()) <= 6  # Should be concise
    assert result.sub_headline is not None
    assert result.cta is not None

@pytest.mark.asyncio
async def test_output_matches_schema():
    result = await parse_design_text("Bakso Mercon Promo Beli 2 Gratis 1")
    assert isinstance(result, ParsedTextElements)
    assert isinstance(result.headline, str)
    assert isinstance(result.visual_prompt, str)
    assert isinstance(result.suggested_colors, list)

@pytest.mark.asyncio
async def test_parse_english_text():
    result = await parse_design_text("Summer Collection 2026 - 30% OFF everything")
    assert isinstance(result, ParsedTextElements)
    assert result.headline
    assert result.visual_prompt
