"""Unit tests for backend/app/services/placement_engine.py."""
import pytest

from app.services.placement_engine import (
    CompositionResult,
    get_compatible_sets,
    place_elements,
    select_and_place,
)


# ---------------------------------------------------------------------------
# get_compatible_sets
# ---------------------------------------------------------------------------

class TestGetCompatibleSets:
    def test_1_1_has_all_sets(self):
        assert get_compatible_sets("1:1") == [1, 2, 3, 4, 5]

    def test_16_9_limited_sets(self):
        sets = get_compatible_sets("16:9")
        assert sets == [1, 2, 5]

    def test_9_16_limited_sets(self):
        sets = get_compatible_sets("9:16")
        assert sets == [3, 4, 5]

    def test_4_5_has_all_sets(self):
        assert get_compatible_sets("4:5") == [1, 2, 3, 4, 5]

    def test_unknown_ratio_returns_all(self):
        result = get_compatible_sets("unknown")
        assert result == [1, 2, 3, 4, 5]


# ---------------------------------------------------------------------------
# place_elements — basic contract
# ---------------------------------------------------------------------------

class TestPlaceElements:
    @pytest.mark.parametrize("set_num", [1, 2, 3, 4, 5])
    def test_returns_composition_result(self, set_num):
        result = place_elements(
            set_num=set_num,
            ratio="1:1",
            has_headline=True,
            has_sub=True,
            has_cta=True,
        )
        assert isinstance(result, CompositionResult)
        assert result.set_num == set_num
        assert result.ratio == "1:1"

    @pytest.mark.parametrize("set_num", [1, 2, 3, 4, 5])
    def test_layouts_only_contain_present_roles(self, set_num):
        result = place_elements(
            set_num=set_num,
            ratio="1:1",
            has_headline=True,
            has_sub=False,
            has_cta=True,
        )
        roles = [el.role for el in result.layouts]
        assert "sub_headline" not in roles
        assert "headline" in roles
        assert "cta" in roles

    @pytest.mark.parametrize("set_num", [1, 2, 3, 4, 5])
    def test_empty_content_returns_empty_layouts(self, set_num):
        result = place_elements(
            set_num=set_num,
            ratio="1:1",
            has_headline=False,
            has_sub=False,
            has_cta=False,
        )
        assert result.layouts == []

    def test_invalid_set_raises(self):
        with pytest.raises(ValueError, match="Invalid set_num"):
            place_elements(
                set_num=99,
                ratio="1:1",
                has_headline=True,
                has_sub=False,
                has_cta=False,
            )

    @pytest.mark.parametrize("set_num", [1, 2, 3, 4, 5])
    def test_proportional_coords_in_range(self, set_num):
        result = place_elements(
            set_num=set_num,
            ratio="1:1",
            has_headline=True,
            has_sub=True,
            has_cta=True,
        )
        for el in result.layouts:
            assert 0.0 <= el.x <= 1.0, f"Set {set_num}: x={el.x} out of range"
            assert 0.0 <= el.y <= 1.0, f"Set {set_num}: y={el.y} out of range"

    @pytest.mark.parametrize("set_num", [1, 2, 3, 4, 5])
    def test_image_prompt_modifier_not_empty(self, set_num):
        result = place_elements(
            set_num=set_num,
            ratio="1:1",
            has_headline=True,
            has_sub=False,
            has_cta=False,
        )
        assert len(result.image_prompt_modifier) > 0


# ---------------------------------------------------------------------------
# Set-specific: copy_space_side
# ---------------------------------------------------------------------------

class TestCopySpaceSide:
    def test_set_1_is_left(self):
        r = place_elements(1, "1:1", True, True, True)
        assert r.copy_space_side == "left"

    def test_set_2_is_right(self):
        r = place_elements(2, "1:1", True, True, True)
        assert r.copy_space_side == "right"

    def test_set_3_is_bottom(self):
        r = place_elements(3, "1:1", True, True, True)
        assert r.copy_space_side == "bottom"

    def test_set_4_is_top_bottom(self):
        r = place_elements(4, "1:1", True, True, True)
        assert r.copy_space_side == "top_bottom"

    def test_set_5_is_diagonal(self):
        r = place_elements(5, "1:1", True, True, True)
        assert r.copy_space_side == "diagonal"


# ---------------------------------------------------------------------------
# Set-4: split top/bottom positioning
# ---------------------------------------------------------------------------

class TestSet4Layout:
    def test_headline_in_top_zone(self):
        r = place_elements(4, "1:1", True, False, False)
        hl = next(el for el in r.layouts if el.role == "headline")
        assert hl.y < 0.2, f"headline y={hl.y} should be in top zone (<0.20)"

    def test_cta_in_bottom_zone(self):
        r = place_elements(4, "1:1", False, False, True)
        cta = next(el for el in r.layouts if el.role == "cta")
        assert cta.y > 0.80, f"CTA y={cta.y} should be in bottom zone (>0.80)"

    def test_sub_in_top_zone(self):
        r = place_elements(4, "1:1", False, True, False)
        sub = next(el for el in r.layouts if el.role == "sub_headline")
        assert sub.y < 0.25, f"sub_headline y={sub.y} should be in top zone (<0.25)"


# ---------------------------------------------------------------------------
# Set-5: outline and left alignment
# ---------------------------------------------------------------------------

class TestSet5Layout:
    def test_all_elements_have_outline(self):
        r = place_elements(5, "1:1", True, True, True)
        for el in r.layouts:
            assert el.outline is True, f"{el.role} should have outline=True"

    def test_all_elements_left_aligned(self):
        r = place_elements(5, "1:1", True, True, True)
        for el in r.layouts:
            assert el.text_align == "left", f"{el.role} should be left-aligned"


# ---------------------------------------------------------------------------
# select_and_place
# ---------------------------------------------------------------------------

class TestSelectAndPlace:
    def test_returns_composition_result(self):
        r = select_and_place("1:1", True, True, True)
        assert isinstance(r, CompositionResult)

    def test_respects_exclude_sets(self):
        # Run many times to statistically verify exclusion
        excluded = [1, 2]
        for _ in range(30):
            r = select_and_place("1:1", True, False, False, exclude_sets=excluded)
            assert r.set_num not in excluded

    def test_resets_exclusion_when_pool_empty(self):
        # All compatible sets for 16:9 are [1, 2, 5] — exclude all of them
        result = select_and_place("16:9", True, False, False, exclude_sets=[1, 2, 5])
        assert result.set_num in [1, 2, 5]  # should pick from full pool

    def test_no_text_falls_through_to_place_elements(self):
        # select_and_place doesn't guard; placement_engine builds empty layouts
        r = select_and_place("1:1", False, False, False)
        assert r.layouts == []

    def test_16_9_never_picks_excluded_ratios(self):
        forbidden = {3, 4}
        for _ in range(50):
            r = select_and_place("16:9", True, True, True)
            assert r.set_num not in forbidden, (
                f"set {r.set_num} not allowed for 16:9"
            )

    def test_9_16_never_picks_excluded_ratios(self):
        forbidden = {1, 2}
        for _ in range(50):
            r = select_and_place("9:16", True, True, True)
            assert r.set_num not in forbidden, (
                f"set {r.set_num} not allowed for 9:16"
            )


# ---------------------------------------------------------------------------
# Element structure contract
# ---------------------------------------------------------------------------

class TestElementLayout:
    @pytest.mark.parametrize("set_num", [1, 2, 3, 4, 5])
    def test_all_roles_are_known(self, set_num):
        known_roles = {"headline", "sub_headline", "cta"}
        r = place_elements(set_num, "1:1", True, True, True)
        for el in r.layouts:
            assert el.role in known_roles

    @pytest.mark.parametrize("set_num", [1, 2, 3, 4, 5])
    def test_font_size_is_positive(self, set_num):
        r = place_elements(set_num, "1:1", True, True, True)
        for el in r.layouts:
            assert el.font_size > 0

    @pytest.mark.parametrize("set_num", [1, 2, 3, 4, 5])
    def test_headline_larger_font_than_sub(self, set_num):
        r = place_elements(set_num, "1:1", True, True, True)
        els = {el.role: el for el in r.layouts}
        if "headline" in els and "sub_headline" in els:
            assert els["headline"].font_size > els["sub_headline"].font_size
