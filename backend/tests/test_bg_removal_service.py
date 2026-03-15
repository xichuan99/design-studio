import pytest
from unittest.mock import patch, MagicMock
import io
from PIL import Image

from app.services.bg_removal_service import remove_background, composite_product_on_background, composite_with_shadow

@pytest.fixture
def product_image_bytes():
    # Create a simple 200x200 red image with alpha
    img = Image.new('RGBA', (200, 200), color=(255, 0, 0, 255))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    return img_byte_arr.getvalue()

@pytest.fixture
def background_image_bytes():
    # Create a 800x600 blue image
    img = Image.new('RGB', (800, 600), color='blue')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    return img_byte_arr.getvalue()

@pytest.mark.asyncio
@patch('app.services.bg_removal_service.settings')
@patch('app.services.bg_removal_service.upload_image')
@patch('app.services.bg_removal_service.fal_client.run_async')
@patch('app.services.bg_removal_service.httpx.AsyncClient')
async def test_remove_background_success(mock_client_cls, mock_fal_run, mock_upload, mock_settings, product_image_bytes):
    mock_settings.FAL_KEY = "fake-key"
    mock_upload.return_value = "http://temp.url"
    mock_fal_run.return_value = {"image": {"url": "http://fal.url/result.png"}}

    from unittest.mock import AsyncMock
    mock_resp = MagicMock()
    mock_resp.content = b"fake-png-data"
    mock_client_instance = MagicMock()
    mock_client_instance.get = AsyncMock(return_value=mock_resp)

    # Need to handle async context manager for httpx.AsyncClient()
    mock_client_cls.return_value.__aenter__.return_value = mock_client_instance

    result = await remove_background(product_image_bytes)
    assert result == b"fake-png-data"
    mock_upload.assert_called_once()
    mock_fal_run.assert_called_once_with("fal-ai/birefnet", arguments={"image_url": "http://temp.url"})

@pytest.mark.asyncio
@patch('app.services.bg_removal_service.settings')
async def test_remove_background_missing_key(mock_settings, product_image_bytes):
    mock_settings.FAL_KEY = ""
    with pytest.raises(ValueError, match="FAL_KEY is missing from environment"):
        await remove_background(product_image_bytes)

@pytest.mark.asyncio
async def test_composite_product_on_background(product_image_bytes, background_image_bytes):
    result_bytes = await composite_product_on_background(product_image_bytes, background_image_bytes)
    assert isinstance(result_bytes, bytes)
    assert len(result_bytes) > 0

    # Verify the output is a valid JPEG
    result_img = Image.open(io.BytesIO(result_bytes))
    assert result_img.format == 'JPEG'
    assert result_img.size == (800, 600)

@pytest.mark.asyncio
async def test_composite_with_shadow(product_image_bytes, background_image_bytes):
    result_bytes = await composite_with_shadow(
        product_image_bytes,
        background_image_bytes,
        scale_factor=0.5,
        offset_x_ratio=0.5,
        offset_y_ratio=0.5,
        add_shadow=True
    )
    assert isinstance(result_bytes, bytes)
    assert len(result_bytes) > 0

    result_img = Image.open(io.BytesIO(result_bytes))
    assert result_img.format == 'JPEG'
    assert result_img.size == (800, 600)

@pytest.mark.asyncio
async def test_composite_with_shadow_no_shadow(product_image_bytes, background_image_bytes):
    result_bytes = await composite_with_shadow(
        product_image_bytes,
        background_image_bytes,
        add_shadow=False
    )
    assert isinstance(result_bytes, bytes)
    assert len(result_bytes) > 0

    result_img = Image.open(io.BytesIO(result_bytes))
    assert result_img.format == 'JPEG'
    assert result_img.size == (800, 600)

@pytest.mark.asyncio
async def test_composite_invalid_image():
    with pytest.raises(Exception):
        await composite_product_on_background(b"invalid", b"invalid")
