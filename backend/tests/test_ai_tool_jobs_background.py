from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.workers.ai_tool_jobs_background import execute_background_swap_tool_job


class _FakeSessionContext:
    def __init__(self, session):
        self._session = session

    async def __aenter__(self):
        return self._session

    async def __aexit__(self, exc_type, exc, tb):
        return False


def _build_session(job):
    session = SimpleNamespace()
    session.get = AsyncMock(return_value=job)
    session.add = MagicMock()
    session.commit = AsyncMock()
    return session


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_background.update_ai_tool_job", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_background.upload_image", new_callable=AsyncMock)
@patch("app.services.storage_service.upload_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_background.bg_removal_service.remove_background_from_url", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_background.AsyncSessionLocal")
@patch("app.services.image_service.run_gpt2_image_edit", new_callable=AsyncMock)
@patch("app.services.image_service.build_gpt2_image_edit_args")
@patch("app.services.image_service.build_background_swap_ultra_prompt")
@patch("httpx.AsyncClient")
async def test_execute_background_swap_tool_job_ultra_uses_enhanced_prompt(
    mock_httpx_client,
    mock_build_ultra_prompt,
    mock_build_gpt2_args,
    mock_run_gpt2,
    mock_session_local,
    mock_remove_bg_from_url,
    mock_storage_upload,
    mock_final_upload,
    _mock_update_job,
):
    job = SimpleNamespace(
        payload_json={
            "image_url": "https://example.com/source.jpg",
            "prompt": "replace with elegant office lobby",
            "_model_quality": "ultra",
        },
        cancel_requested=False,
        status="queued",
        phase_message="",
        progress_percent=0,
        started_at=None,
        finished_at=None,
        user_id="user-1",
        result_url=None,
    )

    session1 = _build_session(job)
    session2 = _build_session(job)
    mock_session_local.side_effect = [
        _FakeSessionContext(session1),
        _FakeSessionContext(session2),
    ]

    mock_remove_bg_from_url.return_value = b"mask-png"
    mock_storage_upload.return_value = "https://cdn.example.com/mask.png"
    mock_build_ultra_prompt.return_value = "ENHANCED_PROMPT"
    mock_build_gpt2_args.return_value = {
        "prompt": "ENHANCED_PROMPT",
        "image_urls": ["https://example.com/source.jpg"],
        "mask_image_url": "https://cdn.example.com/mask.png",
    }
    mock_run_gpt2.return_value = {"images": [{"url": "https://fal.example.com/out.jpg"}]}

    mock_resp = MagicMock()
    mock_resp.content = b"final-image"
    mock_resp.raise_for_status = MagicMock()
    mock_http_client = MagicMock()
    mock_http_client.get = AsyncMock(return_value=mock_resp)
    mock_httpx_client.return_value.__aenter__.return_value = mock_http_client

    mock_final_upload.return_value = "https://cdn.example.com/final.jpg"

    await execute_background_swap_tool_job("job-1")

    mock_build_ultra_prompt.assert_called_once_with("replace with elegant office lobby")
    mock_build_gpt2_args.assert_called_once_with(
        prompt="ENHANCED_PROMPT",
        image_urls=["https://example.com/source.jpg"],
        mask_image_url="https://cdn.example.com/mask.png",
    )
