"""Helpers for parsing structured JSON out of chatty LLM responses."""

from __future__ import annotations

import json
import re
from json import JSONDecodeError


_JSON_START_RE = re.compile(r"[\[{]")


def strip_json_markdown_fences(text: str) -> str:
    """Remove common markdown code fences around JSON payloads."""
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]

    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    return cleaned.strip()


def extract_json_from_text(text: str) -> str:
    """Return the first valid JSON block found inside a model response."""
    cleaned = strip_json_markdown_fences(text)
    decoder = json.JSONDecoder()

    try:
        decoder.decode(cleaned)
        return cleaned
    except JSONDecodeError:
        pass

    for match in _JSON_START_RE.finditer(cleaned):
        start_index = match.start()
        try:
            _, end_index = decoder.raw_decode(cleaned[start_index:])
            return cleaned[start_index : start_index + end_index].strip()
        except JSONDecodeError:
            continue

    return cleaned


def parse_llm_json(text: str):
    """Parse the first valid JSON value embedded in an LLM response."""
    extracted = extract_json_from_text(text)
    return json.loads(extracted)