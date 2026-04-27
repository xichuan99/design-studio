from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.workers.ai_tool_jobs_background import (
    execute_background_swap_tool_job,
    execute_magic_eraser_tool_job,
)


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


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_background.upload_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_background.download_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_background.update_ai_tool_job", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_background.AsyncSessionLocal")
@patch("app.services.image_service.run_bria_fibo_edit", new_callable=AsyncMock)
@patch("app.services.image_service.build_bria_fibo_edit_args")
@patch("app.workers.ai_tool_jobs_background.inpaint_service.build_magic_eraser_prompt")
@patch("app.workers.ai_tool_jobs_background.inpaint_service.validate_mask_has_content")
@patch("app.workers.ai_tool_jobs_background.inpaint_service.prepare_magic_eraser_mask")
async def test_execute_magic_eraser_tool_job_strict_mode_propagates_to_mask_and_prompt(
    mock_prepare_mask,
    mock_validate_mask,
    mock_build_prompt,
    mock_build_bria_args,
    mock_run_bria,
    mock_session_local,
    _mock_update_job,
    mock_download_image,
    mock_upload_image,
):
    job = SimpleNamespace(
        payload_json={
            "image_url": "https://example.com/source.jpg",
            "mask_url": "https://example.com/mask.png",
            "prompt": "hapus objek",
            "strict_mode": True,
            "_model_quality": "standard",
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

    mock_download_image.side_effect = [b"raw-mask", b"final-image"]
    mock_prepare_mask.return_value = b"prepared-mask"
    mock_validate_mask.return_value = True
    mock_upload_image.side_effect = [
        "https://cdn.example.com/prepared-mask.png",
        "https://cdn.example.com/final.jpg",
    ]
    mock_build_prompt.return_value = "STRICT_PROMPT"
    mock_build_bria_args.return_value = {
        "instruction": "STRICT_PROMPT",
        "image_url": "https://example.com/source.jpg",
        "mask_url": "https://cdn.example.com/prepared-mask.png",
    }
    mock_run_bria.return_value = {"url": "https://fal.example.com/out.jpg"}

    await execute_magic_eraser_tool_job("job-1")

    mock_prepare_mask.assert_called_once_with(b"raw-mask", strict_mode=True)
    mock_build_prompt.assert_called_once_with("hapus objek", strict_mode=True)


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_background.upload_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_background.download_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_background.update_ai_tool_job", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_background.AsyncSessionLocal")
@patch("app.workers.ai_tool_jobs_background.inpaint_service.inpaint_image", new_callable=AsyncMock)
@patch("app.services.image_service.run_bria_fibo_edit", new_callable=AsyncMock)
@patch("app.services.image_service.build_bria_fibo_edit_args")
@patch("app.workers.ai_tool_jobs_background.inpaint_service.build_magic_eraser_prompt")
@patch("app.workers.ai_tool_jobs_background.inpaint_service.validate_mask_has_content")
@patch("app.workers.ai_tool_jobs_background.inpaint_service.prepare_magic_eraser_mask")
async def test_execute_magic_eraser_tool_job_without_mode_defaults_strict_true(
    mock_prepare_mask,
    mock_validate_mask,
    mock_build_prompt,
    mock_build_bria_args,
    mock_run_bria,
    mock_inpaint,
    mock_session_local,
    _mock_update_job,
    mock_download_image,
    mock_upload_image,
):
    job = SimpleNamespace(
        payload_json={
            "image_url": "https://example.com/source.jpg",
            "mask_url": "https://example.com/mask.png",
            "prompt": "hapus objek",
            "_model_quality": "standard",
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

    mock_download_image.side_effect = [b"raw-mask", b"final-image"]
    mock_prepare_mask.return_value = b"prepared-mask"
    mock_validate_mask.return_value = True
    mock_upload_image.side_effect = [
        "https://cdn.example.com/prepared-mask.png",
        "https://cdn.example.com/final.jpg",
    ]
    mock_build_prompt.return_value = "STRICT_PROMPT"
    mock_build_bria_args.return_value = {
        "instruction": "STRICT_PROMPT",
        "image_url": "https://example.com/source.jpg",
        "mask_url": "https://cdn.example.com/prepared-mask.png",
    }
    mock_run_bria.side_effect = RuntimeError("bria failed")
    mock_inpaint.return_value = {"url": "https://fal.example.com/out.jpg"}

    await execute_magic_eraser_tool_job("job-2")

    mock_prepare_mask.assert_called_once_with(b"raw-mask", strict_mode=True)
    mock_build_prompt.assert_called_once_with("hapus objek", strict_mode=True)
    mock_inpaint.assert_called_once_with(
        image_url="https://example.com/source.jpg",
        mask_url="https://cdn.example.com/prepared-mask.png",
        prompt="hapus objek",
        magic_eraser_mode=True,
        strict_mode=True,
    )
