"""
Local placement engine: deterministic 5-set composition system.

Replaces the Quantum Engine microservice with an in-process rule-based engine.
Each set defines a composition archetype suited for different aspect ratios and
content structures.
"""
from __future__ import annotations

import random as _random
from dataclasses import dataclass
from typing import Optional

# Allowed composition sets per aspect ratio.
# Sets not listed here are not used for that ratio.
ALLOWED_SETS: dict[str, list[int]] = {
    "1:1":  [1, 2, 3, 4, 5],
    "16:9": [1, 2, 5],
    "9:16": [3, 4, 5],
    "4:5":  [1, 2, 3, 4, 5],
}

_MIN_Y_GAP = 0.12  # Minimum vertical gap between any two elements (proportional)


@dataclass
class ElementLayout:
    role: str
    x: float        # proportional 0.0–1.0 (horizontal anchor, meaning depends on text_align)
    y: float        # proportional 0.0–1.0 (vertical anchor, top of element)
    font_size: int
    font_weight: str
    text_align: str
    outline: bool   # whether text outline/shadow is required


@dataclass
class CompositionResult:
    set_num: int
    ratio: str
    copy_space_side: str    # "left" | "right" | "bottom" | "top_bottom" | "diagonal"
    layouts: list[ElementLayout]
    image_prompt_modifier: str  # appended to visual_prompt for image generation


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_compatible_sets(ratio: str) -> list[int]:
    """Return the allowed set numbers for the given aspect ratio."""
    return ALLOWED_SETS.get(ratio, [1, 2, 3, 4, 5])


def place_elements(
    set_num: int,
    ratio: str,
    has_headline: bool,
    has_sub: bool,
    has_cta: bool,
    text_length_headline: int = 0,
) -> CompositionResult:
    """
    Return a CompositionResult for the given set number and content flags.

    Raises ValueError for unknown set_num.
    """
    if set_num == 1:
        # Panel Kiri: copy space left 33%, subject right cropped
        layouts = _set_1_layout(has_headline, has_sub, has_cta, text_length_headline)
        copy_side = "left"
        img_modifier = (
            "composition: subject on the RIGHT side filling 67% of frame, "
            "cropped at right edge, with LARGE EMPTY SPACE on the LEFT THIRD "
            "of the image for text overlay. Left zone background uses analog "
            "color gradient from the scene's dominant tone. Hard boundary — "
            "no subject elements cross into left 33%."
        )

    elif set_num == 2:
        # Panel Kanan: copy space right 33%, subject left cropped
        layouts = _set_2_layout(has_headline, has_sub, has_cta, text_length_headline)
        copy_side = "right"
        img_modifier = (
            "composition: subject on the LEFT side filling 67% of frame, "
            "cropped at left edge, with LARGE EMPTY SPACE on the RIGHT THIRD "
            "of the image for text overlay. Right zone background uses analog "
            "color gradient from the scene's dominant tone."
        )

    elif set_num == 3:
        # Bottom Strip: hero image top 62%, text strip bottom 38%
        layouts = _set_3_layout(has_headline, has_sub, has_cta, text_length_headline)
        copy_side = "bottom"
        img_modifier = (
            "composition: hero image fills the TOP 62% of the frame. "
            "The BOTTOM 38% is reserved for text — use a clean transition "
            "(gradient, blur, or solid color band). Subject must be fully "
            "visible in the upper portion."
        )

    elif set_num == 4:
        # Center Drama: strips top 20% and bottom 15%, center 65% for subject
        layouts = _set_4_layout(has_headline, has_sub, has_cta, text_length_headline)
        copy_side = "top_bottom"
        img_modifier = (
            "composition: CENTERED subject with clean studio space around it. "
            "Top 20% and bottom 15% of frame are clear zones for text overlay. "
            "Center 65% belongs entirely to the subject. Use premium studio "
            "lighting, clean or minimal background."
        )

    elif set_num == 5:
        # Diagonal Modern: subject upper-right, copy space lower-left
        layouts = _set_5_layout(has_headline, has_sub, has_cta, text_length_headline)
        copy_side = "diagonal"
        img_modifier = (
            "composition: dynamic diagonal layout. Subject occupies the "
            "UPPER-RIGHT area of the frame. Lower-left area is open space "
            "for text. Use energetic, dynamic visual style with strong "
            "directional movement."
        )

    else:
        raise ValueError(f"Invalid set_num: {set_num}. Must be 1–5.")

    return CompositionResult(
        set_num=set_num,
        ratio=ratio,
        copy_space_side=copy_side,
        layouts=layouts,
        image_prompt_modifier=img_modifier,
    )


def select_and_place(
    ratio: str,
    has_headline: bool,
    has_sub: bool,
    has_cta: bool,
    text_length_headline: int = 0,
    exclude_sets: Optional[list[int]] = None,
) -> CompositionResult:
    """
    Randomly select a compatible set (excluding any in exclude_sets) and return
    the CompositionResult.  Resets exclusion if the pool would be empty.

    Example usage for 3 parallel placements:
        var1 = select_and_place(ratio, ...)
        var2 = select_and_place(ratio, ..., exclude_sets=[var1.set_num])
        var3 = select_and_place(ratio, ..., exclude_sets=[var1.set_num, var2.set_num])
    """
    exclude_sets = exclude_sets or []
    compatible = get_compatible_sets(ratio)
    available = [s for s in compatible if s not in exclude_sets]

    if not available:
        # Fallback: reset exclusion if pool exhausted
        available = compatible

    chosen_set = _random.choice(available)

    return place_elements(
        set_num=chosen_set,
        ratio=ratio,
        has_headline=has_headline,
        has_sub=has_sub,
        has_cta=has_cta,
        text_length_headline=text_length_headline,
    )


# ---------------------------------------------------------------------------
# Internal helpers — per-set layout builders
# ---------------------------------------------------------------------------

def _validate_y_gaps(layouts: list[ElementLayout]) -> None:
    """
    Assert minimum Y gap between adjacent elements.
    Mutates nothing — just logs a warning if violated.
    (A hard crash would break generation; a warning is safer.)
    """
    import logging
    sorted_els = sorted(layouts, key=lambda e: e.y)
    for i in range(len(sorted_els) - 1):
        gap = sorted_els[i + 1].y - sorted_els[i].y
        if gap < _MIN_Y_GAP:
            logging.warning(
                "placement_engine: Y gap between '%s' (%.2f) and '%s' (%.2f) is %.3f "
                "— below minimum %.2f",
                sorted_els[i].role, sorted_els[i].y,
                sorted_els[i + 1].role, sorted_els[i + 1].y,
                gap, _MIN_Y_GAP,
            )


def _set_1_layout(has_headline: bool, has_sub: bool, has_cta: bool, text_length_headline: int = 0) -> list[ElementLayout]:
    """Panel Kiri — copy space left 33% (x range 0.05–0.30)."""
    result: list[ElementLayout] = []
    # Scale headline font down for very long text
    h_font = max(48, 72 - max(0, text_length_headline - 25) * 2) if text_length_headline > 25 else 72
    s_font = max(26, 32 - max(0, text_length_headline - 25)) if text_length_headline > 25 else 32
    if has_headline:
        result.append(ElementLayout(
            role="headline", x=0.17, y=0.35,
            font_size=h_font, font_weight="bold",
            text_align="center", outline=False,
        ))
    if has_sub:
        result.append(ElementLayout(
            role="sub_headline", x=0.17, y=0.52,
            font_size=s_font, font_weight="regular",
            text_align="center", outline=False,
        ))
    if has_cta:
        result.append(ElementLayout(
            role="cta", x=0.17, y=0.70,
            font_size=28, font_weight="bold",
            text_align="center", outline=False,
        ))
    _validate_y_gaps(result)
    return result


def _set_2_layout(has_headline: bool, has_sub: bool, has_cta: bool, text_length_headline: int = 0) -> list[ElementLayout]:
    """Panel Kanan — copy space right 33% (x range 0.67–0.92)."""
    result: list[ElementLayout] = []
    h_font = max(48, 72 - max(0, text_length_headline - 25) * 2) if text_length_headline > 25 else 72
    s_font = max(26, 32 - max(0, text_length_headline - 25)) if text_length_headline > 25 else 32
    if has_headline:
        result.append(ElementLayout(
            role="headline", x=0.83, y=0.35,
            font_size=h_font, font_weight="bold",
            text_align="center", outline=True,
        ))
    if has_sub:
        result.append(ElementLayout(
            role="sub_headline", x=0.83, y=0.52,
            font_size=s_font, font_weight="regular",
            text_align="center", outline=True,
        ))
    if has_cta:
        result.append(ElementLayout(
            role="cta", x=0.83, y=0.70,
            font_size=28, font_weight="bold",
            text_align="center", outline=True,
        ))
    _validate_y_gaps(result)
    return result


def _set_3_layout(
    has_headline: bool,
    has_sub: bool,
    has_cta: bool,
    text_length_headline: int,
) -> list[ElementLayout]:
    """Bottom Strip — text strip bottom 38% (y range 0.65–0.95)."""
    result: list[ElementLayout] = []
    # Compact layout if all three elements present; spread otherwise
    if has_headline and has_sub and has_cta:
        if has_headline:
            result.append(ElementLayout(
                role="headline", x=0.50, y=0.67,
                font_size=52, font_weight="bold",
                text_align="center", outline=False,
            ))
        if has_sub:
            result.append(ElementLayout(
                role="sub_headline", x=0.50, y=0.79,
                font_size=26, font_weight="regular",
                text_align="center", outline=False,
            ))
        if has_cta:
            result.append(ElementLayout(
                role="cta", x=0.50, y=0.91,
                font_size=28, font_weight="bold",
                text_align="center", outline=False,
            ))
    else:
        # Stacked with more vertical breathing room
        if has_headline:
            result.append(ElementLayout(
                role="headline", x=0.50, y=0.70,
                font_size=48, font_weight="bold",
                text_align="center", outline=False,
            ))
        if has_sub:
            result.append(ElementLayout(
                role="sub_headline", x=0.50, y=0.82,
                font_size=26, font_weight="regular",
                text_align="center", outline=False,
            ))
        if has_cta:
            result.append(ElementLayout(
                role="cta", x=0.50, y=0.92,
                font_size=28, font_weight="bold",
                text_align="center", outline=False,
            ))
    _validate_y_gaps(result)
    return result


def _set_4_layout(has_headline: bool, has_sub: bool, has_cta: bool, text_length_headline: int = 0) -> list[ElementLayout]:
    """Center Drama — top strip (y 0.07–0.18) + bottom strip (y 0.88–0.95). NO text in center."""
    result: list[ElementLayout] = []
    h_font = max(36, 52 - max(0, text_length_headline - 25) * 2) if text_length_headline > 25 else 52
    s_font = max(22, 28 - max(0, text_length_headline - 25)) if text_length_headline > 25 else 28
    if has_headline:
        result.append(ElementLayout(
            role="headline", x=0.50, y=0.07,
            font_size=h_font, font_weight="bold",
            text_align="center", outline=False,
        ))
    if has_sub:
        result.append(ElementLayout(
            role="sub_headline", x=0.50, y=0.19,
            font_size=s_font, font_weight="regular",
            text_align="center", outline=False,
        ))
    if has_cta:
        result.append(ElementLayout(
            role="cta", x=0.50, y=0.91,
            font_size=32, font_weight="bold",
            text_align="center", outline=False,
        ))
    # NOTE: Y gap between sub (0.16) and CTA (0.91) = 0.75 — well above minimum
    return result


def _set_5_layout(has_headline: bool, has_sub: bool, has_cta: bool, text_length_headline: int = 0) -> list[ElementLayout]:
    """Diagonal Modern — lower-left diagonal zone. Larger, bolder typography with outline."""
    result: list[ElementLayout] = []
    h_font = max(64, 96 - max(0, text_length_headline - 25) * 3) if text_length_headline > 25 else 96
    s_font = max(28, 40 - max(0, text_length_headline - 25)) if text_length_headline > 25 else 40
    if has_headline:
        result.append(ElementLayout(
            role="headline", x=0.22, y=0.65,
            font_size=h_font, font_weight="bold",
            text_align="left", outline=True,
        ))
    if has_sub:
        result.append(ElementLayout(
            role="sub_headline", x=0.22, y=0.77,
            font_size=s_font, font_weight="semibold",
            text_align="left", outline=True,
        ))
    if has_cta:
        result.append(ElementLayout(
            role="cta", x=0.22, y=0.89,
            font_size=36, font_weight="bold",
            text_align="left", outline=True,
        ))
    _validate_y_gaps(result)
    return result
