import io

import pytest
from unittest.mock import patch
from PIL import Image
from app.core.exceptions import AppException

from app.services.inpaint_service import inpaint_image, prepare_magic_eraser_mask


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
            "prompt": "Improve visual quality",
        },
    )


@pytest.mark.asyncio
@patch("app.services.inpaint_service.fal_client.run_async")
async def test_inpaint_image_magic_eraser_uses_default_prompt(mock_fal_run):
    mock_fal_run.return_value = {
        "image": {"url": "http://fal.url/result3.jpg", "width": 400, "height": 300}
    }

    result = await inpaint_image(
        "http://image.url",
        "http://mask.url",
        prompt="   ",
        magic_eraser_mode=True,
    )

    assert result == {"url": "http://fal.url/result3.jpg", "width": 400, "height": 300}
    mock_fal_run.assert_called_once_with(
        "fal-ai/flux-pro/v1/fill",
        arguments={
            "image_url": "http://image.url",
            "mask_url": "http://mask.url",
            "sync_mode": True,
            "output_format": "jpeg",
            "prompt": "Remove the masked object and reconstruct the original background naturally. Preserve original scene, lighting, and perspective. Do not add new objects, people, masks, text, logos, labels, or extra decorations.",
        },
    )


@pytest.mark.asyncio
@patch("app.services.inpaint_service.fal_client.run_async")
async def test_inpaint_image_magic_eraser_appends_guardrails_to_custom_prompt(
    mock_fal_run,
):
    mock_fal_run.return_value = {
        "image": {"url": "http://fal.url/result4.jpg", "width": 400, "height": 300}
    }

    result = await inpaint_image(
        "http://image.url",
        "http://mask.url",
        prompt="hapus objek donat",
        magic_eraser_mode=True,
    )

    assert result == {"url": "http://fal.url/result4.jpg", "width": 400, "height": 300}
    mock_fal_run.assert_called_once_with(
        "fal-ai/flux-pro/v1/fill",
        arguments={
            "image_url": "http://image.url",
            "mask_url": "http://mask.url",
            "sync_mode": True,
            "output_format": "jpeg",
            "prompt": "hapus objek donat. Preserve original scene, lighting, and perspective. Do not add new objects, people, masks, text, logos, labels, or extra decorations.",
        },
    )


@pytest.mark.asyncio
@patch("app.services.inpaint_service.fal_client.run_async")
async def test_inpaint_image_invalid_output(mock_fal_run):
    mock_fal_run.return_value = {"bad": "data"}

    with pytest.raises(AppException) as excinfo:
        await inpaint_image("http://image.url", "http://mask.url")

    assert excinfo.value.status_code == 500
    assert "Failed to get valid output" in excinfo.value.detail


@pytest.mark.asyncio
@patch("app.services.inpaint_service.fal_client.run_async")
async def test_inpaint_image_fal_exception(mock_fal_run):
    mock_fal_run.side_effect = Exception("Fal API Error")

    with pytest.raises(AppException) as excinfo:
        await inpaint_image("http://image.url", "http://mask.url")

    assert excinfo.value.status_code == 500
    assert "Inpainting service error: Fal API Error" in excinfo.value.detail


def test_prepare_magic_eraser_mask_returns_png_bytes():
    img = Image.new("L", (32, 32), color=0)
    for x in range(10, 22):
        for y in range(10, 22):
            img.putpixel((x, y), 255)

    src = io.BytesIO()
    img.save(src, format="PNG")

    out_bytes = prepare_magic_eraser_mask(src.getvalue())
    out_img = Image.open(io.BytesIO(out_bytes))

    assert out_img.format == "PNG"
    assert out_img.size == (32, 32)


def test_prepare_magic_eraser_mask_falls_back_on_invalid_bytes():
    raw = b"not-a-valid-image"
    assert prepare_magic_eraser_mask(raw) == raw
