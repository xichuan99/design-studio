from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.workers.ai_tool_jobs_creative import execute_product_scene_tool_job


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
@patch("app.workers.ai_tool_jobs_creative.update_ai_tool_job", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_creative.upload_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_creative.product_scene_service.generate_product_scene", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_creative.download_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_creative.AsyncSessionLocal")
async def test_execute_product_scene_tool_job_forwards_composite_profile(
    mock_session_local,
    mock_download_image,
    mock_generate_scene,
    mock_upload_image,
    mock_update_job,
):
    job = SimpleNamespace(
        payload_json={
            "image_url": "https://example.com/product.jpg",
            "theme": "studio",
            "aspect_ratio": "1:1",
            "_model_quality": "standard",
            "composite_profile": "grounded",
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

    mock_download_image.return_value = b"original"
    mock_generate_scene.return_value = b"final"
    mock_upload_image.return_value = "https://cdn.example.com/final.jpg"

    await execute_product_scene_tool_job("job-1")

    mock_generate_scene.assert_awaited_once_with(
        image_bytes=b"original",
        theme="studio",
        aspect_ratio="1:1",
        quality="standard",
        composite_profile="grounded",
    )
    mock_update_job.assert_any_await(
        "job-1",
        status="processing",
        phase_message="Menggabungkan produk dengan background",
        progress_percent=80,
    )


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_creative.update_ai_tool_job", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_creative.upload_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_creative.product_scene_service.generate_product_scene", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_creative.download_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_creative.AsyncSessionLocal")
async def test_execute_product_scene_tool_job_invalid_profile_falls_back_to_default(
    mock_session_local,
    mock_download_image,
    mock_generate_scene,
    mock_upload_image,
    mock_update_job,
):
    job = SimpleNamespace(
        payload_json={
            "image_url": "https://example.com/product.jpg",
            "theme": "studio",
            "aspect_ratio": "1:1",
            "_model_quality": "ultra",
            "composite_profile": "invalid",
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

    mock_download_image.return_value = b"original"
    mock_generate_scene.return_value = b"final"
    mock_upload_image.return_value = "https://cdn.example.com/final.jpg"

    await execute_product_scene_tool_job("job-2")

    mock_generate_scene.assert_awaited_once_with(
        image_bytes=b"original",
        theme="studio",
        aspect_ratio="1:1",
        quality="ultra",
        composite_profile="default",
    )
    mock_update_job.assert_any_await(
        "job-2",
        status="saving",
        phase_message="Menyimpan hasil product scene",
        progress_percent=90,
    )


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_creative.set_ai_tool_job_canceled", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_creative.download_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_creative.classify_subject_for_product_scene")
@patch("app.workers.ai_tool_jobs_creative.AsyncSessionLocal")
async def test_execute_product_scene_tool_job_blocks_human_subject(
    mock_session_local,
    mock_classify,
    mock_download_image,
    mock_set_canceled,
):
    job = SimpleNamespace(
        payload_json={
            "image_url": "https://example.com/person.jpg",
            "theme": "studio",
            "aspect_ratio": "1:1",
            "_model_quality": "standard",
            "composite_profile": "default",
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

    mock_download_image.return_value = b"original"
    mock_classify.return_value = {
        "subject_type": "human",
        "confidence": 0.99,
        "reason": "Terdeteksi wajah manusia pada gambar.",
        "face_count": 1,
        "person_count": 1,
    }

    await execute_product_scene_tool_job("job-3")

    mock_set_canceled.assert_awaited_once()
    result_meta = job.payload_json.get("_result_meta")
    assert isinstance(result_meta, dict)
    assert result_meta.get("reason_code") == "PS_BLOCK_HUMAN_OR_MIXED"
    assert result_meta.get("subject_type") == "human"
