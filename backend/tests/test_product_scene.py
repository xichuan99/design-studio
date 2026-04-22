import pytest
from unittest.mock import patch, MagicMock

from app.services.product_scene_service import generate_product_scene


@pytest.fixture
def mock_image_bytes():
    return b"fake_product_image_bytes"


@pytest.fixture
def mock_bg_bytes():
    return b"fake_background_image_bytes"


@pytest.fixture
def mock_composite_bytes():
    # We don't actually need real bytes if we just want to test orchestration
    return b"fake_composite_image_bytes"


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
    mock_composite_bytes,
):
    # Setup mocks
    mock_remove_bg.return_value = b"fake_no_bg_bytes"
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
    mock_remove_bg.assert_called_once_with(mock_image_bytes)

    mock_generate.assert_called_once()
    assert (
        "photograph" in mock_generate.call_args[1]["visual_prompt"]
        or "professional" in mock_generate.call_args[1]["visual_prompt"]
    )

    mock_get.assert_called_once_with("https://fake-fal-url.com/scene.jpg", timeout=30.0)

    mock_composite.assert_called_once_with(
        product_png_bytes=b"fake_no_bg_bytes",
        background_bytes=mock_bg_bytes,
        scale_factor=0.58,
        offset_x_ratio=0.5,
        offset_y_ratio=0.62,
        add_shadow=True,
    )

    assert result == mock_composite_bytes


@pytest.mark.asyncio
@patch("app.services.product_scene_service.bg_removal_service.remove_background")
@patch("app.services.product_scene_service.generate_background")
async def test_generate_product_scene_fallback_theme(
    mock_generate, mock_remove_bg, mock_image_bytes
):
    """Test that an unknown theme falls back to 'studio'"""
    mock_remove_bg.return_value = b"fake_no_bg_bytes"

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
