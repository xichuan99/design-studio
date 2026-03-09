"""Integration tests for the image generation pipeline (with mocked external services)."""
from __future__ import annotations
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.image_service import generate_background, ASPECT_RATIO_MAP, STYLE_SUFFIXES
from app.services.preprocess import resize_to_aspect, extract_dominant_colors
from app.services.storage_service import generate_key


# --- Image Service Tests ---

@pytest.mark.asyncio
async def test_generate_background_text_to_image():
    """Test text-to-image generation calls Fal.ai with correct params."""
    mock_result = {
        "images": [{"url": "https://fal.cdn/generated.jpg", "width": 1024, "height": 1024, "content_type": "image/jpeg"}],
        "seed": 42,
    }

    with patch("app.services.image_service.settings") as mock_settings, \
         patch("app.services.image_service.fal_client") as mock_fal:
        mock_settings.FAL_KEY = "test-key"
        mock_fal.run_async = AsyncMock(return_value=mock_result)

        result = await generate_background(
            visual_prompt="delicious food on dark background",
            style="bold",
            aspect_ratio="1:1",
        )

        assert result["image_url"] == "https://fal.cdn/generated.jpg"
        assert result["width"] == 1024
        assert result["height"] == 1024
        assert result["seed"] == 42
        mock_fal.run_async.assert_called_once()
        call_args = mock_fal.run_async.call_args
        assert call_args[0][0] == "fal-ai/flux/dev"  # text-to-image model


@pytest.mark.asyncio
async def test_generate_background_image_to_image():
    """Test image-to-image mode uses the correct Fal.ai model."""
    mock_result = {
        "images": [{"url": "https://fal.cdn/generated.jpg", "width": 768, "height": 1344}],
    }

    with patch("app.services.image_service.settings") as mock_settings, \
         patch("app.services.image_service.fal_client") as mock_fal:
        mock_settings.FAL_KEY = "test-key"
        mock_fal.run_async = AsyncMock(return_value=mock_result)

        result = await generate_background(
            visual_prompt="food promo",
            reference_image_url="https://example.com/ref.jpg",
            style="elegant",
            aspect_ratio="9:16",
        )

        assert result["image_url"] == "https://fal.cdn/generated.jpg"
        call_args = mock_fal.run_async.call_args
        assert call_args[0][0] == "fal-ai/flux/dev/image-to-image"


@pytest.mark.asyncio
async def test_generate_background_no_key_raises():
    """Missing FAL_KEY raises ValueError."""
    with patch("app.services.image_service.settings") as mock_settings:
        mock_settings.FAL_KEY = ""
        with pytest.raises(ValueError, match="FAL_KEY"):
            await generate_background("test prompt")


def test_aspect_ratio_map_complete():
    """All expected aspect ratios are mapped."""
    assert "1:1" in ASPECT_RATIO_MAP
    assert "9:16" in ASPECT_RATIO_MAP
    assert "16:9" in ASPECT_RATIO_MAP


def test_style_suffixes_complete():
    """All expected styles have prompt suffixes."""
    for style in ["bold", "minimalist", "elegant", "playful"]:
        assert style in STYLE_SUFFIXES


# --- Preprocess Tests ---

def test_resize_to_aspect_square():
    """resize_to_aspect produces correct dimensions for 1:1."""
    from PIL import Image
    import io
    # Create a 200x100 test image (landscape)
    img = Image.new("RGB", (200, 100), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    
    resized_bytes = resize_to_aspect(buf.getvalue(), "1:1")
    result = Image.open(io.BytesIO(resized_bytes))
    assert result.size == (1024, 1024)


def test_resize_to_aspect_story():
    """resize_to_aspect produces correct dimensions for 9:16."""
    from PIL import Image
    import io
    img = Image.new("RGB", (300, 300), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    
    resized_bytes = resize_to_aspect(buf.getvalue(), "9:16")
    result = Image.open(io.BytesIO(resized_bytes))
    assert result.size == (768, 1344)


def test_extract_dominant_colors():
    """extract_dominant_colors returns correct number of hex colors."""
    from PIL import Image
    import io
    # Create a non-uniform test image (Red with a Blue pixel) to avoid numerical instability warnings in KMeans
    img = Image.new("RGB", (50, 50), color=(255, 0, 0))
    img.putpixel((0, 0), (0, 0, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    
    colors = extract_dominant_colors(buf.getvalue(), n=1)
    assert len(colors) == 1
    assert colors[0].startswith("#")
    assert len(colors[0]) == 7  # #RRGGBB


# --- Storage Tests ---

def test_generate_key_format():
    """generate_key produces valid S3 key format."""
    key = generate_key("generated", "jpg")
    assert key.startswith("generated/")
    assert key.endswith(".jpg")
    assert len(key) > 15  # prefix + uuid + extension


def test_generate_key_uniqueness():
    """Two keys should be different."""
    key1 = generate_key("test", "png")
    key2 = generate_key("test", "png")
    assert key1 != key2
