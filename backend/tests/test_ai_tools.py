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
    yield mock_session

app.dependency_overrides[rate_limit_dependency] = override_rate_limit
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_background_swap_endpoint_success():
    """Test generating background swap."""
    mock_file_content = b"fake_image_bytes"
    files = {"file": ("test.png", mock_file_content, "image/png")}
    data = {
        "prompt": "fake scene",
        "aspect_ratio": "1:1",
        "style": "bold"
    }

    with patch("app.services.bg_removal_service.remove_background", new_callable=AsyncMock) as mock_rm, \
         patch("app.services.image_service.generate_background", new_callable=AsyncMock) as mock_gen, \
         patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_http_get, \
         patch("app.services.bg_removal_service.composite_with_shadow", new_callable=AsyncMock) as mock_comp, \
         patch("app.services.storage_service.upload_image", new_callable=AsyncMock) as mock_upload:

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

    with patch("app.services.storage_service.upload_image", new_callable=AsyncMock) as mock_upload, \
         patch("app.services.upscale_service.upscale_image", new_callable=AsyncMock) as mock_upscale, \
         patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_http_get:

        # Let upload_image return different URLs for temp vs final
        mock_upload.side_effect = ["http://storage.com/temp.jpg", "http://storage.com/final.png"]
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
        mock_upscale.assert_called_once_with("http://storage.com/temp.jpg", scale=2)
