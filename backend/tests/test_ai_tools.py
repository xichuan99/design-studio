from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock
from app.main import app
from app.api.rate_limit import rate_limit_dependency
from app.api.deps import get_db
from app.models.user import User

import pytest

@pytest.fixture(autouse=True)
def mock_validation():
    with patch("app.services.file_validation.validate_uploaded_image", return_value="image/png"):
        yield

# Setup local fixtures
def override_rate_limit():
    user = User(id="test-user-id", email="test@test.com")
    from app.core.credit_costs import DEFAULT_CREDITS

    user.credits_remaining = DEFAULT_CREDITS
    return user


async def override_get_db():
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    yield mock_session


app.dependency_overrides[rate_limit_dependency] = override_rate_limit
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def test_background_swap_endpoint_success():
    """Test generating background swap via inpainting pipeline."""
    mock_file_content = b"fake_image_bytes"
    files = {"file": ("test.png", mock_file_content, "image/png")}
    data = {"prompt": "fake scene"}

    with (
        patch(
            "app.services.bg_removal_service.remove_background", new_callable=AsyncMock
        ) as mock_rm,
        patch(
            "app.services.bg_removal_service.inpaint_background", new_callable=AsyncMock
        ) as mock_inpaint,
        patch(
            "app.api.ai_tools_routers.background.upload_image", new_callable=AsyncMock
        ) as mock_upload,
    ):
        mock_rm.return_value = b"nobg_transparent_png"
        mock_inpaint.return_value = b"inpainted_result_bytes"
        mock_upload.return_value = "http://storage.com/result.jpg"

        res = client.post(
            "/api/tools/background-swap",
            data=data,
            files=files,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["url"] == "http://storage.com/result.jpg"
        assert "result_id" in data
        mock_rm.assert_called_once()
        mock_inpaint.assert_called_once_with(
            original_bytes=mock_file_content,
            transparent_png_bytes=b"nobg_transparent_png",
            prompt="fake scene",
        )
        mock_upload.assert_called_once()


def test_background_suggest_endpoint_success():
    """Test the background-suggest endpoint returns 3 suggestions."""
    mock_file_content = b"fake_image_bytes"
    files = {"file": ("test.png", mock_file_content, "image/png")}

    mock_suggestions = {
        "suggestions": [
            {
                "title": "Studio Minimalis",
                "emoji": "🎨",
                "prompt": "clean white studio background, soft box lighting",
            },
            {
                "title": "Alam Terbuka",
                "emoji": "🌿",
                "prompt": "lush green nature background, golden hour light",
            },
            {
                "title": "Meja Kayu Rustic",
                "emoji": "🪵",
                "prompt": "rustic wooden table surface, warm ambient light",
            },
        ]
    }

    with patch(
        "app.services.bg_suggest_service.suggest_backgrounds", new_callable=AsyncMock
    ) as mock_suggest:
        mock_suggest.return_value = mock_suggestions

        res = client.post("/api/tools/background-suggest", files=files)

        assert res.status_code == 200
        body = res.json()
        assert "suggestions" in body
        assert len(body["suggestions"]) == 3
        assert body["suggestions"][0]["title"] == "Studio Minimalis"
        assert body["suggestions"][0]["emoji"] == "🎨"
        assert "prompt" in body["suggestions"][0]
        mock_suggest.assert_called_once_with(
            mock_file_content,
            mime_type="image/png",
            context={
                "product_category": None,
                "target_channel": None,
                "audience": None,
                "brand_tone": None,
                "price_tier": None,
            },
        )


def test_background_suggest_endpoint_with_context_success():
    """Test the background-suggest endpoint passes context fields to service."""
    mock_file_content = b"fake_image_bytes"
    files = {"file": ("test.png", mock_file_content, "image/png")}
    data = {
        "product_category": "skincare",
        "target_channel": "marketplace",
        "audience": "women 20-30",
        "brand_tone": "premium",
        "price_tier": "mid-range",
    }

    mock_suggestions = {
        "suggestions": [
            {
                "title": "Studio Premium",
                "emoji": "✨",
                "prompt": "clean premium studio setup",
                "rationale": "Cocok untuk brand premium",
                "best_for": "marketplace",
                "risk_note": "Hindari exposure terlalu terang",
            }
        ]
    }

    with patch(
        "app.services.bg_suggest_service.suggest_backgrounds", new_callable=AsyncMock
    ) as mock_suggest:
        mock_suggest.return_value = mock_suggestions

        res = client.post("/api/tools/background-suggest", files=files, data=data)

        assert res.status_code == 200
        body = res.json()
        assert "suggestions" in body
        assert body["suggestions"][0]["best_for"] == "marketplace"
        mock_suggest.assert_called_once_with(
            mock_file_content,
            mime_type="image/png",
            context={
                "product_category": "skincare",
                "target_channel": "marketplace",
                "audience": "women 20-30",
                "brand_tone": "premium",
                "price_tier": "mid-range",
            },
        )


def test_upscale_endpoint_disabled():
    """Upscale endpoint should return validation error because feature is disabled."""
    mock_file_content = b"fake_image_bytes"
    files = {"file": ("test.png", mock_file_content, "image/png")}
    data = {"scale": "2"}

    res = client.post(
        "/api/tools/upscale",
        data=data,
        files=files,
    )

    assert res.status_code == 422
    assert "dinonaktifkan" in str(res.json()).lower()


def test_retouch_endpoint_success():
    """Test auto-retouch endpoint with CodeFormer/OpenCV pipeline."""
    mock_file_content = b"fake_image_bytes"
    files = {"file": ("test.png", mock_file_content, "image/png")}

    with (
        patch(
            "app.services.retouch_service.auto_retouch", new_callable=AsyncMock
        ) as mock_retouch,
        patch(
            "app.api.ai_tools_routers.enhancement.upload_image", new_callable=AsyncMock
        ) as mock_upload,
    ):
        mock_retouch.return_value = b"retouched_bytes"
        mock_upload.side_effect = [
            "http://storage.com/before.jpg",
            "http://storage.com/after.jpg",
        ]

        res = client.post(
            "/api/tools/retouch",
            files=files,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["url"] == "http://storage.com/after.jpg"
        assert data["before_url"] == "http://storage.com/before.jpg"
        assert "result_id" in data
        mock_retouch.assert_called_once()
        assert mock_upload.call_count == 2


def test_id_photo_endpoint_success():
    """Test generating ID photo."""
    mock_file_content = b"fake_image_bytes"
    files = {"file": ("test.png", mock_file_content, "image/png")}
    data = {"bg_color": "red", "size": "3x4"}

    with (
        patch(
            "app.services.id_photo_service.generate_id_photo", new_callable=AsyncMock
        ) as mock_gen,
        patch(
            "app.api.ai_tools_routers.enhancement.upload_image", new_callable=AsyncMock
        ) as mock_upload,
    ):
        mock_gen.return_value = b"id_photo"
        mock_upload.return_value = "http://storage.com/idphoto.jpg"

        res = client.post(
            "/api/tools/id-photo",
            data=data,
            files=files,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["url"] == "http://storage.com/idphoto.jpg"
        assert data["bg_color"] == "red"
        assert data["print_sheet_url"] is None
        assert "result_id" in data
        mock_gen.assert_called_once_with(
            image_bytes=b"fake_image_bytes",
            bg_color_name="red",
            size_name="3x4",
            custom_w_cm=None,
            custom_h_cm=None,
            output_format="jpeg",
        )
        mock_upload.assert_called_once()


def test_id_photo_invalid_bg_color():
    files = {"file": ("test.png", b"fake", "image/png")}
    data = {"bg_color": "green", "size": "3x4"}
    res = client.post("/api/tools/id-photo", data=data, files=files)
    assert res.status_code == 422
    assert "Invalid bg_color" in str(res.json())


def test_id_photo_invalid_size():
    files = {"file": ("test.png", b"fake", "image/png")}
    data = {"bg_color": "red", "size": "10x10"}
    res = client.post("/api/tools/id-photo", data=data, files=files)
    assert res.status_code == 422
    assert "Invalid size" in str(res.json())


def test_id_photo_custom_size_missing_dimensions():
    files = {"file": ("test.png", b"fake", "image/png")}
    data = {"bg_color": "red", "size": "custom"}
    res = client.post("/api/tools/id-photo", data=data, files=files)
    assert res.status_code == 422
    assert "are required when size is 'custom'" in str(res.json())


def test_id_photo_oversized_file():
    large_content = b"0" * (11 * 1024 * 1024)
    files = {"file": ("test.png", large_content, "image/png")}
    data = {"bg_color": "red", "size": "3x4"}
    res = client.post("/api/tools/id-photo", data=data, files=files)
    assert res.status_code == 422
    assert "Image size exceeds 10MB" in str(res.json())


def test_retouch_oversized_file():
    large_content = b"0" * (11 * 1024 * 1024)
    files = {"file": ("test.png", large_content, "image/png")}
    res = client.post("/api/tools/retouch", files=files)
    assert res.status_code == 422
    assert "Image size exceeds 10MB" in str(res.json())


def test_id_photo_with_print_sheet():
    files = {"file": ("test.png", b"fake_image_bytes", "image/png")}
    data = {"bg_color": "red", "size": "3x4", "include_print_sheet": "true"}

    with (
        patch(
            "app.services.id_photo_service.generate_id_photo", new_callable=AsyncMock
        ) as mock_gen,
        patch("app.services.id_photo_service.generate_print_sheet") as mock_sheet,
        patch(
            "app.api.ai_tools_routers.enhancement.upload_image", new_callable=AsyncMock
        ) as mock_upload,
    ):
        mock_gen.return_value = b"id_photo"
        mock_sheet.return_value = b"print_sheet"
        mock_upload.side_effect = [
            "http://storage.com/idphoto.jpg",
            "http://storage.com/sheet.jpg",
        ]

        res = client.post(
            "/api/tools/id-photo",
            data=data,
            files=files,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["url"] == "http://storage.com/idphoto.jpg"
        assert data["bg_color"] == "red"
        assert data["print_sheet_url"] == "http://storage.com/sheet.jpg"
        assert "result_id" in data
        mock_sheet.assert_called_once_with(
            photo_bytes=b"id_photo", output_format="jpeg"
        )
        assert mock_upload.call_count == 2


def test_magic_eraser_success():
    files = {
        "file": ("test.png", b"fake_image", "image/png"),
        "mask": ("mask.png", b"fake_mask", "image/png"),
    }
    data = {"prompt": "remove object"}

    with (
        patch(
            "app.services.inpaint_service.inpaint_image", new_callable=AsyncMock
        ) as mock_inpaint,
        patch(
            "app.api.ai_tools_routers.background.upload_image", new_callable=AsyncMock
        ) as mock_upload,
    ):
        mock_upload.side_effect = [
            "http://storage.com/input.jpg",
            "http://storage.com/mask.jpg",
        ]
        mock_inpaint.return_value = {
            "url": "http://storage.com/result.jpg",
            "width": 1024,
            "height": 1024,
        }

        res = client.post("/api/tools/magic-eraser", data=data, files=files)

        assert res.status_code == 200
        data = res.json()
        assert data["url"] == "http://storage.com/result.jpg"
        assert data["width"] == 1024
        assert data["height"] == 1024
        assert "result_id" in data
        assert mock_upload.call_count == 2
        mock_inpaint.assert_called_once_with(
            image_url="http://storage.com/input.jpg",
            mask_url="http://storage.com/mask.jpg",
            prompt="remove object",
            magic_eraser_mode=True,
        )


def test_magic_eraser_without_prompt_uses_magic_eraser_mode():
    files = {
        "file": ("test.png", b"fake_image", "image/png"),
        "mask": ("mask.png", b"fake_mask", "image/png"),
    }

    with (
        patch(
            "app.services.inpaint_service.inpaint_image", new_callable=AsyncMock
        ) as mock_inpaint,
        patch(
            "app.api.ai_tools_routers.background.upload_image", new_callable=AsyncMock
        ) as mock_upload,
    ):
        mock_upload.side_effect = [
            "http://storage.com/input.jpg",
            "http://storage.com/mask.jpg",
        ]
        mock_inpaint.return_value = {
            "url": "http://storage.com/result.jpg",
            "width": 1024,
            "height": 1024,
        }

        res = client.post("/api/tools/magic-eraser", files=files)

        assert res.status_code == 200
        mock_inpaint.assert_called_once_with(
            image_url="http://storage.com/input.jpg",
            mask_url="http://storage.com/mask.jpg",
            prompt=None,
            magic_eraser_mode=True,
        )


def test_ai_tools_oversized_files():
    large_content = b"0" * (11 * 1024 * 1024)

    # Magic Eraser
    files = {
        "file": ("test.png", large_content, "image/png"),
        "mask": ("mask.png", b"fake", "image/png"),
    }
    res = client.post("/api/tools/magic-eraser", files=files)
    assert res.status_code == 422


def test_magic_eraser_all_black_mask_returns_validation_error():
    """An all-black mask (no marked area) should be rejected before credits are charged."""
    import io
    from PIL import Image

    black_mask = Image.new("L", (64, 64), color=0)
    buf = io.BytesIO()
    black_mask.save(buf, format="PNG")
    buf.seek(0)

    black_img = Image.new("RGB", (64, 64), color=(100, 100, 100))
    img_buf = io.BytesIO()
    black_img.save(img_buf, format="PNG")
    img_buf.seek(0)

    files = {
        "file": ("image.png", img_buf.read(), "image/png"),
        "mask": ("mask.png", buf.read(), "image/png"),
    }

    res = client.post("/api/tools/magic-eraser", files=files)
    assert res.status_code == 422
    assert "Mask" in res.json().get("error", {}).get("detail", "")


def test_watermark_endpoint_success():
    """Test /watermark endpoint"""
    files = {
        "file": ("test.png", b"fake_base", "image/png"),
        "logo": ("logo.png", b"fake_logo", "image/png"),
    }
    data = {"position": "bottom-right", "opacity": "0.7", "scale": "0.3"}

    with (
        patch(
            "app.services.watermark_service.apply_watermark", new_callable=AsyncMock
        ) as mock_wm,
        patch(
            "app.api.ai_tools_routers.enhancement.upload_image", new_callable=AsyncMock
        ) as mock_upload,
    ):
        mock_wm.return_value = b"watermarked_bytes"
        mock_upload.return_value = "http://storage.com/watermarked.jpg"

        res = client.post("/api/tools/watermark", data=data, files=files)

        assert res.status_code == 200
        data = res.json()
        assert data["url"] == "http://storage.com/watermarked.jpg"
        assert "result_id" in data
        mock_wm.assert_called_once_with(
            base_image_bytes=b"fake_base",
            watermark_bytes=b"fake_logo",
            position="bottom-right",
            opacity=0.7,
            scale=0.3,
            visibility_preset="balanced",
        )
        mock_upload.assert_called_once()


def test_product_scene_endpoint_success():
    """Test /product-scene endpoint"""
    files = {"file": ("test.png", b"fake_product", "image/png")}
    data = {
        "theme": "minimalist",
        "aspect_ratio": "16:9",
        "quality": "ultra",
        "composite_profile": "grounded",
    }

    with (
        patch(
            "app.services.product_scene_service.generate_product_scene",
            new_callable=AsyncMock,
        ) as mock_scene,
        patch(
            "app.api.ai_tools_routers.creative.upload_image", new_callable=AsyncMock
        ) as mock_upload,
    ):
        mock_scene.return_value = b"scene_bytes"
        mock_upload.return_value = "http://storage.com/scene.jpg"

        res = client.post("/api/tools/product-scene", data=data, files=files)

        assert res.status_code == 200
        data = res.json()
        assert data["url"] == "http://storage.com/scene.jpg"
        assert "result_id" in data
        mock_scene.assert_called_once_with(
            image_bytes=b"fake_product",
            theme="minimalist",
            aspect_ratio="16:9",
            quality="ultra",
            composite_profile="grounded",
        )
        mock_upload.assert_called_once()


def test_product_scene_preflight_blocks_human_subject():
    files = {"file": ("person.png", b"fake_person", "image/png")}

    with patch(
        "app.api.ai_tools_routers.creative.classify_subject_for_product_scene"
    ) as mock_classify:
        mock_classify.return_value = {
            "subject_type": "human",
            "confidence": 0.98,
            "reason": "Terdeteksi wajah manusia pada gambar.",
            "face_count": 1,
            "person_count": 1,
        }

        res = client.post("/api/tools/product-scene/preflight", files=files)

        assert res.status_code == 200
        body = res.json()
        assert body["subject_type"] == "human"
        assert body["policy_action"] == "block"
        assert body["recommended_tool"] == "background_swap"


def test_product_scene_endpoint_blocks_human_subject():
    files = {"file": ("person.png", b"fake_person", "image/png")}
    data = {
        "theme": "studio",
        "aspect_ratio": "1:1",
        "quality": "standard",
        "composite_profile": "grounded",
    }

    with patch(
        "app.api.ai_tools_routers.creative.classify_subject_for_product_scene"
    ) as mock_classify:
        mock_classify.return_value = {
            "subject_type": "human",
            "confidence": 0.98,
            "reason": "Terdeteksi wajah manusia pada gambar.",
            "face_count": 1,
            "person_count": 1,
        }

        res = client.post("/api/tools/product-scene", data=data, files=files)

        assert res.status_code == 422
        assert "hanya untuk foto produk" in str(res.json()).lower()


def test_product_scene_endpoint_normalizes_quality_and_profile():
    files = {"file": ("test.png", b"fake_product", "image/png")}
    data = {
        "theme": "minimalist",
        "aspect_ratio": "16:9",
        "quality": " ULTRA ",
        "composite_profile": " GROUNDED ",
    }

    with (
        patch(
            "app.services.product_scene_service.generate_product_scene",
            new_callable=AsyncMock,
        ) as mock_scene,
        patch(
            "app.api.ai_tools_routers.creative.upload_image", new_callable=AsyncMock
        ) as mock_upload,
    ):
        mock_scene.return_value = b"scene_bytes"
        mock_upload.return_value = "http://storage.com/scene.jpg"

        res = client.post("/api/tools/product-scene", data=data, files=files)

        assert res.status_code == 200
        mock_scene.assert_called_once_with(
            image_bytes=b"fake_product",
            theme="minimalist",
            aspect_ratio="16:9",
            quality="ultra",
            composite_profile="grounded",
        )


def test_product_scene_endpoint_invalid_quality():
    files = {"file": ("test.png", b"fake_product", "image/png")}
    data = {
        "theme": "minimalist",
        "aspect_ratio": "16:9",
        "quality": "hd",
        "composite_profile": "grounded",
    }

    res = client.post("/api/tools/product-scene", data=data, files=files)

    assert res.status_code == 422
    assert "Invalid quality for product scene" in str(res.json())


def test_product_scene_endpoint_invalid_composite_profile():
    files = {"file": ("test.png", b"fake_product", "image/png")}
    data = {
        "theme": "minimalist",
        "aspect_ratio": "16:9",
        "quality": "standard",
        "composite_profile": "hard-shadow",
    }

    res = client.post("/api/tools/product-scene", data=data, files=files)

    assert res.status_code == 422
    assert "Invalid composite_profile for product scene" in str(res.json())


def test_product_scene_endpoint_invalid_aspect_ratio():
    files = {"file": ("test.png", b"fake_product", "image/png")}
    data = {
        "theme": "minimalist",
        "aspect_ratio": "3:2",
        "quality": "standard",
        "composite_profile": "grounded",
    }

    res = client.post("/api/tools/product-scene", data=data, files=files)

    assert res.status_code == 422
    assert "Invalid aspect_ratio for product scene" in str(res.json())


def test_batch_endpoint_success():
    """Test /batch endpoint"""
    files = [
        ("files", ("image1.jpg", b"fake1", "image/jpeg")),
        ("files", ("image2.png", b"fake2", "image/png")),
    ]
    data = {"operation": "remove_bg"}

    with (
        patch(
            "app.services.batch_service.process_batch", new_callable=AsyncMock
        ) as mock_batch,
        patch(
            "app.api.ai_tools_routers.creative.upload_image", new_callable=AsyncMock
        ) as mock_upload,
    ):
        mock_batch.return_value = (b"fake_zip_bytes", [], [])
        mock_upload.return_value = "http://storage.com/batch.zip"

        res = client.post("/api/tools/batch", data=data, files=files)

        assert res.status_code == 200
        data = res.json()
        assert data["url"] == "http://storage.com/batch.zip"
        assert data["success_count"] == 2
        assert data["error_count"] == 0
        assert data["errors"] == []
        assert "result_id" in data

        # Verify passed files structure
        args, kwargs = mock_batch.call_args
        assert len(kwargs["files"]) == 2
        assert kwargs["files"][0][0] == "image1.jpg"
        assert kwargs["files"][0][1] == b"fake1"
        assert kwargs["operation"] == "remove_bg"


def test_batch_endpoint_product_scene_partial_refund_for_policy_block():
    files = [
        ("files", ("image1.jpg", b"fake1", "image/jpeg")),
        ("files", ("image2.jpg", b"fake2", "image/jpeg")),
    ]
    data = {"operation": "product_scene", "params_json": "{}"}

    with (
        patch(
            "app.services.batch_service.process_batch", new_callable=AsyncMock
        ) as mock_batch,
        patch(
            "app.api.ai_tools_routers.creative.upload_image", new_callable=AsyncMock
        ) as mock_upload,
        patch(
            "app.services.credit_service.log_credit_change", new_callable=AsyncMock
        ) as mock_credit,
    ):
        mock_batch.return_value = (
            b"fake_zip_bytes",
            [
                {
                    "filename": "image2.jpg",
                    "error": "AI Product Scene hanya untuk foto produk tanpa manusia. Gunakan Background Swap untuk foto manusia atau portrait.",
                }
            ],
            [("image1_scene_studio.jpg", b"scene")],
        )
        mock_upload.return_value = "http://storage.com/batch.zip"

        res = client.post("/api/tools/batch", data=data, files=files)

        assert res.status_code == 200
        body = res.json()
        assert body["success_count"] == 1
        assert body["error_count"] == 1

        # First call: initial charge for 2 files, second call: partial refund for 1 blocked file.
        assert mock_credit.await_count == 2
        first_call = mock_credit.await_args_list[0].args
        second_call = mock_credit.await_args_list[1].args
        assert first_call[2] == -80
        assert second_call[2] == 40
