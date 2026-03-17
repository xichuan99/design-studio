"""Tests for retouch_service.py.

Tests focus on retouch_opencv_fallback (the CI-safe path that requires no
FAL_KEY) and auto_retouch (which falls back to OpenCV when FAL_KEY is absent).
"""

import io
import pytest
from PIL import Image
from unittest.mock import patch

from app.services.retouch_service import auto_retouch, retouch_opencv_fallback


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def test_image_jpeg() -> bytes:
    img = Image.new("RGB", (100, 100), color="salmon")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def test_image_png_alpha() -> bytes:
    img = Image.new("RGBA", (100, 100), color=(255, 128, 128, 128))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# retouch_opencv_fallback — direct tests (no FAL_KEY required)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_opencv_fallback_jpeg_output(test_image_jpeg: bytes) -> None:
    result = await retouch_opencv_fallback(test_image_jpeg, fidelity=0.7, output_format="jpeg")

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "JPEG"
    assert img.size == (100, 100)
    assert img.mode == "RGB"


@pytest.mark.asyncio
async def test_opencv_fallback_png_preserves_alpha(test_image_png_alpha: bytes) -> None:
    result = await retouch_opencv_fallback(test_image_png_alpha, fidelity=0.5, output_format="png")

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "PNG"
    assert img.size == (100, 100)
    assert img.mode == "RGBA"


@pytest.mark.asyncio
async def test_opencv_fallback_high_fidelity(test_image_jpeg: bytes) -> None:
    """High fidelity (1.0) = minimal enhancement, should still return valid JPEG."""
    result = await retouch_opencv_fallback(test_image_jpeg, fidelity=1.0, output_format="jpeg")

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "JPEG"


@pytest.mark.asyncio
async def test_opencv_fallback_low_fidelity(test_image_jpeg: bytes) -> None:
    """Low fidelity (0.0) = maximum enhancement, should still return valid JPEG."""
    result = await retouch_opencv_fallback(test_image_jpeg, fidelity=0.0, output_format="jpeg")

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "JPEG"


@pytest.mark.asyncio
async def test_opencv_fallback_invalid_input() -> None:
    with pytest.raises(Exception):
        await retouch_opencv_fallback(b"not-an-image", fidelity=0.7)


# ---------------------------------------------------------------------------
# auto_retouch — falls back to OpenCV when FAL_KEY is absent
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_auto_retouch_uses_opencv_fallback_when_no_fal_key(test_image_jpeg: bytes) -> None:
    """auto_retouch must use the OpenCV fallback when FAL_KEY is not set."""
    with patch("app.core.config.settings") as mock_settings:
        mock_settings.FAL_KEY = None

        result = await auto_retouch(test_image_jpeg, fidelity=0.7, output_format="jpeg")

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "JPEG"
    assert img.size == (100, 100)


@pytest.mark.asyncio
async def test_auto_retouch_invalid_input() -> None:
    """auto_retouch must raise an exception for invalid image bytes."""
    with patch("app.core.config.settings") as mock_settings:
        mock_settings.FAL_KEY = None

        with pytest.raises(Exception):
            await auto_retouch(b"invalid data", fidelity=0.7)
