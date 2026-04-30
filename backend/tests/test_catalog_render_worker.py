"""Tests for execute_catalog_render_tool_job worker."""

from __future__ import annotations

import base64
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.workers.ai_tool_jobs_catalog import execute_catalog_render_tool_job

# 1x1 transparent PNG
_FALLBACK_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAukB9VE3q4kAAAAASUVORK5CYII="
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_payload(total_pages: int = 2, quality_mode: str = "standard") -> dict:
    pages = [
        {
            "page_number": i,
            "type": "cover" if i == 1 else "grid",
            "layout": "hero" if i == 1 else "grid",
            "content": {"title": f"Page {i}"},
        }
        for i in range(1, total_pages + 1)
    ]
    return {
        "final_plan": {
            "schema_version": "1.0",
            "catalog_type": "product",
            "total_pages": total_pages,
            "tone": "premium",
            "style": "minimal",
            "pages": pages,
        },
        "options": {
            "aspect_ratio": "1:1",
            "quality_mode": quality_mode,
            "reference_image_url": None,
        },
    }


def _make_job(payload: dict, *, cancel_requested: bool = False) -> MagicMock:
    job = MagicMock()
    job.id = str(uuid4())
    job.user_id = str(uuid4())
    job.status = "queued"
    job.cancel_requested = cancel_requested
    job.payload_json = payload
    job.started_at = None
    return job


class _FakeSession:
    """Minimal async DB session context manager stub."""

    def __init__(self, job: Any):
        self._job = job
        self.add = MagicMock()
        self.commit = AsyncMock()
        self.delete = AsyncMock()

    async def get(self, model, pk):
        return self._job

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return False


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_execute_catalog_render_ai_generation_happy_path():
    """Each page should be AI-generated. ZIP should be built and uploaded."""
    payload = _make_payload(total_pages=2)
    job = _make_job(payload)

    fake_session = _FakeSession(job)
    fake_png = b"\x89PNG fakedata"

    with (
        patch("app.workers.ai_tool_jobs_catalog.AsyncSessionLocal", return_value=fake_session),
        patch(
            "app.workers.ai_tool_jobs_catalog.generate_background",
            new=AsyncMock(return_value={"image_url": "https://fal.ai/result/img.jpg"}),
        ),
        patch("app.workers.ai_tool_jobs_catalog.download_image", new=AsyncMock(return_value=fake_png)),
        patch("app.workers.ai_tool_jobs_catalog.upload_image", new=AsyncMock(return_value="https://storage/page.png")),
        patch(
            "app.workers.ai_tool_jobs_catalog.AiToolResult",
            MagicMock(return_value=MagicMock()),
        ),
        patch(
            "app.workers.ai_tool_jobs_catalog.refund_ai_tool_job_if_needed",
            new=AsyncMock(),
        ),
    ):
        await execute_catalog_render_tool_job(job.id)


@pytest.mark.asyncio
async def test_execute_catalog_render_falls_back_on_ai_failure():
    """When generate_background raises, fallback PNG should be uploaded instead."""
    payload = _make_payload(total_pages=1)
    job = _make_job(payload)
    fake_session = _FakeSession(job)

    with (
        patch("app.workers.ai_tool_jobs_catalog.AsyncSessionLocal", return_value=fake_session),
        patch(
            "app.workers.ai_tool_jobs_catalog.generate_background",
            new=AsyncMock(side_effect=RuntimeError("fal.ai timeout")),
        ),
        patch("app.workers.ai_tool_jobs_catalog.download_image", new=AsyncMock(return_value=b"fakedata")),
        patch(
            "app.workers.ai_tool_jobs_catalog.upload_image",
            new=AsyncMock(return_value="https://storage/fallback.png"),
        ),
        patch("app.workers.ai_tool_jobs_catalog.AiToolResult", MagicMock(return_value=MagicMock())),
        patch("app.workers.ai_tool_jobs_catalog.refund_ai_tool_job_if_needed", new=AsyncMock()),
    ):
        await execute_catalog_render_tool_job(job.id)

    # Job should have completed with fallback (not failed entirely)
    assert job.status == "completed"


@pytest.mark.asyncio
async def test_execute_catalog_render_canceled_at_start():
    """Job that is cancel_requested before loop should be set to canceled."""
    payload = _make_payload(total_pages=2)
    job = _make_job(payload, cancel_requested=True)
    fake_session = _FakeSession(job)

    with (
        patch("app.workers.ai_tool_jobs_catalog.AsyncSessionLocal", return_value=fake_session),
        patch(
            "app.workers.ai_tool_jobs_catalog.set_ai_tool_job_canceled",
            new=AsyncMock(),
        ) as mock_cancel,
    ):
        await execute_catalog_render_tool_job(job.id)

    mock_cancel.assert_awaited_once()


@pytest.mark.asyncio
async def test_execute_catalog_render_no_pages_raises():
    """A plan with zero pages should raise a ValueError immediately."""
    payload = _make_payload(total_pages=2)
    payload["final_plan"]["total_pages"] = 0
    payload["final_plan"]["pages"] = []
    job = _make_job(payload)
    fake_session = _FakeSession(job)

    with (
        patch("app.workers.ai_tool_jobs_catalog.AsyncSessionLocal", return_value=fake_session),
    ):
        with pytest.raises(ValueError, match="no pages"):
            await execute_catalog_render_tool_job(job.id)


@pytest.mark.asyncio
async def test_execute_catalog_render_all_pages_fail_triggers_refund():
    """If all pages fail to upload even the fallback, refund should be called."""
    payload = _make_payload(total_pages=1)
    job = _make_job(payload)
    fake_session = _FakeSession(job)

    with (
        patch("app.workers.ai_tool_jobs_catalog.AsyncSessionLocal", return_value=fake_session),
        patch(
            "app.workers.ai_tool_jobs_catalog.generate_background",
            new=AsyncMock(side_effect=RuntimeError("AI error")),
        ),
        patch(
            "app.workers.ai_tool_jobs_catalog.download_image",
            new=AsyncMock(side_effect=RuntimeError("download error")),
        ),
        patch(
            "app.workers.ai_tool_jobs_catalog.upload_image",
            new=AsyncMock(side_effect=OSError("S3 down")),
        ),
        patch(
            "app.workers.ai_tool_jobs_catalog.refund_ai_tool_job_if_needed",
            new=AsyncMock(),
        ) as mock_refund,
    ):
        await execute_catalog_render_tool_job(job.id)

    mock_refund.assert_awaited_once()
    assert job.status == "failed"


@pytest.mark.asyncio
async def test_execute_catalog_render_draft_skips_reference():
    """In draft mode, effective_reference_url should be None (no reference image passed to AI)."""
    payload = _make_payload(total_pages=1, quality_mode="draft")
    payload["options"]["reference_image_url"] = "https://example.com/ref.jpg"
    job = _make_job(payload)
    fake_session = _FakeSession(job)

    captured_calls: list = []

    async def _fake_generate(visual_prompt, reference_image_url=None, **kwargs):
        captured_calls.append(reference_image_url)
        return {"image_url": "https://fal.ai/result/img.jpg"}

    with (
        patch("app.workers.ai_tool_jobs_catalog.AsyncSessionLocal", return_value=fake_session),
        patch("app.workers.ai_tool_jobs_catalog.generate_background", new=_fake_generate),
        patch("app.workers.ai_tool_jobs_catalog.download_image", new=AsyncMock(return_value=b"png")),
        patch("app.workers.ai_tool_jobs_catalog.upload_image", new=AsyncMock(return_value="https://storage/p.png")),
        patch("app.workers.ai_tool_jobs_catalog.AiToolResult", MagicMock(return_value=MagicMock())),
        patch("app.workers.ai_tool_jobs_catalog.refund_ai_tool_job_if_needed", new=AsyncMock()),
    ):
        await execute_catalog_render_tool_job(job.id)

    # In draft mode, reference_image_url should be None passed to generate_background
    assert all(url is None for url in captured_calls)
