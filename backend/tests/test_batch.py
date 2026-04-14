import pytest
import io
import zipfile
from unittest.mock import patch

from app.services.batch_service import process_batch, process_single_image


@pytest.fixture
def mock_files():
    return [("image1.jpg", b"fake_bytes_1"), ("image2.png", b"fake_bytes_2")]


@pytest.mark.asyncio
async def test_process_single_image_unsupported():
    filename, result_bytes, error = await process_single_image(
        "test.jpg", b"bytes", "unsupported_op", {}
    )
    assert filename is None
    assert result_bytes is None
    assert error == "Unsupported operation: unsupported_op"


@pytest.mark.asyncio
@patch("app.services.batch_service.bg_removal_service.remove_background")
async def test_process_batch_remove_bg(mock_remove_bg, mock_files):
    mock_remove_bg.side_effect = [b"nobg_1", b"nobg_2"]

    zip_bytes, errors = await process_batch(mock_files, "remove_bg")

    assert len(errors) == 0
    assert isinstance(zip_bytes, bytes)

    # Verify ZIP contents
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = zf.namelist()
        assert "image1_nobg.png" in names
        assert "image2_nobg.png" in names

        assert zf.read("image1_nobg.png") == b"nobg_1"
        assert zf.read("image2_nobg.png") == b"nobg_2"


@pytest.mark.asyncio
@patch("app.services.batch_service.watermark_service.apply_watermark")
async def test_process_batch_watermark(mock_apply_watermark, mock_files):
    mock_apply_watermark.side_effect = [b"wm_1", b"wm_2"]

    # Fails if no logo_bytes
    _, errors = await process_batch(mock_files, "watermark", {})
    assert len(errors) == 2
    assert "Logo bytes are required" in errors[0]["error"]

    # Succeeds with logo_bytes
    params = {
        "logo_bytes": b"fake_logo",
        "position": "center",
        "opacity": 0.8,
        "scale": 0.5,
    }
    zip_bytes, errors = await process_batch(mock_files, "watermark", params)

    assert len(errors) == 0
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = zf.namelist()
        assert "image1_watermarked.jpg" in names
        assert zf.read("image1_watermarked.jpg") == b"wm_1"

    # Verify watermark_service got called correctly
    mock_apply_watermark.assert_called_with(
        base_image_bytes=b"fake_bytes_2",
        watermark_bytes=b"fake_logo",
        position="center",
        opacity=0.8,
        scale=0.5,
    )


@pytest.mark.asyncio
@patch("app.services.batch_service.product_scene_service.generate_product_scene")
async def test_process_batch_product_scene(mock_generate, mock_files):
    mock_generate.side_effect = [b"scene_1", b"scene_2"]

    params = {"theme": "minimalist", "aspect_ratio": "16:9"}
    zip_bytes, errors = await process_batch(mock_files, "product_scene", params)

    assert len(errors) == 0
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = zf.namelist()
        assert "image1_scene_minimalist.jpg" in names
        assert zf.read("image2_scene_minimalist.jpg") == b"scene_2"

    mock_generate.assert_called_with(
        image_bytes=b"fake_bytes_2", theme="minimalist", aspect_ratio="16:9"
    )


@pytest.mark.asyncio
@patch("app.services.batch_service.bg_removal_service.remove_background")
async def test_process_batch_partial_success(mock_remove_bg):
    # One succeeds, one fails
    mock_remove_bg.side_effect = [b"nobg_1", Exception("API Error")]

    files = [("success.jpg", b"1"), ("fail.jpg", b"2")]
    zip_bytes, errors = await process_batch(files, "remove_bg")

    # We should have one error
    assert len(errors) == 1
    assert errors[0]["filename"] == "fail.jpg"
    assert "API Error" in errors[0]["error"]

    # And one successful file in the zip
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = zf.namelist()
        assert len(names) == 1
        assert "success_nobg.png" in names
        assert zf.read("success_nobg.png") == b"nobg_1"


@pytest.mark.asyncio
@patch("app.services.batch_service.bg_removal_service.remove_background")
async def test_process_batch_makes_duplicate_output_names_unique(mock_remove_bg):
    mock_remove_bg.side_effect = [b"nobg_1", b"nobg_2"]

    files = [("image.jpg", b"1"), ("image.jpg", b"2")]
    zip_bytes, errors = await process_batch(files, "remove_bg")

    assert errors == []

    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = zf.namelist()
        assert names == ["image_nobg.png", "image_nobg_2.png"]
        assert zf.read("image_nobg.png") == b"nobg_1"
        assert zf.read("image_nobg_2.png") == b"nobg_2"
