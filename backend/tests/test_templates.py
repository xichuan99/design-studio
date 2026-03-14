"""Integration tests for the Templates — uses sync DB connection to avoid async conflicts."""

from __future__ import annotations
from sqlalchemy import create_engine, text
from app.core.config import settings

# Use synchronous connection for tests (replace asyncpg with psycopg2)
SYNC_DB_URL = settings.DATABASE_URL.replace("+asyncpg", "")


def _get_templates():
    """Fetch all templates using a sync connection."""
    engine = create_engine(SYNC_DB_URL)
    with engine.connect() as conn:
        result = conn.execute(
            text(
                "SELECT id, name, category, aspect_ratio, style, default_text_layers FROM templates"
            )
        )
        rows = result.fetchall()
    engine.dispose()
    return rows


def test_templates_seeded():
    """Verify templates exist in the database."""
    templates = _get_templates()
    assert len(templates) > 0


def test_templates_have_all_categories():
    """Verify all categories are represented."""
    templates = _get_templates()
    categories = set(row[2] for row in templates)
    expected_categories = {
        "food",
        "sale",
        "product",
        "event",
        "education",
        "property",
        "giveaway",
        "hiring",
        "testimonial",
        "holiday",
        "story",
        "general",
    }
    assert expected_categories.issubset(categories)


def test_templates_food_count():
    """Verify food category has templates."""
    templates = _get_templates()
    food = [row for row in templates if row[2] == "food"]
    assert len(food) == 4


def test_template_text_layers_structure():
    """Verify each template has valid default_text_layers."""
    templates = _get_templates()
    for row in templates:
        name = row[1]
        layers = row[5]  # default_text_layers (JSON)
        assert isinstance(layers, list), f"{name}: layers should be a list"
        assert len(layers) == 3, f"{name}: should have 3 text layers"

        roles = [layer["role"] for layer in layers]
        assert "headline" in roles, f"{name}: missing headline layer"
        assert "cta" in roles, f"{name}: missing CTA layer"

        for layer in layers:
            assert "x" in layer and "y" in layer, f"{name}: layer missing position"
            assert 0.0 <= layer["x"] <= 1.0, f"{name}: x out of range"
            assert 0.0 <= layer["y"] <= 1.0, f"{name}: y out of range"
            assert "font_family" in layer, f"{name}: layer missing font_family"


def test_templates_aspect_ratios():
    """Verify templates cover all three aspect ratios."""
    templates = _get_templates()
    ratios = set(row[3] for row in templates)
    assert ratios == {"1:1", "9:16", "16:9"}
