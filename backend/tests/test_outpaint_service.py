import pytest
from unittest.mock import patch
from app.core.exceptions import AppException

from app.services.outpaint_service import (
    MAX_DIRECTIONAL_EXPAND_PIXELS,
    outpaint_image,
)


@pytest.mark.asyncio
@patch("app.services.outpaint_service.fal_client.run_async")
async def test_outpaint_image_direction_success(mock_fal_run):
    mock_fal_run.return_value = {
        "images": [{"url": "http://fal.url/result.jpg", "width": 800, "height": 600}]
    }

    result = await outpaint_image(
        "http://image.url", direction="left", pixels=100, prompt="beautiful scenery"
    )

    assert result == {"url": "http://fal.url/result.jpg", "width": 800, "height": 600}
    mock_fal_run.assert_called_once_with(
        "fal-ai/image-apps-v2/outpaint",
        arguments={
            "image_url": "http://image.url",
            "output_format": "jpeg",
            "prompt": "beautiful scenery. Keep the original subject identity and scene perspective consistent. Do not add new people, extra limbs, extra hands, duplicated faces, text, logos, or unrelated objects.",
            "expand_left": 100,
        },
    )


@pytest.mark.asyncio
@patch("app.services.outpaint_service.fal_client.run_async")
async def test_outpaint_image_target_dims_success(mock_fal_run):
    mock_fal_run.return_value = {
        "image": {"url": "http://fal.url/result.jpg", "width": 1000, "height": 1000}
    }

    result = await outpaint_image(
        "http://image.url", target_width=1000, target_height=1000
    )

    assert result == {"url": "http://fal.url/result.jpg", "width": 1000, "height": 1000}
    mock_fal_run.assert_called_once_with(
        "fal-ai/image-apps-v2/outpaint",
        arguments={
            "image_url": "http://image.url",
            "output_format": "jpeg",
            "prompt": "Extend the existing background naturally. Keep the original subject identity and scene perspective consistent. Do not add new people, extra limbs, extra hands, duplicated faces, text, logos, or unrelated objects.",
            "target_width": 1000,
            "target_height": 1000,
        },
    )


@pytest.mark.asyncio
@patch("app.services.outpaint_service.fal_client.run_async")
async def test_outpaint_image_clamps_pixels_to_provider_limit(mock_fal_run):
    mock_fal_run.return_value = {
        "images": [{"url": "http://fal.url/result.jpg", "width": 800, "height": 600}]
    }

    result = await outpaint_image(
        "http://image.url", direction="left", pixels=928, prompt="beautiful scenery"
    )

    assert result == {"url": "http://fal.url/result.jpg", "width": 800, "height": 600}
    mock_fal_run.assert_called_once_with(
        "fal-ai/image-apps-v2/outpaint",
        arguments={
            "image_url": "http://image.url",
            "output_format": "jpeg",
            "prompt": "beautiful scenery. Keep the original subject identity and scene perspective consistent. Do not add new people, extra limbs, extra hands, duplicated faces, text, logos, or unrelated objects.",
            "expand_left": MAX_DIRECTIONAL_EXPAND_PIXELS,
        },
    )


@pytest.mark.asyncio
async def test_outpaint_image_missing_params():
    with pytest.raises(AppException) as excinfo:
        await outpaint_image("http://image.url")

    assert excinfo.value.status_code == 500
    assert (
        "Either direction/pixels OR target_width/target_height must be provided"
        in excinfo.value.detail
    )


@pytest.mark.asyncio
async def test_outpaint_image_invalid_direction():
    with pytest.raises(AppException) as excinfo:
        await outpaint_image("http://image.url", direction="diagonal", pixels=100)

    assert excinfo.value.status_code == 500
    assert "Invalid direction: diagonal" in excinfo.value.detail


@pytest.mark.asyncio
@patch("app.services.outpaint_service.fal_client.run_async")
async def test_outpaint_image_model_failure(mock_fal_run):
    mock_fal_run.return_value = {"bad": "data"}

    with pytest.raises(AppException) as excinfo:
        await outpaint_image("http://image.url", direction="top", pixels=100)

    assert excinfo.value.status_code == 500
    assert "Failed to get valid output" in excinfo.value.detail
