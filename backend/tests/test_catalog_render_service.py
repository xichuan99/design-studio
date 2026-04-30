"""Unit tests for catalog_render_service and _build_page_visual_prompt."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.catalog import (
    CatalogPagePlan,
    CatalogRenderOptions,
    CatalogRenderStartRequest,
    FinalizePlanResponse,
)
from app.services.catalog_render_service import (
    _calculate_catalog_render_credit,
    serialize_catalog_render_status,
)
from app.workers.ai_tool_jobs_catalog import _build_page_visual_prompt


# ---------------------------------------------------------------------------
# _calculate_catalog_render_credit
# ---------------------------------------------------------------------------


def test_credit_calculation_is_1_per_page():
    assert _calculate_catalog_render_credit(5) == 5
    assert _calculate_catalog_render_credit(1) == 1
    assert _calculate_catalog_render_credit(24) == 24


def test_credit_calculation_zero_pages():
    assert _calculate_catalog_render_credit(0) == 0


# ---------------------------------------------------------------------------
# serialize_catalog_render_status
# ---------------------------------------------------------------------------


def _make_job(
    *,
    job_id: str = "job-1",
    status: str = "processing",
    error_message: Any = None,
    payload: Any = None,
) -> MagicMock:
    job = MagicMock()
    job.id = job_id
    job.status = status
    job.error_message = error_message
    job.payload_json = payload or {}
    return job


def test_serialize_status_empty_meta():
    job = _make_job(status="queued", payload={})
    result = serialize_catalog_render_status(job)

    assert result["job_id"] == "job-1"
    assert result["status"] == "queued"
    assert result["progress"]["total_pages"] == 1
    assert result["progress"]["completed_pages"] == 0
    assert result["progress"]["percent"] == 0
    assert result["pages"] == []
    assert result["zip_url"] is None
    assert result["error_message"] is None


def test_serialize_status_with_pages():
    pages = [
        {"page_number": 1, "status": "completed", "result_url": "https://example.com/p1.png", "fallback_used": False},
        {"page_number": 2, "status": "fallback", "result_url": "https://example.com/p2.png", "fallback_used": True},
    ]
    job = _make_job(
        status="completed",
        payload={
            "_result_meta": {
                "total_pages": 2,
                "completed_pages": 2,
                "pages": pages,
                "zip_url": "https://example.com/catalog.zip",
            }
        },
    )
    result = serialize_catalog_render_status(job)

    assert result["status"] == "completed"
    assert result["progress"]["total_pages"] == 2
    assert result["progress"]["completed_pages"] == 2
    assert result["progress"]["percent"] == 100
    assert len(result["pages"]) == 2
    assert result["zip_url"] == "https://example.com/catalog.zip"


def test_serialize_status_clamps_completed_pages():
    job = _make_job(
        status="processing",
        payload={
            "_result_meta": {
                "total_pages": 3,
                "completed_pages": 99,  # out of range
                "pages": [],
                "zip_url": None,
            }
        },
    )
    result = serialize_catalog_render_status(job)
    assert result["progress"]["completed_pages"] == 3  # clamped to total_pages
    assert result["progress"]["percent"] == 100


def test_serialize_status_with_error():
    job = _make_job(status="failed", error_message="Render gagal karena timeout", payload={})
    result = serialize_catalog_render_status(job)
    assert result["status"] == "failed"
    assert result["error_message"] == "Render gagal karena timeout"


# ---------------------------------------------------------------------------
# _build_page_visual_prompt
# ---------------------------------------------------------------------------


def test_build_prompt_cover_page_product():
    page = {"type": "cover", "layout": "hero", "content": {"title": "Katalog Musim Gugur"}}
    prompt = _build_page_visual_prompt(page, catalog_type="product", style="minimal", tone="premium")

    assert "catalog page background visual" in prompt
    assert "cover" in prompt
    assert "Katalog Musim Gugur" in prompt
    assert "product photography" in prompt
    assert "luxury" in prompt  # premium tone
    assert "copy space" in prompt
    assert "no text" in prompt


def test_build_prompt_service_type():
    page = {"type": "hero", "layout": "split-content", "content": {"title": ""}}
    prompt = _build_page_visual_prompt(page, catalog_type="service", style="auto", tone="formal")

    assert "service illustration" in prompt
    assert "corporate" in prompt


def test_build_prompt_unknown_page_type_falls_back_gracefully():
    page = {"type": "custom_exotic_layout", "layout": "unknown", "content": {}}
    prompt = _build_page_visual_prompt(page, catalog_type="product", style="auto", tone="fun")

    # Should not raise and should still be a valid prompt string
    assert isinstance(prompt, str)
    assert len(prompt) > 20
    assert "custom_exotic_layout catalog page layout" in prompt


def test_build_prompt_empty_title_skips_themed_for():
    page = {"type": "grid", "layout": "grid", "content": {"title": ""}}
    prompt = _build_page_visual_prompt(page, catalog_type="product", style="auto", tone="soft_selling")

    assert "themed for" not in prompt


def test_build_prompt_tone_mapping():
    tones_and_expected = {
        "formal": "corporate",
        "fun": "playful",
        "premium": "luxury",
        "soft_selling": "warm",
    }
    for tone, expected_keyword in tones_and_expected.items():
        page = {"type": "cover", "layout": "hero", "content": {}}
        prompt = _build_page_visual_prompt(page, catalog_type="product", style="auto", tone=tone)
        assert expected_keyword in prompt, f"Expected '{expected_keyword}' for tone='{tone}' in prompt: {prompt}"


# ---------------------------------------------------------------------------
# start_catalog_render_job — integration flow (mocked DB + dispatch)
# ---------------------------------------------------------------------------


def _make_finalize_plan(total_pages: int = 3) -> FinalizePlanResponse:
    pages = [
        CatalogPagePlan(
            page_number=i,
            type="cover" if i == 1 else "grid",
            layout="hero" if i == 1 else "grid",
            content={"title": f"Halaman {i}"},
        )
        for i in range(1, total_pages + 1)
    ]
    return FinalizePlanResponse(
        schema_version="1.0",
        catalog_type="product",
        total_pages=total_pages,
        tone="premium",
        style="minimal",
        pages=pages,
    )


@pytest.mark.asyncio
async def test_start_catalog_render_job_creates_and_dispatches():
    from uuid import uuid4

    from app.services.catalog_render_service import start_catalog_render_job

    mock_job = MagicMock()
    mock_job.id = uuid4()
    mock_job.status = "queued"
    mock_job.created_at = None
    mock_job.payload_json = {}
    mock_job.credits_remaining = 100

    user = MagicMock()
    user.id = uuid4()
    user.credits_remaining = 100

    db = AsyncMock()

    request = CatalogRenderStartRequest(
        final_plan=_make_finalize_plan(3),
        options=CatalogRenderOptions(aspect_ratio="1:1", quality_mode="draft"),
    )

    with (
        patch("app.services.catalog_render_service.create_job", new=AsyncMock(return_value=(mock_job, True))),
        patch("app.services.catalog_render_service.log_credit_change", new=AsyncMock()),
        patch("app.services.catalog_render_service.asyncio.create_task") as mock_create_task,
    ):
        result = await start_catalog_render_job(db=db, current_user=user, request=request)

    assert result["job_id"] == str(mock_job.id)
    assert result["total_pages"] == 3
    assert result["status"] == "queued"
    mock_create_task.assert_called_once()


@pytest.mark.asyncio
async def test_start_catalog_render_job_reuses_existing_job():
    """When create_job returns is_new_job=False, no credit debit or task dispatch should happen."""
    from uuid import uuid4

    from app.services.catalog_render_service import start_catalog_render_job

    mock_job = MagicMock()
    mock_job.id = uuid4()
    mock_job.status = "processing"
    mock_job.created_at = None
    mock_job.payload_json = {}

    user = MagicMock()
    user.id = uuid4()
    user.credits_remaining = 100

    db = AsyncMock()

    request = CatalogRenderStartRequest(
        final_plan=_make_finalize_plan(3),
        options=CatalogRenderOptions(),
    )

    with (
        patch("app.services.catalog_render_service.create_job", new=AsyncMock(return_value=(mock_job, False))),
        patch("app.services.catalog_render_service.log_credit_change", new=AsyncMock()) as mock_credit,
        patch("app.services.catalog_render_service.asyncio.create_task") as mock_task,
    ):
        result = await start_catalog_render_job(db=db, current_user=user, request=request)

    mock_credit.assert_not_awaited()
    mock_task.assert_not_called()
    assert result["status"] == "processing"
