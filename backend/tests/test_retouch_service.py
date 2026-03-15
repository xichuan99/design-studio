import pytest
import io
from PIL import Image

from app.services.retouch_service import auto_enhance, remove_blemishes

@pytest.fixture
def test_image_jpeg():
    img = Image.new('RGB', (100, 100), color='salmon')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    return img_byte_arr.getvalue()

@pytest.fixture
def test_image_png_alpha():
    img = Image.new('RGBA', (100, 100), color=(255, 128, 128, 128))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    return img_byte_arr.getvalue()

@pytest.mark.asyncio
async def test_auto_enhance_jpeg(test_image_jpeg):
    result = await auto_enhance(test_image_jpeg, output_format="jpeg")

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "JPEG"
    assert img.size == (100, 100)
    assert img.mode == "RGB"

@pytest.mark.asyncio
async def test_auto_enhance_png_with_alpha(test_image_png_alpha):
    result = await auto_enhance(test_image_png_alpha, output_format="png")

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "PNG"
    assert img.size == (100, 100)
    assert img.mode == "RGBA"

@pytest.mark.asyncio
async def test_auto_enhance_invalid():
    with pytest.raises(Exception):
        await auto_enhance(b"invalid data")

@pytest.mark.asyncio
async def test_remove_blemishes_jpeg(test_image_jpeg):
    result = await remove_blemishes(test_image_jpeg, output_format="jpeg")

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "JPEG"
    assert img.size == (100, 100)
    assert img.mode == "RGB"

@pytest.mark.asyncio
async def test_remove_blemishes_png_with_alpha(test_image_png_alpha):
    result = await remove_blemishes(test_image_png_alpha, output_format="png")

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "PNG"
    assert img.size == (100, 100)
    assert img.mode == "RGBA"

@pytest.mark.asyncio
async def test_remove_blemishes_invalid():
    with pytest.raises(Exception):
        await remove_blemishes(b"invalid data")
