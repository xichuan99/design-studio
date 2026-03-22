"""Tests for the modular PromptBuilder service."""

from app.services.prompt_builder import (
    PromptBuilder,
    STYLE_PRESETS,
    STYLE_SUFFIXES,
)


# ---------------------------------------------------------------------------
# StylePreset registry tests
# ---------------------------------------------------------------------------


def test_all_expected_styles_registered():
    """All 8 styles (5 original + 3 new) must be in the registry."""
    expected = {"auto", "macro", "cinematic", "comic", "infographic",
                "isometric_3d", "product_hero", "blueprint"}
    assert expected == set(STYLE_PRESETS.keys())


def test_every_preset_has_required_fields():
    """Every StylePreset must have non-empty key fields."""
    for key, preset in STYLE_PRESETS.items():
        assert preset.key == key, f"key mismatch for {key}"
        assert preset.label, f"'{key}' missing label"
        assert preset.environment, f"'{key}' missing environment"
        assert preset.lighting, f"'{key}' missing lighting"
        assert preset.quality_rules, f"'{key}' missing quality_rules"
        assert isinstance(preset.hard_constraints, list), f"'{key}' hard_constraints must be list"
        assert isinstance(preset.negative_prompt, list), f"'{key}' negative_prompt must be list"


def test_new_styles_have_specific_fields():
    """New styles must have their distinctive fields populated."""
    iso = STYLE_PRESETS["isometric_3d"]
    assert "isometric" in iso.camera.lower()
    assert "cinema" in iso.rendering_hint.lower() or "octane" in iso.rendering_hint.lower()

    hero = STYLE_PRESETS["product_hero"]
    assert "macro" in hero.camera.lower()
    assert "condensation" in hero.action_physics.lower()

    bp = STYLE_PRESETS["blueprint"]
    assert "orthographic" in bp.camera.lower()
    assert "wireframe" in bp.material.lower() or "technical" in bp.material.lower()


def test_all_presets_have_nonempty_negative_prompts():
    """Every style must have at least 2 negative prompt terms."""
    for key, preset in STYLE_PRESETS.items():
        assert len(preset.negative_prompt) >= 2, (
            f"'{key}' negative_prompt has fewer than 2 terms"
        )


def test_all_presets_have_hard_constraints():
    """Every style must declare at least 1 hard constraint."""
    for key, preset in STYLE_PRESETS.items():
        assert len(preset.hard_constraints) >= 1, (
            f"'{key}' has no hard_constraints"
        )


# ---------------------------------------------------------------------------
# PromptBuilder.get_preset tests
# ---------------------------------------------------------------------------


def test_get_preset_known_keys():
    for key in STYLE_PRESETS:
        preset = PromptBuilder.get_preset(key)
        assert preset.key == key


def test_get_preset_unknown_falls_back_to_auto():
    preset = PromptBuilder.get_preset("nonexistent_style_xyz")
    assert preset.key == "auto"


# ---------------------------------------------------------------------------
# PromptBuilder.build tests
# ---------------------------------------------------------------------------


def test_build_includes_subject():
    prompt = PromptBuilder.build(visual_prompt="a bowl of spicy ramen", style_key="auto")
    assert "ramen" in prompt.lower()


def test_build_includes_style_environment():
    prompt = PromptBuilder.build(visual_prompt="product shot", style_key="cinematic")
    assert any(
        term in prompt.lower()
        for term in ["rembrandt", "rim", "cinematic", "dramatic"]
    )


def test_build_includes_camera_for_cinematic():
    prompt = PromptBuilder.build(visual_prompt="coffee cup", style_key="cinematic")
    assert "85mm" in prompt


def test_build_includes_hard_constraints():
    prompt = PromptBuilder.build(visual_prompt="product", style_key="auto")
    assert "STRICT RULES" in prompt


def test_build_with_text_instruction():
    prompt = PromptBuilder.build(
        visual_prompt="food promo",
        style_key="auto",
        text_instruction="copy space on the left",
    )
    assert "copy space" in prompt.lower()


def test_build_with_brand_suffix():
    prompt = PromptBuilder.build(
        visual_prompt="product shot",
        style_key="auto",
        brand_suffix="incorporate brand colors: #FF5733, #1C1C1C",
    )
    assert "#FF5733" in prompt


def test_build_without_preserve_product():
    prompt = PromptBuilder.build(visual_prompt="product", style_key="product_hero", preserve_product=False)
    assert "CRITICAL" not in prompt


def test_build_with_preserve_product():
    prompt = PromptBuilder.build(visual_prompt="product", style_key="product_hero", preserve_product=True)
    assert "CRITICAL" in prompt
    assert "preserve" in prompt.lower()


def test_build_empty_subject_still_assembles():
    """Even with empty visual_prompt, build should not crash."""
    prompt = PromptBuilder.build(visual_prompt="", style_key="auto")
    assert isinstance(prompt, str)
    assert len(prompt) > 20  # still has style components


def test_build_3d_includes_rendering_hint():
    prompt = PromptBuilder.build(visual_prompt="brand store", style_key="isometric_3d")
    assert "cinema" in prompt.lower() or "octane" in prompt.lower()


def test_build_product_hero_includes_condensation():
    prompt = PromptBuilder.build(
        visual_prompt="energy drink can", style_key="product_hero"
    )
    assert "condensation" in prompt.lower()


# ---------------------------------------------------------------------------
# PromptBuilder.build_negative_prompt tests
# ---------------------------------------------------------------------------


def test_build_negative_prompt_returns_string():
    neg = PromptBuilder.build_negative_prompt("cinematic")
    assert isinstance(neg, str)
    assert len(neg) > 0


def test_build_negative_prompt_has_style_terms():
    neg = PromptBuilder.build_negative_prompt("cinematic")
    assert "flat lighting" in neg or "overexposed" in neg


def test_build_negative_prompt_with_extras():
    neg = PromptBuilder.build_negative_prompt("auto", extra_negatives=["cartoon", "anime"])
    assert "cartoon" in neg
    assert "anime" in neg


def test_build_negative_prompt_unknown_style_returns_auto():
    neg = PromptBuilder.build_negative_prompt("nonexistent_xyz")
    assert isinstance(neg, str)
    assert len(neg) > 0


# ---------------------------------------------------------------------------
# STYLE_SUFFIXES backward compatibility tests
# ---------------------------------------------------------------------------


def test_style_suffixes_covers_all_presets():
    """Backward-compat dict must have entries for all 8 styles."""
    assert set(STYLE_PRESETS.keys()) == set(STYLE_SUFFIXES.keys())


def test_style_suffixes_are_strings():
    for key, suffix in STYLE_SUFFIXES.items():
        assert isinstance(suffix, str), f"STYLE_SUFFIXES['{key}'] must be a string"
        assert len(suffix) > 10, f"STYLE_SUFFIXES['{key}'] suffix is too short"


# ---------------------------------------------------------------------------
# PromptBuilder.get_style_labels tests
# ---------------------------------------------------------------------------


def test_get_style_labels_returns_all_keys():
    labels = PromptBuilder.get_style_labels()
    assert set(labels.keys()) == set(STYLE_PRESETS.keys())


def test_style_labels_are_indonesian_friendly():
    """Labels should be user-friendly (contain emoji or Indonesian words)."""
    labels = PromptBuilder.get_style_labels()
    for key, label in labels.items():
        assert label, f"'{key}' has empty label"
        assert len(label) >= 4, f"'{key}' label too short: '{label}'"
