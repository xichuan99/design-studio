from __future__ import annotations

from typing import Any

from app.services.layout_validation import autocorrect_layout, validate_layout
from app.services.placement_engine import select_and_place


LAYOUT_NAMES = {
    1: "Panel Kiri",
    2: "Panel Kanan",
    3: "Bottom Strip",
    4: "Center Drama",
    5: "Diagonal Modern",
}


def build_composition_contract(
    *,
    ratio: str,
    has_headline: bool,
    has_sub: bool,
    has_cta: bool,
    exclude_sets: list[int] | None = None,
    text_length_headline: int = 0,
) -> dict[str, Any]:
    placement = select_and_place(
        ratio,
        has_headline,
        has_sub,
        has_cta,
        exclude_sets=exclude_sets,
        text_length_headline=text_length_headline,
    )

    layout_elements = [
        {
            "role": el.role,
            "x": el.x,
            "y": el.y,
            "font_size": el.font_size,
            "font_weight": el.font_weight,
            "text_align": el.text_align,
            "outline": el.outline,
        }
        for el in placement.layouts
    ]

    validation = validate_layout(
        layout_elements,
        set_num=placement.set_num,
        ratio=placement.ratio,
        copy_space_side=placement.copy_space_side,
    )
    if not validation.is_valid:
        layout_elements = autocorrect_layout(
            layout_elements,
            set_num=placement.set_num,
            ratio=placement.ratio,
            copy_space_side=placement.copy_space_side,
        )
        validation = validate_layout(
            layout_elements,
            set_num=placement.set_num,
            ratio=placement.ratio,
            copy_space_side=placement.copy_space_side,
        )

    composition = {
        "set_num": placement.set_num,
        "ratio": placement.ratio,
        "copy_space_side": placement.copy_space_side,
        "layout_name": LAYOUT_NAMES.get(placement.set_num),
        "validation_flags": validation.flags,
    }

    return {
        "set_num": placement.set_num,
        "composition": composition,
        "image_prompt_modifier": placement.image_prompt_modifier,
        "layout_elements": layout_elements,
    }
