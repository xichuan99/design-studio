from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.workers.ai_tool_jobs_pipeline import execute_pipeline_tool_job
from app.workers.ai_tool_jobs_runner import AI_TOOL_EXECUTORS


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
@patch("app.workers.ai_tool_jobs_pipeline.update_ai_tool_job", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.upload_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.build_pipeline")
@patch("app.workers.ai_tool_jobs_pipeline.AsyncSessionLocal")
async def test_execute_pipeline_tool_job_success(
    mock_session_local,
    mock_build_pipeline,
    mock_upload_image,
    mock_update_job,
):
    job = SimpleNamespace(
        payload_json={
            "image_url": "https://example.com/input.jpg",
            "stages": [{"type": "remove_bg", "params": {}}],
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

    pipeline_result = SimpleNamespace(image_bytes=b"final-image")
    pipeline_instance = SimpleNamespace(run=AsyncMock(return_value=pipeline_result))
    mock_build_pipeline.return_value = pipeline_instance
    mock_upload_image.return_value = "https://cdn.example.com/final.jpg"

    await execute_pipeline_tool_job("job-1")

    mock_build_pipeline.assert_called_once()
    pipeline_instance.run.assert_awaited_once()
    mock_upload_image.assert_awaited_once_with(
        b"final-image",
        content_type="image/jpeg",
        prefix="pipeline_async",
    )
    assert mock_update_job.await_count >= 1
    assert job.status == "completed"
    assert job.result_url == "https://cdn.example.com/final.jpg"


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_pipeline.set_ai_tool_job_canceled", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.AsyncSessionLocal")
async def test_execute_pipeline_tool_job_respects_cancel_before_processing(
    mock_session_local,
    mock_set_canceled,
):
    job = SimpleNamespace(
        payload_json={
            "image_url": "https://example.com/input.jpg",
            "stages": [{"type": "remove_bg", "params": {}}],
        },
        cancel_requested=True,
        status="queued",
        phase_message="",
        progress_percent=0,
        started_at=None,
        finished_at=None,
        user_id="user-1",
        result_url=None,
    )

    session = _build_session(job)
    mock_session_local.side_effect = [_FakeSessionContext(session)]

    await execute_pipeline_tool_job("job-cancel")

    mock_set_canceled.assert_awaited_once()


def test_runner_has_pipeline_executor_mapping() -> None:
    assert "pipeline" in AI_TOOL_EXECUTORS
