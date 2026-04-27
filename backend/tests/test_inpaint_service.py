import io

import pytest
from unittest.mock import patch
from PIL import Image
from app.core.exceptions import AppException

from app.services.inpaint_service import (
    build_magic_eraser_prompt,
    inpaint_image,
    prepare_magic_eraser_mask,
    validate_mask_has_content,
)


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
            "prompt": "Remove the masked object and reconstruct the original background naturally. Preserve original scene, lighting, and perspective. Do not add new objects, people, masks, text, logos, labels, or extra decorations. Continue only nearby existing textures and surfaces in the masked region.",
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
            "prompt": "hapus objek donat. Preserve original scene, lighting, and perspective. Do not add new objects, people, masks, text, logos, labels, or extra decorations. Continue only nearby existing textures and surfaces in the masked region.",
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


def test_build_magic_eraser_prompt_uses_default_when_empty():
    built = build_magic_eraser_prompt("   ")
    assert built.startswith("Remove the masked object and reconstruct the original background naturally.")
    assert "Do not add new objects" in built


def test_build_magic_eraser_prompt_appends_guardrails_to_custom_prompt():
    built = build_magic_eraser_prompt("hapus botol di meja")
    assert built.startswith("hapus botol di meja.")
    assert "Continue only nearby existing textures and surfaces in the masked region." in built


def test_build_magic_eraser_prompt_creative_mode_uses_creative_guardrails():
    built = build_magic_eraser_prompt("hapus botol di meja", strict_mode=False)
    assert built.startswith("hapus botol di meja.")
    assert "Prefer realistic continuity with nearby context and avoid jarring artifacts." in built


# --- validate_mask_has_content ---

def test_validate_mask_has_content_returns_true_when_white_pixels_present():
    img = Image.new("L", (32, 32), color=0)
    img.putpixel((10, 10), 255)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    assert validate_mask_has_content(buf.getvalue()) is True


def test_validate_mask_has_content_returns_false_for_all_black_mask():
    img = Image.new("L", (32, 32), color=0)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    assert validate_mask_has_content(buf.getvalue()) is False


def test_validate_mask_has_content_is_permissive_on_invalid_bytes():
    # Should not raise; returns True so downstream handles it
    assert validate_mask_has_content(b"not-an-image") is True


def test_prepare_magic_eraser_mask_dilates_and_blurs_mask():
    """After preprocessing, a small white area should still expand beyond one pixel."""
    img = Image.new("L", (64, 64), color=0)
    img.putpixel((32, 32), 255)  # single white pixel
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    result_bytes = prepare_magic_eraser_mask(buf.getvalue())
    result_img = Image.open(io.BytesIO(result_bytes)).convert("L")

    white_pixels = sum(1 for px in result_img.getdata() if px > 10)
    assert white_pixels > 1


def test_prepare_magic_eraser_mask_creative_mode_expands_more_than_strict():
    img = Image.new("L", (64, 64), color=0)
    img.putpixel((32, 32), 255)
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    strict_img = Image.open(io.BytesIO(prepare_magic_eraser_mask(buf.getvalue(), strict_mode=True))).convert("L")
    creative_img = Image.open(io.BytesIO(prepare_magic_eraser_mask(buf.getvalue(), strict_mode=False))).convert("L")

    strict_white_pixels = sum(1 for px in strict_img.getdata() if px > 10)
    creative_white_pixels = sum(1 for px in creative_img.getdata() if px > 10)
    assert creative_white_pixels >= strict_white_pixels
