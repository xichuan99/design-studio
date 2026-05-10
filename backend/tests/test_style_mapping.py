"""Tests for the style_mapping service."""
from app.services.style_mapping import resolve_style_preset


def test_maps_bold_to_product_hero():
    assert resolve_style_preset("bold") == "product_hero"


def test_maps_minimalist_to_infographic():
    assert resolve_style_preset("minimalist") == "infographic"


def test_maps_elegant_to_cinematic():
    assert resolve_style_preset("elegant") == "cinematic"


def test_maps_playful_to_comic():
    assert resolve_style_preset("playful") == "comic"


def test_maps_auto_to_auto():
    assert resolve_style_preset("auto") == "auto"


def test_unknown_falls_back_to_auto():
    assert resolve_style_preset("nonexistent_xyz") == "auto"


def test_none_falls_back_to_auto():
    assert resolve_style_preset(None) == "auto"


def test_mode_hint_blueprint():
    assert resolve_style_preset("unknown", mode="blueprint") == "blueprint"


def test_goal_hint_product():
    assert resolve_style_preset("unknown", goal="iklan produk") == "product_hero"


def test_case_insensitive():
    assert resolve_style_preset("BOLD") == "product_hero"
