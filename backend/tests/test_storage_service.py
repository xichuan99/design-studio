import pytest
from unittest.mock import patch, MagicMock, mock_open

from app.services.storage_service import upload_image, download_image, generate_key


@pytest.fixture
def image_bytes():
    return b"fake-image-data"


def test_generate_key():
    key = generate_key(prefix="test", extension="png")
    assert key.startswith("test/")
    assert key.endswith(".png")
    assert len(key.split("/")[1].split(".")[0]) == 12


@pytest.mark.asyncio
@patch("app.services.storage_service.settings")
@patch("app.services.storage_service._get_s3_client")
async def test_upload_image_s3_public_url(mock_get_s3, mock_settings, image_bytes):
    mock_settings.S3_ACCESS_KEY = "valid-key"
    mock_settings.S3_SECRET_KEY = "valid-secret"
    mock_settings.S3_BUCKET = "test-bucket"
    mock_settings.S3_PUBLIC_URL = "https://cdn.example.com"

    mock_s3 = MagicMock()
    mock_get_s3.return_value = mock_s3

    result = await upload_image(image_bytes, key="test/file.jpg")

    assert result == "https://cdn.example.com/test/file.jpg"
    mock_s3.upload_fileobj.assert_called_once()

    args, kwargs = mock_s3.upload_fileobj.call_args
    assert kwargs["ExtraArgs"]["ContentType"] == "image/jpeg"


@pytest.mark.asyncio
@patch("app.services.storage_service.settings")
@patch("app.services.storage_service._get_s3_client")
async def test_upload_image_s3_endpoint_url(mock_get_s3, mock_settings, image_bytes):
    mock_settings.S3_ACCESS_KEY = "valid-key"
    mock_settings.S3_SECRET_KEY = "valid-secret"
    mock_settings.S3_BUCKET = "test-bucket"
    mock_settings.S3_PUBLIC_URL = ""
    mock_settings.S3_ENDPOINT = "https://s3.example.com"

    mock_s3 = MagicMock()
    mock_get_s3.return_value = mock_s3

    result = await upload_image(image_bytes, key="test/file.jpg")

    assert result == "https://s3.example.com/test-bucket/test/file.jpg"


@pytest.mark.asyncio
@patch("app.services.storage_service.settings")
@patch("app.services.storage_service._get_s3_client")
async def test_upload_image_s3_fallback_aws_url(
    mock_get_s3, mock_settings, image_bytes
):
    mock_settings.S3_ACCESS_KEY = "valid-key"
    mock_settings.S3_SECRET_KEY = "valid-secret"
    mock_settings.S3_BUCKET = "test-bucket"
    mock_settings.S3_PUBLIC_URL = ""
    mock_settings.S3_ENDPOINT = ""

    mock_s3 = MagicMock()
    mock_get_s3.return_value = mock_s3

    result = await upload_image(image_bytes, key="test/file.jpg")

    assert result == "https://test-bucket.s3.amazonaws.com/test/file.jpg"


@pytest.mark.asyncio
@patch("app.services.storage_service.settings")
@patch("builtins.open", new_callable=mock_open)
@patch("os.makedirs")
async def test_upload_image_local_fallback_no_credentials(
    mock_makedirs, mock_file, mock_settings, image_bytes
):
    mock_settings.S3_ACCESS_KEY = ""
    mock_settings.BACKEND_BASE_URL = "http://localhost:8000"

    result = await upload_image(
        image_bytes, key="test/file.png", content_type="image/png"
    )

    assert result == "http://localhost:8000/static/uploads/test/file.png"
    mock_makedirs.assert_called_once()
    mock_file.assert_called_once()
    mock_file().write.assert_called_once_with(b"fake-image-data")


@pytest.mark.asyncio
@patch("app.services.storage_service.settings")
@patch("app.services.storage_service._get_s3_client")
@patch("builtins.open", new_callable=mock_open)
@patch("os.makedirs")
async def test_upload_image_local_fallback_s3_error(
    mock_makedirs, mock_file, mock_get_s3, mock_settings, image_bytes
):
    mock_settings.S3_ACCESS_KEY = "valid-key"
    mock_settings.S3_SECRET_KEY = "valid-secret"
    mock_settings.BACKEND_BASE_URL = "http://localhost:8000"

    mock_s3 = MagicMock()
    mock_s3.upload_fileobj.side_effect = Exception("S3 Upload Failed")
    mock_get_s3.return_value = mock_s3

    result = await upload_image(image_bytes, key="test/file.png")

    assert result == "http://localhost:8000/static/uploads/test/file.png"
    mock_makedirs.assert_called_once()
    mock_file.assert_called_once()


@pytest.mark.asyncio
@patch("httpx.AsyncClient")
async def test_download_image(mock_client_cls):
    mock_resp = MagicMock()
    mock_resp.content = b"downloaded-data"

    mock_client_instance = MagicMock()

    from unittest.mock import AsyncMock

    mock_client_instance.get = AsyncMock(return_value=mock_resp)
    mock_client_cls.return_value.__aenter__.return_value = mock_client_instance

    result = await download_image("http://image.url")

    assert result == b"downloaded-data"
    mock_client_instance.get.assert_called_once_with(
        "http://image.url", follow_redirects=True
    )
    mock_resp.raise_for_status.assert_called_once()
