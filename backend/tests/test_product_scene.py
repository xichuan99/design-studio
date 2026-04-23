import pytest
from unittest.mock import patch, MagicMock
import io
from PIL import Image

from app.services.product_scene_service import generate_product_scene


@pytest.fixture
def mock_image_bytes():
    img = Image.new("RGB", (320, 240), color=(220, 220, 220))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def mock_bg_bytes():
    img = Image.new("RGB", (1024, 1024), color=(120, 120, 120))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def mock_no_bg_bytes():
    img = Image.new("RGBA", (300, 220), color=(0, 0, 0, 0))
    # Add an opaque subject rectangle in the middle
    for x in range(70, 230):
        for y in range(60, 180):
            img.putpixel((x, y), (255, 50, 50, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def mock_composite_bytes():
    # We don't actually need real bytes if we just want to test orchestration
    return b"fake_composite_image_bytes"


@pytest.fixture
def mock_no_bg_closeup_bytes():
    img = Image.new("RGBA", (300, 220), color=(0, 0, 0, 0))
    # Large opaque subject close to full frame occupancy
    for x in range(10, 290):
        for y in range(10, 210):
            img.putpixel((x, y), (255, 50, 50, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.mark.asyncio
@patch("app.services.product_scene_service.bg_removal_service.remove_background")
@patch("app.services.product_scene_service.generate_background")
@patch("app.services.product_scene_service.httpx.AsyncClient.get")
@patch("app.services.product_scene_service.bg_removal_service.composite_with_shadow")
async def test_generate_product_scene_success(
    mock_composite,
    mock_get,
    mock_generate,
    mock_remove_bg,
    mock_image_bytes,
    mock_bg_bytes,
    mock_no_bg_bytes,
    mock_composite_bytes,
):
    # Setup mocks
    mock_remove_bg.return_value = mock_no_bg_bytes
    mock_generate.return_value = {"image_url": "https://fake-fal-url.com/scene.jpg"}

    # Mock httpx response
    mock_response = MagicMock()
    mock_response.content = mock_bg_bytes
    mock_response.raise_for_status = MagicMock()
    mock_get.return_value = mock_response

    mock_composite.return_value = mock_composite_bytes

    # Run function
    result = await generate_product_scene(
        image_bytes=mock_image_bytes, theme="studio", aspect_ratio="1:1"
    )

    # Verify orchestration calls
    mock_remove_bg.assert_called_once()
    remove_bg_input = mock_remove_bg.call_args.args[0]
    assert isinstance(remove_bg_input, bytes)
    assert len(remove_bg_input) > 0

    mock_generate.assert_called_once()
    assert (
        "photograph" in mock_generate.call_args[1]["visual_prompt"]
        or "professional" in mock_generate.call_args[1]["visual_prompt"]
    )

    mock_get.assert_called_once_with("https://fake-fal-url.com/scene.jpg", timeout=30.0)

    mock_composite.assert_called_once()
    composite_kwargs = mock_composite.call_args.kwargs
    assert isinstance(composite_kwargs["product_png_bytes"], bytes)
    assert len(composite_kwargs["product_png_bytes"]) > 0
    assert composite_kwargs["background_bytes"] == mock_bg_bytes
    assert composite_kwargs["offset_x_ratio"] == 0.5
    assert 0.56 <= composite_kwargs["offset_y_ratio"] <= 0.68
    assert composite_kwargs["add_shadow"] is True
    assert composite_kwargs["shadow_profile"] == "default"
    assert 0.72 <= composite_kwargs["scale_factor"] <= 0.86

    assert result == mock_composite_bytes


@pytest.mark.asyncio
@patch("app.services.product_scene_service.bg_removal_service.remove_background")
@patch("app.services.product_scene_service.generate_background")
async def test_generate_product_scene_fallback_theme(
    mock_generate, mock_remove_bg, mock_image_bytes, mock_no_bg_bytes
):
    """Test that an unknown theme falls back to 'studio'"""
    mock_remove_bg.return_value = mock_no_bg_bytes

    # Just need it to crash or pass validation, we intercept at generate_background
    mock_generate.side_effect = Exception("Stop execution here")

    with pytest.raises(Exception, match="Stop execution here"):
        await generate_product_scene(
            image_bytes=mock_image_bytes,
            theme="unknown_theme_that_does_not_exist",
            aspect_ratio="1:1",
        )

    # It should have used the 'studio' prompt instead of failing to find the theme
    mock_generate.assert_called_once()
    prompt = mock_generate.call_args[1]["visual_prompt"]
    assert "studio" in prompt.lower() or "professional" in prompt.lower()


@pytest.mark.asyncio
@patch("app.services.product_scene_service.bg_removal_service.remove_background")
@patch("app.services.product_scene_service.generate_background")
@patch("app.services.product_scene_service.httpx.AsyncClient.get")
@patch("app.services.product_scene_service.bg_removal_service.composite_with_shadow")
async def test_generate_product_scene_closeup_uses_grounded_scale_and_offset(
    mock_composite,
    mock_get,
    mock_generate,
    mock_remove_bg,
    mock_image_bytes,
    mock_bg_bytes,
    mock_no_bg_closeup_bytes,
    mock_composite_bytes,
):
    mock_remove_bg.return_value = mock_no_bg_closeup_bytes
    mock_generate.return_value = {"image_url": "https://fake-fal-url.com/scene.jpg"}

    mock_response = MagicMock()
    mock_response.content = mock_bg_bytes
    mock_response.raise_for_status = MagicMock()
    mock_get.return_value = mock_response
    mock_composite.return_value = mock_composite_bytes

    await generate_product_scene(
        image_bytes=mock_image_bytes,
        theme="studio",
        aspect_ratio="1:1",
        composite_profile="grounded",
    )

    kwargs = mock_composite.call_args.kwargs
    assert kwargs["shadow_profile"] == "grounded"
    assert kwargs["scale_factor"] == pytest.approx(0.82)
    assert kwargs["offset_y_ratio"] == pytest.approx(0.56)
