import pytest
from unittest.mock import patch

from app.services.upscale_service import upscale_image

@pytest.mark.asyncio
@patch('app.services.upscale_service.settings')
@patch('app.services.upscale_service.fal_client.run_async')
async def test_upscale_image_success(mock_fal_run, mock_settings):
    mock_settings.FAL_KEY = "fake-key"
    mock_fal_run.return_value = {
        "image": {"url": "http://fal.url/result.png", "width": 1600, "height": 1200, "content_type": "image/png"}
    }

    result = await upscale_image("http://image.url", scale=2)

    assert result == {
        "url": "http://fal.url/result.png",
        "width": 1600,
        "height": 1200,
        "content_type": "image/png"
    }
    mock_fal_run.assert_called_once_with(
        "fal-ai/esrgan",
        arguments={
            "image_url": "http://image.url",
            "scale": 2
        }
    )

@pytest.mark.asyncio
@patch('app.services.upscale_service.settings')
@patch('app.services.upscale_service.fal_client.run_async')
async def test_upscale_image_invalid_scale(mock_fal_run, mock_settings):
    mock_settings.FAL_KEY = "fake-key"
    mock_fal_run.return_value = {
        "image": {"url": "http://fal.url/result.png"}
    }

    await upscale_image("http://image.url", scale=3)

    # Scale should fallback to 4 if not 2, 4, or 8
    mock_fal_run.assert_called_once_with(
        "fal-ai/esrgan",
        arguments={
            "image_url": "http://image.url",
            "scale": 4
        }
    )

@pytest.mark.asyncio
@patch('app.services.upscale_service.settings')
async def test_upscale_image_missing_key(mock_settings):
    mock_settings.FAL_KEY = ""
    with pytest.raises(ValueError, match="FAL_KEY is missing from environment"):
        await upscale_image("http://image.url")

@pytest.mark.asyncio
@patch('app.services.upscale_service.settings')
@patch('app.services.upscale_service.fal_client.run_async')
async def test_upscale_image_invalid_result(mock_fal_run, mock_settings):
    mock_settings.FAL_KEY = "fake-key"
    mock_fal_run.return_value = {"bad": "data"}

    with pytest.raises(RuntimeError, match="Upscale model returned invalid result"):
        await upscale_image("http://image.url")
