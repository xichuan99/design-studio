import pytest
import io
from PIL import Image

from app.services.watermark_service import apply_watermark, _normalize_watermark_settings


@pytest.fixture
def base_image_bytes():
    # Create a simple 800x600 red image
    img = Image.new("RGB", (800, 600), color="red")
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    return img_byte_arr.getvalue()


@pytest.fixture
def watermark_image_bytes():
    # Create a 200x100 blue watermark with alpha
    img = Image.new("RGBA", (200, 100), color=(0, 0, 255, 128))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")
    return img_byte_arr.getvalue()


@pytest.mark.asyncio
async def test_apply_watermark_default(base_image_bytes, watermark_image_bytes):
    """Test default watermark application (bottom-right)"""
    result_bytes = await apply_watermark(base_image_bytes, watermark_image_bytes)

    assert isinstance(result_bytes, bytes)
    assert len(result_bytes) > 0

    # Verify the output is a valid JPEG
    result_img = Image.open(io.BytesIO(result_bytes))
    assert result_img.format == "JPEG"
    assert result_img.size == (800, 600)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "position",
    ["bottom-right", "bottom-left", "top-right", "top-left", "center", "tiled"],
)
async def test_apply_watermark_positions(
    base_image_bytes, watermark_image_bytes, position
):
    """Test all valid watermark positions"""
    result_bytes = await apply_watermark(
        base_image_bytes, watermark_image_bytes, position=position
    )

    assert isinstance(result_bytes, bytes)
    result_img = Image.open(io.BytesIO(result_bytes))
    assert result_img.size == (800, 600)


@pytest.mark.asyncio
async def test_apply_watermark_invalid_position(
    base_image_bytes, watermark_image_bytes
):
    """Test fallback for invalid position"""
    result_bytes = await apply_watermark(
        base_image_bytes, watermark_image_bytes, position="invalid-position"
    )
    assert isinstance(result_bytes, bytes)


@pytest.mark.asyncio
async def test_apply_watermark_opacity_limits(base_image_bytes, watermark_image_bytes):
    """Test opacity clamping"""
    # Test over 1.0
    res_high = await apply_watermark(
        base_image_bytes, watermark_image_bytes, opacity=1.5
    )
    assert isinstance(res_high, bytes)

    # Test under 0.0
    res_low = await apply_watermark(
        base_image_bytes, watermark_image_bytes, opacity=-0.5
    )
    assert isinstance(res_low, bytes)


@pytest.mark.asyncio
async def test_apply_watermark_scale_limits(base_image_bytes, watermark_image_bytes):
    """Test scale clamping"""
    # Test over 1.0
    res_high = await apply_watermark(base_image_bytes, watermark_image_bytes, scale=1.5)
    assert isinstance(res_high, bytes)

    # Test under 0.05
    res_low = await apply_watermark(base_image_bytes, watermark_image_bytes, scale=0.01)
    assert isinstance(res_low, bytes)


def test_normalize_watermark_settings_enforces_visibility_for_single_position():
    position, opacity, scale = _normalize_watermark_settings("bottom-right", 0.05, 0.02)

    assert position == "bottom-right"
    assert opacity == 0.25
    assert scale == 0.12


def test_normalize_watermark_settings_allows_lower_values_for_tiled_mode():
    position, opacity, scale = _normalize_watermark_settings("tiled", 0.05, 0.02)

    assert position == "tiled"
    assert opacity == 0.05
    assert scale == 0.05


@pytest.mark.asyncio
async def test_apply_watermark_alpha_handling():
    """Test that a base image with alpha is properly composited and saved as JPEG"""
    base = Image.new("RGBA", (400, 300), color=(255, 0, 0, 128))
    base_bytes = io.BytesIO()
    base.save(base_bytes, format="PNG")

    wm = Image.new("RGBA", (100, 100), color=(0, 255, 0, 255))
    wm_bytes = io.BytesIO()
    wm.save(wm_bytes, format="PNG")

    result_bytes = await apply_watermark(base_bytes.getvalue(), wm_bytes.getvalue())
    assert isinstance(result_bytes, bytes)
    result_img = Image.open(io.BytesIO(result_bytes))
    assert result_img.format == "JPEG"  # Output must be JPEG
    assert result_img.mode == "RGB"  # Alpha dropped after composite
