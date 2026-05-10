from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.services.placement_engine import place_elements

SAFE_MIN = 0.05
SAFE_MAX = 0.95
MIN_Y_GAP = 0.12
ROLE_ORDER = ["headline", "sub_headline", "cta"]


@dataclass
class ValidationResult:
    is_valid: bool
    flags: list[str]


def _as_layout_dict(item: Any) -> dict[str, Any]:
    if isinstance(item, dict):
        return dict(item)
    return {
        "role": getattr(item, "role"),
        "x": getattr(item, "x"),
        "y": getattr(item, "y"),
        "font_size": getattr(item, "font_size", None),
        "font_weight": getattr(item, "font_weight", None),
        "text_align": getattr(item, "text_align", None),
        "outline": getattr(item, "outline", None),
    }


def _normalize_layouts(layouts: list[Any]) -> list[dict[str, Any]]:
    return [_as_layout_dict(item) for item in layouts]


def _role_rank(role: str) -> int:
    try:
        return ROLE_ORDER.index(role)
    except ValueError:
        return len(ROLE_ORDER)


def validate_layout(
    layouts: list[Any],
    *,
    set_num: int,
    ratio: str,
    copy_space_side: str,
) -> ValidationResult:
    normalized = _normalize_layouts(layouts)
    flags: list[str] = []

    if not normalized:
        return ValidationResult(is_valid=True, flags=[])

    ordered_by_y = sorted(normalized, key=lambda item: (float(item.get("y", 0)), _role_rank(str(item.get("role", "")))))
    role_sequence = [str(item.get("role", "")) for item in ordered_by_y]
    expected_sequence = [role for role in ROLE_ORDER if any(str(item.get("role")) == role for item in normalized)]

    if role_sequence != expected_sequence:
        flags.append("role_order_invalid")

    cta_items = [item for item in normalized if str(item.get("role")) == "cta"]
    if cta_items:
        cta_y = max(float(item.get("y", 0)) for item in cta_items)
        max_y = max(float(item.get("y", 0)) for item in normalized)
        if cta_y < max_y:
            flags.append("cta_not_bottommost")

    for item in normalized:
        x = float(item.get("x", 0))
        y = float(item.get("y", 0))
        if not (SAFE_MIN <= x <= SAFE_MAX and SAFE_MIN <= y <= SAFE_MAX):
            flags.append("safe_bounds_violation")
            break

    for idx in range(len(ordered_by_y) - 1):
        current_y = float(ordered_by_y[idx].get("y", 0))
        next_y = float(ordered_by_y[idx + 1].get("y", 0))
        if next_y - current_y < MIN_Y_GAP:
            flags.append("minimum_y_gap_violation")
            break

    if set_num == 4:
        for item in normalized:
            y = float(item.get("y", 0))
            if 0.25 <= y <= 0.75:
                flags.append("set4_center_dead_zone_violation")
                break

    xs = [float(item.get("x", 0)) for item in normalized]
    ys = [float(item.get("y", 0)) for item in normalized]

    # X uniqueness: all text elements must have different X positions
    # unless intentionally aligned as a text column (Set 2 overflow exception)
    roles = [str(item.get("role", "")) for item in normalized]
    for i in range(len(xs)):
        for j in range(i + 1, len(xs)):
            if abs(xs[i] - xs[j]) < 0.01 and roles[i] != roles[j]:
                # Allow identical X in Sets 1-5 where placement engine intentionally aligns text columns
                # This validation is mainly for Gemini-generated layouts (Rules B parsing path)
                if set_num not in (1, 2, 3, 4, 5):
                    flags.append("x_non_unique")
                break
        else:
            continue
        break

    avg_x = sum(xs) / len(xs)
    avg_y = sum(ys) / len(ys)

    if copy_space_side == "left" and avg_x > 0.45:
        flags.append("copy_space_side_left_mismatch")
    elif copy_space_side == "right" and avg_x < 0.55:
        flags.append("copy_space_side_right_mismatch")
    elif copy_space_side == "bottom" and avg_y < 0.62:
        flags.append("copy_space_side_bottom_mismatch")

    deduped_flags = list(dict.fromkeys(flags))
    return ValidationResult(is_valid=not deduped_flags, flags=deduped_flags)


def autocorrect_layout(
    layouts: list[Any],
    *,
    set_num: int,
    ratio: str,
    copy_space_side: str,
) -> list[dict[str, Any]]:
    normalized = _normalize_layouts(layouts)
    roles_present = {str(item.get("role", "")) for item in normalized}

    baseline = place_elements(
        set_num=set_num,
        ratio=ratio,
        has_headline="headline" in roles_present,
        has_sub="sub_headline" in roles_present,
        has_cta="cta" in roles_present,
    )

    by_role = {str(item.get("role", "")): item for item in normalized}
    corrected: list[dict[str, Any]] = []
    for generated in baseline.layouts:
        original = by_role.get(generated.role, {})
        corrected.append(
            {
                "role": generated.role,
                "x": min(max(float(generated.x), SAFE_MIN), SAFE_MAX),
                "y": min(max(float(generated.y), SAFE_MIN), SAFE_MAX),
                "font_size": original.get("font_size", generated.font_size),
                "font_weight": original.get("font_weight", generated.font_weight),
                "text_align": original.get("text_align", generated.text_align),
                "outline": original.get("outline", generated.outline),
            }
        )

    return corrected
