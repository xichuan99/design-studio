from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock
from app.main import app
from app.api.rate_limit import rate_limit_dependency
from app.api.deps import get_db
from app.models.user import User


# Setup local fixtures
def override_rate_limit():
    user = User(id="test-user-id", email="test@test.com")
    user.credits_remaining = 10
    return user


async def override_get_db():
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    yield mock_session


app.dependency_overrides[rate_limit_dependency] = override_rate_limit
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def test_background_swap_endpoint_success():
    """Test generating background swap."""
    mock_file_content = b"fake_image_bytes"
    files = {"file": ("test.png", mock_file_content, "image/png")}
    data = {"prompt": "fake scene", "aspect_ratio": "1:1", "style": "bold"}

    with (
        patch(
            "app.services.bg_removal_service.remove_background", new_callable=AsyncMock
        ) as mock_rm,
        patch(
            "app.services.image_service.generate_background", new_callable=AsyncMock
        ) as mock_gen,
        patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_http_get,
        patch(
            "app.services.bg_removal_service.composite_with_shadow",
            new_callable=AsyncMock,
        ) as mock_comp,
        patch("app.api.ai_tools.upload_image", new_callable=AsyncMock) as mock_upload,
    ):
        mock_rm.return_value = b"nobg"
        mock_gen.return_value = {"image_url": "http://fake-url.com/fg.jpg"}

        # Mock httpx response
        mock_response = MagicMock()
        mock_response.content = b"bg_bytes"
        mock_response.raise_for_status = lambda: None
        mock_http_get.return_value = mock_response

        mock_comp.return_value = b"composite"
        mock_upload.return_value = "http://storage.com/result.jpg"

        res = client.post(
            "/api/tools/background-swap",
            data=data,
            files=files,
        )

        assert res.status_code == 200
        assert res.json() == {"url": "http://storage.com/result.jpg"}
        mock_upload.assert_called_once()
        mock_comp.assert_called_once()
        mock_gen.assert_called_once()
        mock_rm.assert_called_once()


def test_upscale_endpoint_success():
    """Test upscaling an image."""
    mock_file_content = b"fake_image_bytes"
    files = {"file": ("test.png", mock_file_content, "image/png")}
    data = {"scale": "2"}

    with (
        patch("app.api.ai_tools.upload_image", new_callable=AsyncMock) as mock_upload,
        patch(
            "app.services.upscale_service.upscale_image", new_callable=AsyncMock
        ) as mock_upscale,
        patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_http_get,
    ):
        # Let upload_image return different URLs for temp vs final
        mock_upload.side_effect = [
            "http://storage.com/temp.jpg",
            "http://storage.com/final.png",
        ]
        mock_upscale.return_value = {"url": "http://fal.com/upscaled.png"}

        # Mock httpx response
        mock_response = MagicMock()
        mock_response.content = b"hd_bytes"
        mock_response.raise_for_status = lambda: None
        mock_http_get.return_value = mock_response

        res = client.post(
            "/api/tools/upscale",
            data=data,
            files=files,
        )

        assert res.status_code == 200
        assert res.json() == {"url": "http://storage.com/final.png"}
        assert mock_upload.call_count == 2
        mock_upscale.assert_called_once_with("http://storage.com/temp.jpg", 2.0)


def test_text_banner_endpoint_success():
    """Test generating a text banner."""
    data = {
        "text": "SALE MANTAP",
        "style": "ribbon",
        "color_hint": "merah kuning",
        "quality": "standard",
    }

    with patch(
        "app.services.banner_service.generate_text_banner", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.return_value = {
            "url": "http://storage.com/banner.png",
            "width": 1024,
            "height": 1024,
        }

        res = client.post(
            "/api/tools/text-banner",
            data=data,
        )

        assert res.status_code == 200
        assert res.json() == {
            "url": "http://storage.com/banner.png",
            "width": 1024,
            "height": 1024,
        }
        mock_gen.assert_called_once_with(
            text="SALE MANTAP",
            style="ribbon",
            color_hint="merah kuning",
            quality="standard",
        )


def test_retouch_endpoint_success():
    """Test auto-retouch endpoint."""
    mock_file_content = b"fake_image_bytes"
    files = {"file": ("test.png", mock_file_content, "image/png")}

    with (
        patch(
            "app.services.retouch_service.auto_enhance", new_callable=AsyncMock
        ) as mock_enhance,
        patch(
            "app.services.retouch_service.remove_blemishes", new_callable=AsyncMock
        ) as mock_blemish,
        patch("app.api.ai_tools.upload_image", new_callable=AsyncMock) as mock_upload,
    ):
        mock_enhance.return_value = b"enhanced"
        mock_blemish.return_value = b"blemish_free"
        mock_upload.side_effect = [
            "http://storage.com/before.jpg",
            "http://storage.com/after.jpg",
        ]

        res = client.post(
            "/api/tools/retouch",
            files=files,
        )

        assert res.status_code == 200
        assert res.json() == {
            "url": "http://storage.com/after.jpg",
            "before_url": "http://storage.com/before.jpg",
        }
        mock_enhance.assert_called_once()
        mock_blemish.assert_called_once()
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
        patch("app.api.ai_tools.upload_image", new_callable=AsyncMock) as mock_upload,
    ):
        mock_gen.return_value = b"id_photo"
        mock_upload.return_value = "http://storage.com/idphoto.jpg"

        res = client.post(
            "/api/tools/id-photo",
            data=data,
            files=files,
        )

        assert res.status_code == 200
        assert res.json() == {
            "url": "http://storage.com/idphoto.jpg",
            "width_cm": None,
            "height_cm": None,
            "bg_color": "red",
            "print_sheet_url": None,
        }
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
    assert res.status_code == 400
    assert "Invalid bg_color" in res.json()["detail"]


def test_id_photo_invalid_size():
    files = {"file": ("test.png", b"fake", "image/png")}
    data = {"bg_color": "red", "size": "10x10"}
    res = client.post("/api/tools/id-photo", data=data, files=files)
    assert res.status_code == 400
    assert "Invalid size" in res.json()["detail"]


def test_id_photo_custom_size_missing_dimensions():
    files = {"file": ("test.png", b"fake", "image/png")}
    data = {"bg_color": "red", "size": "custom"}
    res = client.post("/api/tools/id-photo", data=data, files=files)
    assert res.status_code == 400
    assert "are required when size is 'custom'" in res.json()["detail"]


def test_id_photo_oversized_file():
    large_content = b"0" * (11 * 1024 * 1024)
    files = {"file": ("test.png", large_content, "image/png")}
    data = {"bg_color": "red", "size": "3x4"}
    res = client.post("/api/tools/id-photo", data=data, files=files)
    assert res.status_code == 400
    assert "Image size exceeds 10MB" in res.json()["detail"]


def test_retouch_oversized_file():
    large_content = b"0" * (11 * 1024 * 1024)
    files = {"file": ("test.png", large_content, "image/png")}
    res = client.post("/api/tools/retouch", files=files)
    assert res.status_code == 400
    assert "Image size exceeds 10MB" in res.json()["detail"]


def test_id_photo_with_print_sheet():
    files = {"file": ("test.png", b"fake_image_bytes", "image/png")}
    data = {"bg_color": "red", "size": "3x4", "include_print_sheet": "true"}

    with (
        patch(
            "app.services.id_photo_service.generate_id_photo", new_callable=AsyncMock
        ) as mock_gen,
        patch("app.services.id_photo_service.generate_print_sheet") as mock_sheet,
        patch("app.api.ai_tools.upload_image", new_callable=AsyncMock) as mock_upload,
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
        assert res.json() == {
            "url": "http://storage.com/idphoto.jpg",
            "width_cm": None,
            "height_cm": None,
            "bg_color": "red",
            "print_sheet_url": "http://storage.com/sheet.jpg",
        }
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
        patch("app.api.ai_tools.upload_image", new_callable=AsyncMock) as mock_upload,
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
        assert res.json() == {
            "url": "http://storage.com/result.jpg",
            "width": 1024,
            "height": 1024,
        }
        assert mock_upload.call_count == 2
        mock_inpaint.assert_called_once_with(
            image_url="http://storage.com/input.jpg",
            mask_url="http://storage.com/mask.jpg",
            prompt="remove object",
        )


def test_generative_expand_directional_success():
    files = {"file": ("test.png", b"fake_image", "image/png")}
    data = {"direction": "left", "pixels": "100", "prompt": "forest"}

    with (
        patch(
            "app.services.outpaint_service.outpaint_image", new_callable=AsyncMock
        ) as mock_outpaint,
        patch("app.api.ai_tools.upload_image", new_callable=AsyncMock) as mock_upload,
    ):
        mock_upload.return_value = "http://storage.com/input.jpg"
        mock_outpaint.return_value = {
            "url": "http://storage.com/expanded.jpg",
            "width": 1124,
            "height": 1024,
        }

        res = client.post("/api/tools/generative-expand", data=data, files=files)

        assert res.status_code == 200
        assert res.json() == {
            "url": "http://storage.com/expanded.jpg",
            "width": 1124,
            "height": 1024,
        }
        mock_upload.assert_called_once()
        mock_outpaint.assert_called_once_with(
            image_url="http://storage.com/input.jpg",
            direction="left",
            pixels=100,
            target_width=None,
            target_height=None,
            prompt="forest",
        )


def test_generative_expand_target_dims_success():
    files = {"file": ("test.png", b"fake_image", "image/png")}
    data = {"target_width": "1920", "target_height": "1080"}

    with (
        patch(
            "app.services.outpaint_service.outpaint_image", new_callable=AsyncMock
        ) as mock_outpaint,
        patch("app.api.ai_tools.upload_image", new_callable=AsyncMock) as mock_upload,
    ):
        mock_upload.return_value = "http://storage.com/input.jpg"
        mock_outpaint.return_value = {
            "url": "http://storage.com/expanded.jpg",
            "width": 1920,
            "height": 1080,
        }

        res = client.post("/api/tools/generative-expand", data=data, files=files)

        assert res.status_code == 200
        assert mock_outpaint.call_count == 1
        mock_outpaint.assert_called_once_with(
            image_url="http://storage.com/input.jpg",
            direction=None,
            pixels=None,
            target_width=1920,
            target_height=1080,
            prompt=None,
        )


def test_ai_tools_oversized_files():
    large_content = b"0" * (11 * 1024 * 1024)

    # Magic Eraser
    files = {
        "file": ("test.png", large_content, "image/png"),
        "mask": ("mask.png", b"fake", "image/png"),
    }
    res = client.post("/api/tools/magic-eraser", files=files)
    assert res.status_code == 400

    # Generative Expand
    files2 = {"file": ("test.png", large_content, "image/png")}
    res2 = client.post("/api/tools/generative-expand", files=files2)
    assert res2.status_code == 400


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
        patch("app.api.ai_tools.upload_image", new_callable=AsyncMock) as mock_upload,
    ):
        mock_wm.return_value = b"watermarked_bytes"
        mock_upload.return_value = "http://storage.com/watermarked.jpg"

        res = client.post("/api/tools/watermark", data=data, files=files)

        assert res.status_code == 200
        assert res.json() == {"url": "http://storage.com/watermarked.jpg"}
        mock_wm.assert_called_once_with(
            base_image_bytes=b"fake_base",
            watermark_bytes=b"fake_logo",
            position="bottom-right",
            opacity=0.7,
            scale=0.3,
        )
        mock_upload.assert_called_once()


def test_product_scene_endpoint_success():
    """Test /product-scene endpoint"""
    files = {"file": ("test.png", b"fake_product", "image/png")}
    data = {"theme": "minimalist", "aspect_ratio": "16:9"}

    with (
        patch(
            "app.services.product_scene_service.generate_product_scene",
            new_callable=AsyncMock,
        ) as mock_scene,
        patch("app.api.ai_tools.upload_image", new_callable=AsyncMock) as mock_upload,
    ):
        mock_scene.return_value = b"scene_bytes"
        mock_upload.return_value = "http://storage.com/scene.jpg"

        res = client.post("/api/tools/product-scene", data=data, files=files)

        assert res.status_code == 200
        assert res.json() == {"url": "http://storage.com/scene.jpg"}
        mock_scene.assert_called_once_with(
            image_bytes=b"fake_product", theme="minimalist", aspect_ratio="16:9"
        )
        mock_upload.assert_called_once()


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
        patch("app.api.ai_tools.upload_image", new_callable=AsyncMock) as mock_upload,
    ):
        mock_batch.return_value = (b"fake_zip_bytes", [])
        mock_upload.return_value = "http://storage.com/batch.zip"

        res = client.post("/api/tools/batch", data=data, files=files)

        assert res.status_code == 200
        assert res.json() == {
            "url": "http://storage.com/batch.zip",
            "success_count": 2,
            "error_count": 0,
            "errors": [],
        }

        # Verify passed files structure
        args, kwargs = mock_batch.call_args
        assert len(kwargs["files"]) == 2
        assert kwargs["files"][0][0] == "image1.jpg"
        assert kwargs["files"][0][1] == b"fake1"
        assert kwargs["operation"] == "remove_bg"
