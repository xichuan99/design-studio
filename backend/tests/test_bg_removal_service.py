import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import io
import base64
from PIL import Image

from app.services.bg_removal_service import (
    remove_background,
    remove_background_from_url,
    inpaint_background,
    composite_product_on_background,
    composite_with_shadow,
)


@pytest.fixture
def product_image_bytes():
    # Create a simple 200x200 red image with alpha
    img = Image.new("RGBA", (200, 200), color=(255, 0, 0, 255))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")
    return img_byte_arr.getvalue()


@pytest.fixture
def background_image_bytes():
    # Create a 800x600 blue image
    img = Image.new("RGB", (800, 600), color="blue")
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    return img_byte_arr.getvalue()


@pytest.mark.asyncio
@patch("app.services.bg_removal_service.settings")
@patch("app.services.bg_removal_service.upload_image")
@patch("app.services.bg_removal_service.fal_client.run_async")
@patch("app.services.bg_removal_service.httpx.AsyncClient")
async def test_remove_background_success(
    mock_client_cls, mock_fal_run, mock_upload, mock_settings, product_image_bytes
):
    mock_settings.FAL_KEY = "fake-key"
    mock_upload.return_value = "http://temp.url"
    mock_fal_run.return_value = {"image": {"url": "http://fal.url/result.png"}}

    mock_resp = MagicMock()
    mock_resp.content = b"fake-png-data"
    mock_client_instance = MagicMock()
    mock_client_instance.get = AsyncMock(return_value=mock_resp)

    # Need to handle async context manager for httpx.AsyncClient()
    mock_client_cls.return_value.__aenter__.return_value = mock_client_instance

    result = await remove_background(product_image_bytes)
    assert result == b"fake-png-data"
    mock_upload.assert_called_once()
    # Should now call BRIA RMBG-v2 (correct endpoint: fal-ai/rmbg-v2)
    mock_fal_run.assert_called_once_with(
        "fal-ai/rmbg-v2", arguments={"image_url": "http://temp.url"}
    )


@pytest.mark.asyncio
@patch("app.services.bg_removal_service.settings")
@patch("app.services.bg_removal_service.upload_image", new_callable=AsyncMock)
@patch("app.services.bg_removal_service.fal_client.run_async")
@patch("app.services.bg_removal_service.httpx.AsyncClient")
async def test_remove_background_from_url_success(
    mock_client_cls,
    mock_fal_run,
    mock_upload,
    mock_settings,
):
    mock_settings.FAL_KEY = "fake-key"
    mock_fal_run.return_value = {"image": {"url": "http://fal.url/result.png"}}

    mock_resp = MagicMock()
    mock_resp.content = b"fake-png-data"
    mock_client_instance = MagicMock()
    mock_client_instance.get = AsyncMock(return_value=mock_resp)
    mock_client_cls.return_value.__aenter__.return_value = mock_client_instance

    result = await remove_background_from_url("http://source.url/original.jpg")

    assert result == b"fake-png-data"
    mock_upload.assert_not_called()
    mock_fal_run.assert_called_once_with(
        "fal-ai/rmbg-v2", arguments={"image_url": "http://source.url/original.jpg"}
    )


@pytest.mark.asyncio
@patch("app.services.bg_removal_service.fal_client.run_async", new_callable=AsyncMock)
@patch("app.services.bg_removal_service.upload_image", new_callable=AsyncMock)
async def test_inpaint_background_reuses_original_url(mock_upload, mock_fal_run, product_image_bytes):
    expected_final = b"final-image-bytes"
    data_url = "data:image/jpeg;base64," + base64.b64encode(expected_final).decode()
    mock_upload.return_value = "http://storage.local/mask.png"
    mock_fal_run.return_value = {"images": [{"url": data_url}]}

    result = await inpaint_background(
        original_bytes=None,
        transparent_png_bytes=product_image_bytes,
        prompt="clean studio background",
        original_url="http://storage.local/original.jpg",
    )

    assert result == expected_final
    mock_upload.assert_called_once()
    assert mock_upload.call_args.kwargs["prefix"].startswith("bgswap_mask_")
    assert mock_fal_run.call_args.kwargs["arguments"]["image_url"] == "http://storage.local/original.jpg"


@pytest.mark.asyncio
async def test_inpaint_background_requires_original_source(product_image_bytes):
    with pytest.raises(ValueError, match="Either original_bytes or original_url must be provided"):
        await inpaint_background(
            original_bytes=None,
            transparent_png_bytes=product_image_bytes,
            prompt="clean studio background",
        )


@pytest.mark.asyncio
@patch("app.services.bg_removal_service.settings")
async def test_remove_background_missing_key(mock_settings, product_image_bytes):
    mock_settings.FAL_KEY = ""
    with pytest.raises(ValueError, match="FAL_KEY is missing from environment"):
        await remove_background(product_image_bytes)


@pytest.mark.asyncio
async def test_composite_product_on_background(
    product_image_bytes, background_image_bytes
):
    result_bytes = await composite_product_on_background(
        product_image_bytes, background_image_bytes
    )
    assert isinstance(result_bytes, bytes)
    assert len(result_bytes) > 0

    # Verify the output is a valid JPEG
    result_img = Image.open(io.BytesIO(result_bytes))
    assert result_img.format == "JPEG"
    assert result_img.size == (800, 600)


@pytest.mark.asyncio
async def test_composite_with_shadow(product_image_bytes, background_image_bytes):
    result_bytes = await composite_with_shadow(
        product_image_bytes,
        background_image_bytes,
        scale_factor=0.5,
        offset_x_ratio=0.5,
        offset_y_ratio=0.5,
        add_shadow=True,
    )
    assert isinstance(result_bytes, bytes)
    assert len(result_bytes) > 0

    result_img = Image.open(io.BytesIO(result_bytes))
    assert result_img.format == "JPEG"
    assert result_img.size == (800, 600)


@pytest.mark.asyncio
async def test_composite_with_shadow_no_shadow(
    product_image_bytes, background_image_bytes
):
    result_bytes = await composite_with_shadow(
        product_image_bytes, background_image_bytes, add_shadow=False
    )
    assert isinstance(result_bytes, bytes)
    assert len(result_bytes) > 0

    result_img = Image.open(io.BytesIO(result_bytes))
    assert result_img.format == "JPEG"
    assert result_img.size == (800, 600)


@pytest.mark.asyncio
async def test_composite_with_shadow_profile_grounded(
    product_image_bytes, background_image_bytes
):
    result_bytes = await composite_with_shadow(
        product_image_bytes,
        background_image_bytes,
        add_shadow=True,
        shadow_profile="grounded",
    )

    assert isinstance(result_bytes, bytes)
    assert len(result_bytes) > 0

    result_img = Image.open(io.BytesIO(result_bytes))
    assert result_img.format == "JPEG"
    assert result_img.size == (800, 600)


@pytest.mark.asyncio
async def test_composite_invalid_image():
    with pytest.raises(Exception):
        await composite_product_on_background(b"invalid", b"invalid")
