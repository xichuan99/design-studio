from __future__ import annotations

import json
from typing import Optional


def build_rules_a(
    *,
    integrated_text: bool = False,
    clarification_answers: Optional[dict] = None,
    brand_colors: Optional[list[str]] = None,
    brand_typography: Optional[dict] = None,
    brand_memory_context: Optional[list[str]] = None,
) -> str:
    sections = [
        "RULES A — creative extraction and brand-grounded prompt building.",
        "Extract concise Indonesian marketing copy and generate strong visual direction from the user brief.",
        "Keep output schema unchanged: headline, sub_headline, cta, visual_prompt_parts, visual_prompt, suggested_colors, indonesian_translation, headline_layout, sub_headline_layout, cta_layout.",
    ]

    if integrated_text:
        sections.append(
            "IMPORTANT INTEGRATED TEXT OVERRIDE:\n"
            "The user wants the text rendered natively inside the image scene itself.\n"
            "- headline can be up to 8 words for reliable AI text rendering\n"
            "- sub_headline and CTA should also be rendered with clear hierarchy when feasible\n"
            "- use natural scene contexts like signage, banner, poster, packaging, menu board"
        )

    if clarification_answers:
        sections.append(
            "USER'S CLARIFICATION ANSWERS:\n"
            "Incorporate these details into visual_prompt and visual_prompt_parts.\n"
            f"{json.dumps(clarification_answers, indent=2)}"
        )

    if brand_colors:
        sections.append(
            "BRAND COLORS:\n"
            "Use these exact colors in suggested_colors and align the visual direction to them.\n"
            f"{json.dumps(brand_colors, indent=2)}"
        )

    if brand_typography:
        primary_font = brand_typography.get("primary_font", "") if isinstance(brand_typography, dict) else ""
        secondary_font = brand_typography.get("secondary_font", "") if isinstance(brand_typography, dict) else ""
        if primary_font or secondary_font:
            sections.append(
                "BRAND TYPOGRAPHY:\n"
                f"- Primary Font: \"{primary_font}\"\n"
                f"- Secondary Font: \"{secondary_font}\"\n"
                "Use these brand fonts in the layout fields when available."
            )

    if brand_memory_context:
        sections.append(
            "BRAND GUIDELINES & CONTEXT (RAG MEMORY):\n"
            "Honor these historical brand constraints and preferences.\n"
            f"{json.dumps(brand_memory_context, indent=2)}"
        )

    return "\n\n".join(sections)


def build_rules_b() -> str:
    return "\n\n".join(
        [
            "RULES B — backend-controlled composition constraints.",
            "The backend selects the final composition, safe zones, and copy-space contract.",
            "Do not invent, override, or contradict copy-space placement chosen downstream by the backend.",
            "Layout coordinates are advisory fallback hints only; they are not the source of truth for final placement.",
            "Do not claim authority over set selection, dead-zones, or geometric validation; those are enforced outside the model.",
            "When describing negative space in visual_prompt, keep it compatible with a backend-selected composition rather than hard-coding a new layout decision.",
        ]
    )


def build_final_prompt(
    *,
    system_prompt: str,
    integrated_text: bool = False,
    clarification_answers: Optional[dict] = None,
    brand_colors: Optional[list[str]] = None,
    brand_typography: Optional[dict] = None,
    brand_memory_context: Optional[list[str]] = None,
) -> str:
    return "\n\n".join(
        [
            system_prompt.strip(),
            build_rules_a(
                integrated_text=integrated_text,
                clarification_answers=clarification_answers,
                brand_colors=brand_colors,
                brand_typography=brand_typography,
                brand_memory_context=brand_memory_context,
            ).strip(),
            build_rules_b().strip(),
        ]
    )
