import pytest

from app.services.llm_design_service import extract_json_from_text
from app.services.llm_json_utils import parse_llm_json


@pytest.mark.parametrize(
    ("raw_text", "expected"),
    [
        (
            "Baik, berikut JSON-nya: {\"key\": \"value\"} Semoga membantu!",
            "{\"key\": \"value\"}",
        ),
        ("```json\n[{\"id\": 1}]\n```", "[{\"id\": 1}]"),
        ("Plain text without json fallback", "Plain text without json fallback"),
        (
            "Multiple blocks: {\"a\": 1} and {\"b\": 2}",
            "{\"a\": 1}",
        ),
        (
            "{\"first\": true}\n\n{\"second\": false}",
            "{\"first\": true}",
        ),
    ],
)
def test_extract_json_from_text(raw_text: str, expected: str):
    assert extract_json_from_text(raw_text) == expected


def test_parse_llm_json_handles_markdown_and_trailing_text():
    result = parse_llm_json(
        "```json\n{\"headline\": \"Promo\", \"cta\": \"Beli\"}\n```\nCatatan tambahan"
    )

    assert result == {"headline": "Promo", "cta": "Beli"}
