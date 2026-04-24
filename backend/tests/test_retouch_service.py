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
    result = await retouch_opencv_fallback(
        test_image_jpeg, fidelity=0.7, output_format="jpeg"
    )

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "JPEG"
    assert img.size == (100, 100)
    assert img.mode == "RGB"


@pytest.mark.asyncio
async def test_opencv_fallback_png_preserves_alpha(test_image_png_alpha: bytes) -> None:
    result = await retouch_opencv_fallback(
        test_image_png_alpha, fidelity=0.5, output_format="png"
    )

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "PNG"
    assert img.size == (100, 100)
    assert img.mode == "RGBA"


@pytest.mark.asyncio
async def test_opencv_fallback_high_fidelity(test_image_jpeg: bytes) -> None:
    """High fidelity (1.0) = minimal enhancement, should still return valid JPEG."""
    result = await retouch_opencv_fallback(
        test_image_jpeg, fidelity=1.0, output_format="jpeg"
    )

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "JPEG"


@pytest.mark.asyncio
async def test_opencv_fallback_low_fidelity(test_image_jpeg: bytes) -> None:
    """Low fidelity (0.0) = maximum enhancement, should still return valid JPEG."""
    result = await retouch_opencv_fallback(
        test_image_jpeg, fidelity=0.0, output_format="jpeg"
    )

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
async def test_auto_retouch_uses_opencv_fallback_when_no_fal_key(
    test_image_jpeg: bytes,
) -> None:
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


@pytest.mark.asyncio
async def test_auto_retouch_with_advanced_relight_fallback(
    test_image_jpeg: bytes,
) -> None:
    """auto_retouch should still return a valid image when advanced relight is requested."""
    with patch("app.core.config.settings") as mock_settings:
        mock_settings.FAL_KEY = None

        result = await auto_retouch(
            test_image_jpeg,
            fidelity=0.6,
            output_format="jpeg",
            relight_mode="advanced",
            light_direction="top-down",
            light_type="harsh studio lighting",
        )

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "JPEG"
    assert img.size == (100, 100)


@pytest.mark.asyncio
async def test_auto_retouch_advanced_relight_propagates_fal_error(
    test_image_jpeg: bytes,
) -> None:
    """advanced relight must raise (not silently fall back) when FAL relight fails."""
    from unittest.mock import AsyncMock

    with patch("app.core.config.settings") as mock_settings:
        mock_settings.FAL_KEY = "fake-key"

        with patch(
            "app.services.retouch_service.retouch_with_codeformer",
            new_callable=AsyncMock,
            return_value=test_image_jpeg,
        ):
            with patch(
                "app.services.retouch_service.relight_with_fal",
                new_callable=AsyncMock,
                side_effect=RuntimeError("FAL relight failed"),
            ):
                with pytest.raises(RuntimeError, match="FAL relight failed"):
                    await auto_retouch(
                        test_image_jpeg,
                        fidelity=0.6,
                        output_format="jpeg",
                        relight_mode="advanced",
                        light_direction="side",
                        light_type="midday",
                    )


@pytest.mark.asyncio
async def test_auto_retouch_auto_relight_silently_falls_back_on_fal_error(
    test_image_jpeg: bytes,
) -> None:
    """auto relight must silently return retouch-only result when FAL relight fails."""
    from unittest.mock import AsyncMock

    with patch("app.core.config.settings") as mock_settings:
        mock_settings.FAL_KEY = "fake-key"

        with patch(
            "app.services.retouch_service.retouch_with_codeformer",
            new_callable=AsyncMock,
            return_value=test_image_jpeg,
        ):
            with patch(
                "app.services.retouch_service.relight_with_fal",
                new_callable=AsyncMock,
                side_effect=RuntimeError("FAL relight failed"),
            ):
                result = await auto_retouch(
                    test_image_jpeg,
                    fidelity=0.6,
                    output_format="jpeg",
                    relight_mode="auto",
                    light_direction="front",
                    light_type="soft overcast daylight lighting",
                )

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "JPEG"


@pytest.mark.asyncio
async def test_auto_retouch_with_invalid_relight_values_defaults_safely(
    test_image_jpeg: bytes,
) -> None:
    """Invalid relight inputs should safely normalize and still return a valid image."""
    with patch("app.core.config.settings") as mock_settings:
        mock_settings.FAL_KEY = None

        result = await auto_retouch(
            test_image_jpeg,
            fidelity=0.6,
            output_format="jpeg",
            relight_mode="not-a-mode",
            light_direction="unknown",
            light_type="unknown",
        )

    assert isinstance(result, bytes)
    img = Image.open(io.BytesIO(result))
    assert img.format == "JPEG"
