import pytest
from unittest.mock import patch, MagicMock
from app.services import image_service

@pytest.fixture(autouse=True)
def mock_fal_key():
    with patch("app.services.image_service.settings.FAL_KEY", "dummy_key"):
        yield

@pytest.mark.asyncio
async def test_generate_background_success():
    """Test successful image generation without fallback."""
    with patch("app.services.image_service.fal_client.run_async") as mock_submit:
        mock_submit.return_value = {"images": [{"url": "http://example.com/image.png"}]}

        result = await image_service.generate_background("A test prompt")
        assert result["image_url"] == "http://example.com/image.png"

    # Actually downloading causes httpx requests, so we should mock httpx.AsyncClient too.

@pytest.mark.asyncio
async def test_generate_background_fallback():
    """Test fallback to schnell when pro fails."""
    with patch("app.services.image_service.fal_client.run_async") as mock_submit, \
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
            if args and args[0] == "fal-ai/flux-pro/v1.1":
                raise Exception("Simulated fal.ai pro failure")

            return {"images": [{"url": "http://example.com/fallback.png"}]}

        mock_submit.side_effect = mock_submit_side_effect

        result = await image_service.generate_background("A test prompt")

        assert result["image_url"] == "http://example.com/fallback.png"
        # Pro model is retried 3 times, fallback is called once, so 4 total calls
        assert call_count["count"] == 4

@pytest.mark.asyncio
async def test_generate_background_total_failure():
    """Test when both pro and fallback modes fail."""
    with patch("app.services.image_service.fal_client.run_async") as mock_submit:
        mock_submit.side_effect = Exception("Simulated total fal.ai failure")

        with pytest.raises(Exception):
            await image_service.generate_background("A test prompt")
