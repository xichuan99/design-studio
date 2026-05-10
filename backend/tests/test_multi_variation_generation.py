"""Tests for multi-variation generation."""
import json
from unittest.mock import patch

import pytest

from app.services.quantum_service import optimize_quantum_layout


@pytest.mark.asyncio
@patch("app.services.quantum_service.build_composition_variations")
async def test_optimize_quantum_layout_returns_multiple_variations(mock_build):
    mock_build.return_value = [
        {
            "set_num": 1,
            "composition": {"set_num": 1, "ratio": "1:1", "copy_space_side": "left"},
            "image_prompt_modifier": "copy space left",
            "layout_elements": [
                {"role": "headline", "x": 0.17, "y": 0.35, "font_size": 72, "font_weight": "bold", "text_align": "center", "outline": False}
            ],
        },
        {
            "set_num": 2,
            "composition": {"set_num": 2, "ratio": "1:1", "copy_space_side": "right"},
            "image_prompt_modifier": "copy space right",
            "layout_elements": [
                {"role": "headline", "x": 0.83, "y": 0.35, "font_size": 72, "font_weight": "bold", "text_align": "center", "outline": True}
            ],
        },
    ]

    result = await optimize_quantum_layout("Headline", None, None, ratio="1:1", num_variations=2)

    assert result is not None
    parsed = json.loads(result)
    assert len(parsed["variations"]) == 2
    assert parsed["variations"][0][0]["role"] == "headline"
    assert parsed["variations"][1][0]["role"] == "headline"


@pytest.mark.asyncio
@patch("app.services.quantum_service.build_composition_contract")
async def test_optimize_quantum_layout_single_variation(mock_build):
    mock_build.return_value = {
        "set_num": 1,
        "composition": {"set_num": 1, "ratio": "1:1", "copy_space_side": "left"},
        "image_prompt_modifier": "copy space left",
        "layout_elements": [
            {"role": "headline", "x": 0.17, "y": 0.35, "font_size": 72, "font_weight": "bold", "text_align": "center", "outline": False}
        ],
    }

    result = await optimize_quantum_layout("Headline", None, None, ratio="1:1", num_variations=1)

    assert result is not None
    parsed = json.loads(result)
    assert len(parsed["variations"]) == 1


@pytest.mark.asyncio
async def test_optimize_quantum_layout_returns_none_for_no_text():
    result = await optimize_quantum_layout(None, None, None, ratio="1:1")
    assert result is None
