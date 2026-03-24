import pytest
from unittest.mock import patch, MagicMock
from app.services import image_service
from app.core.exceptions import InternalServerError

@pytest.mark.asyncio
async def test_generate_background_success():
    """Test successful image generation without fallback."""
    with patch("app.services.image_service.fal_client.submit_async") as mock_submit:
        mock_handler = MagicMock()
        mock_handler.get.return_value = {"images": [{"url": "http://example.com/image.png"}]}
        mock_submit.return_value = mock_handler

        result_bytes = await image_service.generate_background("A test prompt")
        assert result_bytes == b'mock_image_bytes'

    # Actually downloading causes httpx requests, so we should mock httpx.AsyncClient too.

@pytest.mark.asyncio
async def test_generate_background_fallback():
    """Test fallback to schnell when pro fails."""
    with patch("app.services.image_service.fal_client.submit_async") as mock_submit, \
         patch("httpx.AsyncClient") as mock_httpx_client:

        # Setup httpx mock to return dummy image bytes
        mock_resp = MagicMock()
        mock_resp.content = b"fallback_image_bytes"
        mock_client_instance = mock_httpx_client.return_value.__aenter__.return_value
        mock_client_instance.get.return_value = mock_resp

        # Make the first submit (pro-v1.1) fail every time (3 retries = 3 fails)
        # and the second submit (schnell) succeed

        call_count = {"count": 0}

        async def mock_submit_side_effect(*args, **kwargs):
            call_count["count"] += 1
            if kwargs.get("model") == "fal-ai/flux-pro/v1.1":
                raise Exception("Simulated fal.ai pro failure")

            # For schnell (fallback) return success
            mock_handler = MagicMock()
            async def get_mock():
                return {"images": [{"url": "http://example.com/fallback.png"}]}
            mock_handler.get = get_mock
            return mock_handler

        mock_submit.side_effect = mock_submit_side_effect

        result = await image_service.generate_background("A test prompt")

        assert result == b"fallback_image_bytes"
        # Pro model is retried 3 times, fallback is called once, so 4 total calls
        assert call_count["count"] == 4

@pytest.mark.asyncio
async def test_generate_background_total_failure():
    """Test when both pro and fallback modes fail."""
    with patch("app.services.image_service.fal_client.submit_async") as mock_submit:
        mock_submit.side_effect = Exception("Simulated total fal.ai failure")

        with pytest.raises(InternalServerError):
            await image_service.generate_background("A test prompt")
