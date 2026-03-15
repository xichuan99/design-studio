import pytest
from unittest.mock import patch
from fastapi import HTTPException

from app.services.inpaint_service import inpaint_image


@pytest.mark.asyncio
@patch("app.services.inpaint_service.fal_client.run_async")
async def test_inpaint_image_success(mock_fal_run):
    mock_fal_run.return_value = {
        "images": [{"url": "http://fal.url/result.jpg", "width": 800, "height": 600}]
    }

    result = await inpaint_image("http://image.url", "http://mask.url", "a cool prompt")

    assert result == {"url": "http://fal.url/result.jpg", "width": 800, "height": 600}
    mock_fal_run.assert_called_once_with(
        "fal-ai/flux-pro/v1/fill",
        arguments={
            "image_url": "http://image.url",
            "mask_url": "http://mask.url",
            "sync_mode": True,
            "output_format": "jpeg",
            "prompt": "a cool prompt",
        },
    )


@pytest.mark.asyncio
@patch("app.services.inpaint_service.fal_client.run_async")
async def test_inpaint_image_fallback_structure(mock_fal_run):
    mock_fal_run.return_value = {
        "image": {"url": "http://fal.url/result2.jpg", "width": 400, "height": 300}
    }

    result = await inpaint_image("http://image.url", "http://mask.url")

    assert result == {"url": "http://fal.url/result2.jpg", "width": 400, "height": 300}
    mock_fal_run.assert_called_once_with(
        "fal-ai/flux-pro/v1/fill",
        arguments={
            "image_url": "http://image.url",
            "mask_url": "http://mask.url",
            "sync_mode": True,
            "output_format": "jpeg",
        },
    )


@pytest.mark.asyncio
@patch("app.services.inpaint_service.fal_client.run_async")
async def test_inpaint_image_invalid_output(mock_fal_run):
    mock_fal_run.return_value = {"bad": "data"}

    with pytest.raises(HTTPException) as excinfo:
        await inpaint_image("http://image.url", "http://mask.url")

    assert excinfo.value.status_code == 500
    assert "Failed to get valid output" in excinfo.value.detail


@pytest.mark.asyncio
@patch("app.services.inpaint_service.fal_client.run_async")
async def test_inpaint_image_fal_exception(mock_fal_run):
    mock_fal_run.side_effect = Exception("Fal API Error")

    with pytest.raises(HTTPException) as excinfo:
        await inpaint_image("http://image.url", "http://mask.url")

    assert excinfo.value.status_code == 500
    assert "Inpainting service error: Fal API Error" in excinfo.value.detail
