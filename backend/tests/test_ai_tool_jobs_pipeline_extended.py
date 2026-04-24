"""Extended tests for Phase 3 job executor (100% coverage)."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

import pytest

from app.workers.ai_tool_jobs_pipeline import (
    execute_pipeline_tool_job,
    _decode_base64_image,
    _resolve_input_image_bytes,
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


# === Base64 Decoding ===


def test_decode_base64_image_plain() -> None:
    """_decode_base64_image should decode plain base64."""
    import base64

    data = b"test-image-data"
    encoded = base64.b64encode(data).decode()
    result = _decode_base64_image(encoded)
    assert result == data


def test_decode_base64_image_with_data_uri() -> None:
    """_decode_base64_image should decode data: URI format."""
    import base64

    data = b"test-image-data"
    encoded = base64.b64encode(data).decode()
    data_uri = f"data:image/png;base64,{encoded}"
    result = _decode_base64_image(data_uri)
    assert result == data


def test_decode_base64_image_invalid() -> None:
    """_decode_base64_image should reject invalid base64."""
    with pytest.raises(ValueError, match="Invalid base64 image payload"):
        _decode_base64_image("not-valid-base64!!!")


# === Image Bytes Resolution ===


def test_resolve_input_image_bytes_none() -> None:
    """_resolve_input_image_bytes should return None for missing payload."""
    result = _resolve_input_image_bytes({})
    assert result is None


def test_resolve_input_image_bytes_raw_bytes() -> None:
    """_resolve_input_image_bytes should handle raw bytes."""
    image_bytes = b"raw-image-bytes"
    result = _resolve_input_image_bytes({"image_bytes": image_bytes})
    assert result == image_bytes


def test_resolve_input_image_bytes_bytearray() -> None:
    """_resolve_input_image_bytes should convert bytearray to bytes."""
    image_data = bytearray(b"image-data")
    result = _resolve_input_image_bytes({"image_bytes": image_data})
    assert result == b"image-data"
    assert isinstance(result, bytes)


def test_resolve_input_image_bytes_base64_string() -> None:
    """_resolve_input_image_bytes should decode base64 strings."""
    import base64

    data = b"test-image-data"
    encoded = base64.b64encode(data).decode()
    result = _resolve_input_image_bytes({"image_bytes": encoded})
    assert result == data


def test_resolve_input_image_bytes_unsupported_type() -> None:
    """_resolve_input_image_bytes should reject unsupported types."""
    with pytest.raises(ValueError, match="Unsupported image_bytes format"):
        _resolve_input_image_bytes({"image_bytes": 12345})


# === Job Execution Happy Path ===


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_pipeline.update_ai_tool_job", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.upload_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.build_pipeline")
@patch("app.workers.ai_tool_jobs_pipeline.AsyncSessionLocal")
async def test_execute_pipeline_tool_job_with_image_bytes(
    mock_session_local,
    mock_build_pipeline,
    mock_upload_image,
    mock_update_job,
):
    """Job executor should handle image_bytes payload."""
    job = SimpleNamespace(
        payload_json={
            "image_bytes": b"raw-image-data",
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

    assert job.status == "completed"
    assert job.result_url == "https://cdn.example.com/final.jpg"


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_pipeline.update_ai_tool_job", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.upload_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.build_pipeline")
@patch("app.workers.ai_tool_jobs_pipeline.AsyncSessionLocal")
async def test_execute_pipeline_tool_job_with_base64_image_bytes(
    mock_session_local,
    mock_build_pipeline,
    mock_upload_image,
    mock_update_job,
):
    """Job executor should decode base64 image_bytes."""
    import base64

    image_data = b"test-image-data"
    encoded = base64.b64encode(image_data).decode()

    job = SimpleNamespace(
        payload_json={
            "image_bytes": encoded,
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

    run_call_args = pipeline_instance.run.await_args
    payload = run_call_args[0][0]
    assert payload.image_bytes == image_data


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_pipeline.update_ai_tool_job", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.upload_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.build_pipeline")
@patch("app.workers.ai_tool_jobs_pipeline.AsyncSessionLocal")
async def test_execute_pipeline_tool_job_progress_callback(
    mock_session_local,
    mock_build_pipeline,
    mock_upload_image,
    mock_update_job,
):
    """Job executor should emit progress updates via callback."""
    job = SimpleNamespace(
        payload_json={
            "image_url": "https://example.com/input.jpg",
            "stages": [{"type": "remove_bg", "params": {}}, {"type": "watermark", "params": {}}],
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

    captured_callbacks = []

    def capture_build_pipeline(stage_requests, progress_callback):
        captured_callbacks.append(progress_callback)
        pipeline_result = SimpleNamespace(image_bytes=b"final-image")
        pipeline_instance = SimpleNamespace(run=AsyncMock(return_value=pipeline_result))
        return pipeline_instance

    mock_build_pipeline.side_effect = capture_build_pipeline
    mock_upload_image.return_value = "https://cdn.example.com/final.jpg"

    await execute_pipeline_tool_job("job-1")

    # Verify progress callback was passed to build_pipeline
    assert len(captured_callbacks) == 1
    assert mock_update_job.await_count >= 1  # At least one job update


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_pipeline.update_ai_tool_job", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.upload_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.build_pipeline")
@patch("app.workers.ai_tool_jobs_pipeline.AsyncSessionLocal")
async def test_execute_pipeline_tool_job_with_custom_content_type(
    mock_session_local,
    mock_build_pipeline,
    mock_upload_image,
    mock_update_job,
):
    """Job executor should respect output_content_type in payload."""
    job = SimpleNamespace(
        payload_json={
            "image_url": "https://example.com/input.jpg",
            "stages": [{"type": "remove_bg", "params": {}}],
            "output_content_type": "image/png",
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

    upload_call_kwargs = mock_upload_image.await_args.kwargs
    assert upload_call_kwargs["content_type"] == "image/png"


# === Error Conditions ===


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_pipeline.AsyncSessionLocal")
async def test_execute_pipeline_tool_job_not_found(mock_session_local):
    """Job executor should handle job not found."""
    session = SimpleNamespace()
    session.get = AsyncMock(return_value=None)
    mock_session_local.return_value.__aenter__.return_value = session

    with pytest.raises(RuntimeError, match="AI tool job not found"):
        await execute_pipeline_tool_job("nonexistent-job")


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_pipeline.AsyncSessionLocal")
async def test_execute_pipeline_tool_job_missing_stages(mock_session_local):
    """Job executor should require stages in payload."""
    job = SimpleNamespace(
        payload_json={
            "image_url": "https://example.com/input.jpg",
            # Missing 'stages' key
        },
        cancel_requested=False,
    )

    session = _build_session(job)
    mock_session_local.return_value.__aenter__.return_value = session

    with pytest.raises(ValueError, match="Missing stages in pipeline job payload"):
        await execute_pipeline_tool_job("job-1")


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_pipeline.AsyncSessionLocal")
async def test_execute_pipeline_tool_job_empty_stages(mock_session_local):
    """Job executor should require at least one stage."""
    job = SimpleNamespace(
        payload_json={
            "image_url": "https://example.com/input.jpg",
            "stages": [],  # Empty stages list
        },
        cancel_requested=False,
    )

    session = _build_session(job)
    mock_session_local.return_value.__aenter__.return_value = session

    with pytest.raises(ValueError, match="Missing stages in pipeline job payload"):
        await execute_pipeline_tool_job("job-1")


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_pipeline.AsyncSessionLocal")
async def test_execute_pipeline_tool_job_stages_not_list(mock_session_local):
    """Job executor should require stages to be a list."""
    job = SimpleNamespace(
        payload_json={
            "image_url": "https://example.com/input.jpg",
            "stages": "not-a-list",
        },
        cancel_requested=False,
    )

    session = _build_session(job)
    mock_session_local.return_value.__aenter__.return_value = session

    with pytest.raises(ValueError, match="Missing stages in pipeline job payload"):
        await execute_pipeline_tool_job("job-1")


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_pipeline.AsyncSessionLocal")
async def test_execute_pipeline_tool_job_missing_image_source(mock_session_local):
    """Job executor should require image_url or image_bytes."""
    job = SimpleNamespace(
        payload_json={
            # Missing image_url and image_bytes
            "stages": [{"type": "remove_bg", "params": {}}],
        },
        cancel_requested=False,
    )

    session = _build_session(job)
    mock_session_local.return_value.__aenter__.return_value = session

    with pytest.raises(ValueError, match="Pipeline job requires image_url or image_bytes"):
        await execute_pipeline_tool_job("job-1")


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_pipeline.update_ai_tool_job", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.upload_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.build_pipeline")
@patch("app.workers.ai_tool_jobs_pipeline.AsyncSessionLocal")
async def test_execute_pipeline_tool_job_cancel_before_processing(
    mock_session_local,
    mock_build_pipeline,
    mock_upload_image,
    mock_update_job,
):
    """Job executor should honor cancel_requested before processing."""
    job = SimpleNamespace(
        payload_json={
            "image_url": "https://example.com/input.jpg",
            "stages": [{"type": "remove_bg", "params": {}}],
        },
        cancel_requested=True,
        status="queued",
    )

    session = _build_session(job)
    mock_session_local.return_value.__aenter__.return_value = session

    with patch(
        "app.workers.ai_tool_jobs_pipeline.set_ai_tool_job_canceled",
        new_callable=AsyncMock,
    ) as mock_set_canceled:
        await execute_pipeline_tool_job("job-1")
        mock_set_canceled.assert_awaited_once()


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_pipeline.set_ai_tool_job_canceled", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.update_ai_tool_job", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.upload_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.build_pipeline")
@patch("app.workers.ai_tool_jobs_pipeline.AsyncSessionLocal")
async def test_execute_pipeline_tool_job_cancel_after_processing(
    mock_session_local,
    mock_build_pipeline,
    mock_upload_image,
    mock_update_job,
    mock_set_canceled,
):
    """Job executor should honor cancel_requested after pipeline runs."""
    job1 = SimpleNamespace(
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

    job2 = SimpleNamespace(
        cancel_requested=True,  # Becomes canceled during pipeline execution
        user_id="user-1",
    )

    session1 = _build_session(job1)
    session2 = _build_session(job2)
    mock_session_local.side_effect = [
        _FakeSessionContext(session1),
        _FakeSessionContext(session2),
    ]

    pipeline_result = SimpleNamespace(image_bytes=b"final-image")
    pipeline_instance = SimpleNamespace(run=AsyncMock(return_value=pipeline_result))
    mock_build_pipeline.return_value = pipeline_instance

    await execute_pipeline_tool_job("job-1")

    mock_set_canceled.assert_awaited_once()


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_pipeline.update_ai_tool_job", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.upload_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.build_pipeline")
@patch("app.workers.ai_tool_jobs_pipeline.AsyncSessionLocal")
async def test_execute_pipeline_tool_job_pipeline_returns_no_image(
    mock_session_local,
    mock_build_pipeline,
    mock_upload_image,
    mock_update_job,
):
    """Job executor should fail if pipeline returns no image."""
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
    mock_session_local.return_value.__aenter__.return_value = session1

    pipeline_result = SimpleNamespace(image_bytes=None)
    pipeline_instance = SimpleNamespace(run=AsyncMock(return_value=pipeline_result))
    mock_build_pipeline.return_value = pipeline_instance

    with pytest.raises(RuntimeError, match="Pipeline execution returned no output image"):
        await execute_pipeline_tool_job("job-1")


# === Job Not Found During Save ===


@pytest.mark.asyncio
@patch("app.workers.ai_tool_jobs_pipeline.update_ai_tool_job", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.upload_image", new_callable=AsyncMock)
@patch("app.workers.ai_tool_jobs_pipeline.build_pipeline")
@patch("app.workers.ai_tool_jobs_pipeline.AsyncSessionLocal")
async def test_execute_pipeline_tool_job_not_found_during_save(
    mock_session_local,
    mock_build_pipeline,
    mock_upload_image,
    mock_update_job,
):
    """Job executor should gracefully handle job not found during save phase."""
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
    session2 = SimpleNamespace()
    session2.get = AsyncMock(return_value=None)  # Job not found during save
    session2.add = MagicMock()
    session2.commit = AsyncMock()

    mock_session_local.side_effect = [
        _FakeSessionContext(session1),
        _FakeSessionContext(session2),
    ]

    pipeline_result = SimpleNamespace(image_bytes=b"final-image")
    pipeline_instance = SimpleNamespace(run=AsyncMock(return_value=pipeline_result))
    mock_build_pipeline.return_value = pipeline_instance
    mock_upload_image.return_value = "https://cdn.example.com/final.jpg"

    # Should not raise error
    await execute_pipeline_tool_job("job-1")
