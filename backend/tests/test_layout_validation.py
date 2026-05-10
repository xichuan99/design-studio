import pytest

from app.services.layout_validation import autocorrect_layout, validate_layout
from app.services.placement_engine import place_elements


def _as_layout_dicts(result):
    layouts = result.layouts if hasattr(result, "layouts") else result
    return [
        {
            "role": el.role,
            "x": el.x,
            "y": el.y,
            "font_size": el.font_size,
            "font_weight": el.font_weight,
            "text_align": el.text_align,
            "outline": el.outline,
        }
        for el in layouts
    ]


@pytest.mark.parametrize(
    ("set_num", "ratio", "copy_space_side"),
    [
        (1, "1:1", "left"),
        (2, "1:1", "right"),
        (3, "9:16", "bottom"),
        (4, "9:16", "top_bottom"),
        (5, "16:9", "diagonal"),
    ],
)
def test_validate_layout_accepts_existing_placement_engine_layouts(set_num, ratio, copy_space_side):
    result = place_elements(set_num, ratio, True, True, True)
    validation = validate_layout(
        _as_layout_dicts(result),
        set_num=set_num,
        ratio=ratio,
        copy_space_side=copy_space_side,
    )

    assert validation.is_valid is True
    assert validation.flags == []


def test_validate_layout_rejects_cta_not_bottommost():
    layouts = [
        {"role": "headline", "x": 0.20, "y": 0.30},
        {"role": "cta", "x": 0.20, "y": 0.40},
        {"role": "sub_headline", "x": 0.20, "y": 0.55},
    ]

    validation = validate_layout(layouts, set_num=1, ratio="1:1", copy_space_side="left")

    assert validation.is_valid is False
    assert "cta_not_bottommost" in validation.flags
    assert "role_order_invalid" in validation.flags


def test_autocorrect_layout_restores_role_order_and_safe_bounds():
    layouts = [
        {"role": "headline", "x": -0.10, "y": 0.40},
        {"role": "cta", "x": 1.20, "y": 0.30},
        {"role": "sub_headline", "x": 0.90, "y": 1.10},
    ]

    corrected = autocorrect_layout(layouts, set_num=1, ratio="1:1", copy_space_side="left")
    validation = validate_layout(corrected, set_num=1, ratio="1:1", copy_space_side="left")

    ys = {item["role"]: item["y"] for item in corrected}
    assert all(0.05 <= item["x"] <= 0.95 for item in corrected)
    assert all(0.05 <= item["y"] <= 0.95 for item in corrected)
    assert ys["headline"] < ys["sub_headline"] < ys["cta"]
    assert validation.is_valid is True


def test_validate_layout_rejects_set4_center_dead_zone():
    layouts = [
        {"role": "headline", "x": 0.50, "y": 0.45},
        {"role": "sub_headline", "x": 0.50, "y": 0.55},
        {"role": "cta", "x": 0.50, "y": 0.91},
    ]

    validation = validate_layout(layouts, set_num=4, ratio="9:16", copy_space_side="top_bottom")

    assert validation.is_valid is False
    assert "set4_center_dead_zone_violation" in validation.flags


@pytest.mark.parametrize(
    ("copy_space_side", "layouts", "expected_flag"),
    [
        (
            "left",
            [
                {"role": "headline", "x": 0.82, "y": 0.35},
                {"role": "sub_headline", "x": 0.82, "y": 0.52},
                {"role": "cta", "x": 0.82, "y": 0.70},
            ],
            "copy_space_side_left_mismatch",
        ),
        (
            "right",
            [
                {"role": "headline", "x": 0.18, "y": 0.35},
                {"role": "sub_headline", "x": 0.18, "y": 0.52},
                {"role": "cta", "x": 0.18, "y": 0.70},
            ],
            "copy_space_side_right_mismatch",
        ),
        (
            "bottom",
            [
                {"role": "headline", "x": 0.50, "y": 0.20},
                {"role": "sub_headline", "x": 0.50, "y": 0.32},
                {"role": "cta", "x": 0.50, "y": 0.45},
            ],
            "copy_space_side_bottom_mismatch",
        ),
    ],
)
def test_validate_layout_rejects_copy_space_mismatch(copy_space_side, layouts, expected_flag):
    validation = validate_layout(layouts, set_num=1, ratio="1:1", copy_space_side=copy_space_side)

    assert validation.is_valid is False
    assert expected_flag in validation.flags
