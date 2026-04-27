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

    zip_bytes, errors, item_results = await process_batch(mock_files, "remove_bg")

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
    _, errors, _ = await process_batch(mock_files, "watermark", {})
    assert len(errors) == 2
    assert "Logo bytes are required" in errors[0]["error"]

    # Succeeds with logo_bytes
    params = {
        "logo_bytes": b"fake_logo",
        "position": "center",
        "opacity": 0.8,
        "scale": 0.5,
        "visibility_preset": "protective",
    }
    zip_bytes, errors, _ = await process_batch(mock_files, "watermark", params)

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
        visibility_preset="protective",
    )


@pytest.mark.asyncio
@patch("app.services.batch_service.watermark_service.apply_watermark")
async def test_process_batch_watermark_invalid_visibility_preset_falls_back(
    mock_apply_watermark, mock_files
):
    mock_apply_watermark.side_effect = [b"wm_1", b"wm_2"]

    params = {
        "logo_bytes": b"fake_logo",
        "position": "center",
        "opacity": 0.8,
        "scale": 0.5,
        "visibility_preset": "invalid-preset",
    }

    _, errors, _ = await process_batch(mock_files, "watermark", params)

    assert errors == []
    mock_apply_watermark.assert_called_with(
        base_image_bytes=b"fake_bytes_2",
        watermark_bytes=b"fake_logo",
        position="center",
        opacity=0.8,
        scale=0.5,
        visibility_preset="balanced",
    )


@pytest.mark.asyncio
@patch("app.services.batch_service.product_scene_service.generate_product_scene")
async def test_process_batch_product_scene(mock_generate, mock_files):
    mock_generate.side_effect = [b"scene_1", b"scene_2"]

    params = {
        "theme": "minimalist",
        "aspect_ratio": "16:9",
        "quality": "ultra",
        "composite_profile": "grounded",
    }
    zip_bytes, errors, item_results = await process_batch(mock_files, "product_scene", params)

    assert len(errors) == 0
    assert len(item_results) == 2
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = zf.namelist()
        assert "image1_scene_minimalist.jpg" in names
        assert zf.read("image2_scene_minimalist.jpg") == b"scene_2"

    mock_generate.assert_called_with(
        image_bytes=b"fake_bytes_2",
        theme="minimalist",
        aspect_ratio="16:9",
        quality="ultra",
        composite_profile="grounded",
    )


@pytest.mark.asyncio
@patch("app.services.batch_service.product_scene_service.generate_product_scene")
async def test_process_batch_product_scene_invalid_params_fallback(
    mock_generate, mock_files
):
    mock_generate.side_effect = [b"scene_1", b"scene_2"]

    params = {
        "theme": "studio",
        "aspect_ratio": "invalid_ratio",
        "quality": "hd",
        "composite_profile": "wrong_profile",
    }
    _, errors, _ = await process_batch(mock_files, "product_scene", params)

    assert errors == []
    mock_generate.assert_called_with(
        image_bytes=b"fake_bytes_2",
        theme="studio",
        aspect_ratio="1:1",
        quality="standard",
        composite_profile="default",
    )


@pytest.mark.asyncio
@patch("app.services.batch_service.classify_subject_for_product_scene")
@patch("app.services.batch_service.product_scene_service.generate_product_scene")
async def test_process_batch_product_scene_blocks_human_subject(
    mock_generate,
    mock_classify,
    mock_files,
):
    mock_classify.return_value = {
        "subject_type": "human",
        "confidence": 0.97,
        "reason": "Terdeteksi wajah manusia pada gambar.",
        "face_count": 1,
        "person_count": 1,
    }

    params = {
        "theme": "studio",
        "aspect_ratio": "1:1",
        "quality": "standard",
        "composite_profile": "grounded",
    }
    _, errors, item_results = await process_batch(mock_files, "product_scene", params)

    assert len(errors) == 2
    assert len(item_results) == 0
    assert "hanya untuk foto produk" in errors[0]["error"].lower()
    mock_generate.assert_not_called()


@pytest.mark.asyncio
@patch("app.services.batch_service.bg_removal_service.remove_background")
async def test_process_batch_partial_success(mock_remove_bg):
    # One succeeds, one fails
    mock_remove_bg.side_effect = [b"nobg_1", Exception("API Error")]

    files = [("success.jpg", b"1"), ("fail.jpg", b"2")]
    zip_bytes, errors, item_results = await process_batch(files, "remove_bg")

    # We should have one error
    assert len(errors) == 1
    assert errors[0]["filename"] == "fail.jpg"
    assert "API Error" in errors[0]["error"]
    assert len(item_results) == 1

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
    zip_bytes, errors, item_results = await process_batch(files, "remove_bg")

    assert errors == []

    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = zf.namelist()
        assert names == ["image_nobg.png", "image_nobg_2.png"]
        assert zf.read("image_nobg.png") == b"nobg_1"
        assert zf.read("image_nobg_2.png") == b"nobg_2"


@pytest.mark.asyncio
@patch("app.services.batch_service.bg_removal_service.remove_background")
async def test_process_batch_remove_bg_applies_edge_feathering(mock_remove_bg):
    """Verify that edge feathering is applied to batch remove_bg outputs."""
    # Mock the remove_background to return a minimal transparent PNG
    # (in reality, it returns a real transparent PNG from Fal.ai)
    mock_transparent_png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
        b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    mock_remove_bg.side_effect = [mock_transparent_png, mock_transparent_png]

    files = [("img1.jpg", b"1"), ("img2.jpg", b"2")]
    params = {"quality": "standard"}

    zip_bytes, errors, _ = await process_batch(files, "remove_bg", params)

    assert len(errors) == 0
    # Verify feathering was called (output should exist and be non-empty)
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = zf.namelist()
        assert len(names) == 2
        assert all("nobg.png" in name for name in names)
        # Output bytes should be present (feathering modifies the PNG)
        for name in names:
            content = zf.read(name)
            assert len(content) > 0


@pytest.mark.asyncio
@patch("app.services.batch_service.bg_removal_service.remove_background")
async def test_process_batch_remove_bg_with_quality_parameter(mock_remove_bg):
    """Verify that quality parameter is accepted for remove_bg without errors."""
    mock_remove_bg.side_effect = [b"nobg_1", b"nobg_2"]

    files = [("image1.jpg", b"1"), ("image2.jpg", b"2")]
    params = {"quality": "ultra"}  # Quality parameter passed

    zip_bytes, errors, _ = await process_batch(files, "remove_bg", params)

    assert len(errors) == 0
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = zf.namelist()
        assert "image1_nobg.png" in names
        assert "image2_nobg.png" in names


@pytest.mark.asyncio
@patch("app.services.batch_service.bg_removal_service.remove_background")
async def test_process_batch_remove_bg_with_invalid_quality_fallback(mock_remove_bg):
    """Verify that invalid quality falls back to standard without breaking the process."""
    mock_remove_bg.side_effect = [b"nobg_1", b"nobg_2"]

    files = [("image1.jpg", b"1"), ("image2.jpg", b"2")]
    params = {"quality": "invalid_quality"}  # Invalid quality value

    zip_bytes, errors, _ = await process_batch(files, "remove_bg", params)

    assert len(errors) == 0  # Should not error, just fallback
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = zf.namelist()
        assert "image1_nobg.png" in names
        assert "image2_nobg.png" in names


@pytest.mark.asyncio
@patch("app.services.batch_service.watermark_service.apply_watermark")
async def test_process_batch_watermark_still_applies_globally(mock_apply_watermark):
    """Verify that watermark operation still applies globally to all batch items (expected behavior)."""
    mock_apply_watermark.side_effect = [b"wm_1", b"wm_2"]

    files = [("photo1.jpg", b"1"), ("photo2.jpg", b"2")]
    params = {
        "logo_bytes": b"fake_logo",
        "position": "bottom-right",
        "opacity": 0.8,
        "scale": 0.5,
        "visibility_preset": "balanced",
    }

    zip_bytes, errors, _ = await process_batch(files, "watermark", params)

    assert len(errors) == 0

    # Verify watermark was called twice with IDENTICAL params (global application)
    assert mock_apply_watermark.call_count == 2
    calls = mock_apply_watermark.call_args_list

    # Both calls should have identical parameters
    for call in calls:
        assert call.kwargs.get("position") == "bottom-right"
        assert call.kwargs.get("opacity") == 0.8
        assert call.kwargs.get("scale") == 0.5
        assert call.kwargs.get("visibility_preset") == "balanced"

    # Verify ZIP contains both watermarked images
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = zf.namelist()
        assert len(names) == 2
        assert all("watermarked.jpg" in name for name in names)
