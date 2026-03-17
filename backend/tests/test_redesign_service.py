import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.redesign_service import analyze_reference_image, run_flux_redesign
from app.schemas.design import ReferenceAnalysis
from app.core.exceptions import AppException


@pytest.mark.asyncio
async def test_analyze_reference_image_success():
    """Test analyze_reference_image successfully mocking httpx and gemini."""
    mock_image_bytes = b"fake_image_bytes"
    mock_gemini_response = {
        "style_description": "Mocked style description",
        "dominant_colors": ["#000000", "#FFFFFF"],
        "mood": "Mocked mood",
        "suggested_prompt_suffix": "mocked prompt suffix"
    }

    # Mock httpx.AsyncClient.get
    mock_response = MagicMock()
    mock_response.content = mock_image_bytes
    mock_response.raise_for_status = MagicMock()

    mock_client_instance = AsyncMock()
    mock_client_instance.get.return_value = mock_response

    # Mock asyncio.to_thread to avoid actual thread and Gemini call
    with patch("httpx.AsyncClient", return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_client_instance), __aexit__=AsyncMock())):
        with patch("asyncio.to_thread", new_callable=AsyncMock) as mock_to_thread:
            mock_to_thread.return_value = mock_gemini_response
            
            # Since we mock to_thread, the actual GEMINI_API_KEY check will still run.
            # We need to temporarily set it or mock the settings if it fails, but assuming it's set in tests
            with patch("app.services.redesign_service.settings.GEMINI_API_KEY", "fake_key"):
                result = await analyze_reference_image("https://fake.url/image.jpg")
                
                assert isinstance(result, ReferenceAnalysis)
                assert result.style_description == "Mocked style description"
                assert result.suggested_prompt_suffix == "mocked prompt suffix"
                mock_client_instance.get.assert_called_once_with("https://fake.url/image.jpg")
                mock_to_thread.assert_called_once()


@pytest.mark.asyncio
async def test_analyze_reference_image_download_failure():
    """Test analyze_reference_image when image download fails."""
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.get.side_effect = Exception("Download error")

    with patch("httpx.AsyncClient", return_value=mock_client):
        with patch("app.services.redesign_service.settings.GEMINI_API_KEY", "fake_key"):
            with pytest.raises(AppException) as excinfo:
                await analyze_reference_image("https://fake.url/fail.jpg")
            
            assert excinfo.value.status_code == 400
            assert "Tidak dapat mengunduh gambar referensi" in excinfo.value.detail


@pytest.mark.asyncio
async def test_run_flux_redesign_success():
    """Test run_flux_redesign successfully mocking fal_client and httpx."""
    
    # Mock fal_client response
    mock_fal_result = {
        "images": [{"url": "https://fal.media/result.jpg"}]
    }

    # Mock httpx response for downloading the resulting image
    mock_img_bytes = b"final_image_bytes"
    mock_response = MagicMock()
    mock_response.content = mock_img_bytes
    mock_response.raise_for_status = MagicMock()

    mock_client_instance = AsyncMock()
    mock_client_instance.get.return_value = mock_response

    with patch("app.services.redesign_service.settings.FAL_KEY", "fake_fal_key"):
        with patch("fal_client.run_async", new_callable=AsyncMock) as mock_run_async:
            mock_run_async.return_value = mock_fal_result
            
            with patch("httpx.AsyncClient", return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_client_instance), __aexit__=AsyncMock())):
                result = await run_flux_redesign(
                    image_url="https://fake.url/src.jpg",
                    enriched_prompt="A beautiful redesign",
                    strength=0.7,
                    aspect_ratio="1:1"
                )
                
                assert result == mock_img_bytes
                mock_run_async.assert_called_once()
                mock_client_instance.get.assert_called_once_with("https://fal.media/result.jpg")


@pytest.mark.asyncio
async def test_run_flux_redesign_fal_error():
    """Test run_flux_redesign when fal_client raises an error."""
    
    with patch("app.services.redesign_service.settings.FAL_KEY", "fake_fal_key"):
        with patch("fal_client.run_async", new_callable=AsyncMock) as mock_run_async:
            mock_run_async.side_effect = Exception("Fal API Error")
            
            with pytest.raises(AppException) as excinfo:
                await run_flux_redesign(
                     image_url="https://fake.url/src.jpg",
                     enriched_prompt="prompt",
                     strength=0.7,
                     aspect_ratio="1:1"
                )
                
            assert excinfo.value.status_code == 502
            assert "Gagal melakukan redesign dari fal.ai" in excinfo.value.detail
