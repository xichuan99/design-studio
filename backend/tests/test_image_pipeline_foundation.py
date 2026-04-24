"""Unit tests for image pipeline foundation (Phase 1)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.schemas.image_pipeline import StageType, TransformationStageRequest
from app.services.image_pipeline.pipeline import ImageTransformationPipeline, build_pipeline
from app.services.image_pipeline.stages import (
    ApplyWatermarkStage,
    GenerateBackgroundStage,
    InpaintBackgroundStage,
    RemoveBackgroundStage,
    StageExecutionPayload,
    TransformationStage,
)


@pytest.mark.asyncio
async def test_remove_background_stage_uses_url_when_available() -> None:
    stage = RemoveBackgroundStage()
    payload = StageExecutionPayload(image_url="https://example.com/input.jpg")

    with (
        patch(
            "app.services.image_pipeline.stages.bg_removal_service.remove_background_from_url",
            new=AsyncMock(return_value=b"png-bytes"),
        ) as mock_from_url,
        patch(
            "app.services.image_pipeline.stages.bg_removal_service.remove_background",
            new=AsyncMock(return_value=b"should-not-be-called"),
        ) as mock_from_bytes,
    ):
        result = await stage.execute(payload)

    mock_from_url.assert_awaited_once_with("https://example.com/input.jpg")
    mock_from_bytes.assert_not_called()
    assert result.image_bytes == b"png-bytes"
    assert result.metadata["last_completed_stage"] == "remove_bg"
    assert result.metadata["transparent_png_bytes"] == b"png-bytes"


@pytest.mark.asyncio
async def test_remove_background_stage_uses_bytes_without_url() -> None:
    stage = RemoveBackgroundStage()
    payload = StageExecutionPayload(image_bytes=b"raw-input")

    with patch(
        "app.services.image_pipeline.stages.bg_removal_service.remove_background",
        new=AsyncMock(return_value=b"png-output"),
    ) as mock_remove_background:
        result = await stage.execute(payload)

    mock_remove_background.assert_awaited_once_with(b"raw-input")
    assert result.image_bytes == b"png-output"
    assert result.image_url is None


@pytest.mark.asyncio
async def test_pipeline_emits_progress_and_runs_all_stages() -> None:
    class EchoStage(TransformationStage):
        stage_type = "echo"

        async def execute(self, payload: StageExecutionPayload) -> StageExecutionPayload:
            metadata = dict(payload.metadata)
            metadata["steps"] = metadata.get("steps", 0) + 1
            return StageExecutionPayload(
                image_bytes=payload.image_bytes,
                image_url=payload.image_url,
                metadata=metadata,
            )

    events: list[dict] = []

    async def progress_callback(event: dict) -> None:
        events.append(event)

    pipeline = ImageTransformationPipeline(
        stages=[EchoStage(), EchoStage()], progress_callback=progress_callback
    )
    initial_payload = StageExecutionPayload(image_bytes=b"hello")

    result = await pipeline.run(initial_payload)

    assert result.metadata["steps"] == 2
    assert len(events) == 4
    assert events[0]["status"] == "running"
    assert events[-1]["status"] == "completed"
    assert events[-1]["progress"] == 100


def test_build_pipeline_accepts_remove_bg_stage() -> None:
    pipeline = build_pipeline(
        [TransformationStageRequest(type=StageType.REMOVE_BG, params={})]
    )

    assert len(pipeline.stages) == 1
    assert pipeline.stages[0].stage_type == "remove_bg"


def test_build_pipeline_accepts_all_phase2_stage_types() -> None:
    pipeline = build_pipeline(
        [
            TransformationStageRequest(type=StageType.REMOVE_BG, params={}),
            TransformationStageRequest(
                type=StageType.INPAINT_BG,
                params={"prompt": "studio background"},
            ),
            TransformationStageRequest(
                type=StageType.GENERATE_BG,
                params={"visual_prompt": "minimal studio"},
            ),
            TransformationStageRequest(
                type=StageType.WATERMARK,
                params={"watermark_bytes": b"logo"},
            ),
        ]
    )

    assert isinstance(pipeline.stages[0], RemoveBackgroundStage)
    assert isinstance(pipeline.stages[1], InpaintBackgroundStage)
    assert isinstance(pipeline.stages[2], GenerateBackgroundStage)
    assert isinstance(pipeline.stages[3], ApplyWatermarkStage)


@pytest.mark.asyncio
async def test_inpaint_background_stage_uses_source_metadata() -> None:
    stage = InpaintBackgroundStage(params={"prompt": "new cafe background"})
    payload = StageExecutionPayload(
        image_bytes=b"transparent-png",
        metadata={"source_image_url": "https://example.com/original.jpg"},
    )

    with patch(
        "app.services.image_pipeline.stages.bg_removal_service.inpaint_background",
        new=AsyncMock(return_value=b"inpainted"),
    ) as mock_inpaint:
        result = await stage.execute(payload)

    mock_inpaint.assert_awaited_once()
    kwargs = mock_inpaint.await_args.kwargs
    assert kwargs["prompt"] == "new cafe background"
    assert kwargs["original_url"] == "https://example.com/original.jpg"
    assert kwargs["transparent_png_bytes"] == b"transparent-png"
    assert result.image_bytes == b"inpainted"
    assert result.metadata["last_completed_stage"] == "inpaint_bg"


@pytest.mark.asyncio
async def test_generate_background_stage_downloads_generated_url() -> None:
    stage = GenerateBackgroundStage(params={"visual_prompt": "white studio wall"})
    payload = StageExecutionPayload(metadata={"source_image_url": "https://example.com/src.jpg"})

    with (
        patch(
            "app.services.image_pipeline.stages.image_service.generate_background",
            new=AsyncMock(return_value={"image_url": "https://example.com/generated.jpg"}),
        ) as mock_generate,
        patch(
            "app.services.image_pipeline.stages.download_image",
            new=AsyncMock(return_value=b"generated-bytes"),
        ) as mock_download,
    ):
        result = await stage.execute(payload)

    mock_generate.assert_awaited_once()
    mock_download.assert_awaited_once_with("https://example.com/generated.jpg")
    assert result.image_bytes == b"generated-bytes"
    assert result.image_url == "https://example.com/generated.jpg"
    assert result.metadata["last_completed_stage"] == "generate_bg"


@pytest.mark.asyncio
async def test_apply_watermark_stage_with_url_logo() -> None:
    stage = ApplyWatermarkStage(
        params={
            "watermark_url": "https://example.com/logo.png",
            "position": "bottom-right",
            "opacity": 0.6,
            "scale": 0.3,
        }
    )
    payload = StageExecutionPayload(image_bytes=b"base-image")

    with (
        patch(
            "app.services.image_pipeline.stages.download_image",
            new=AsyncMock(return_value=b"logo-bytes"),
        ) as mock_download,
        patch(
            "app.services.image_pipeline.stages.watermark_service.apply_watermark",
            new=AsyncMock(return_value=b"watermarked-image"),
        ) as mock_apply,
    ):
        result = await stage.execute(payload)

    mock_download.assert_awaited_once_with("https://example.com/logo.png")
    mock_apply.assert_awaited_once()
    apply_kwargs = mock_apply.await_args.kwargs
    assert apply_kwargs["base_image_bytes"] == b"base-image"
    assert apply_kwargs["watermark_bytes"] == b"logo-bytes"
    assert result.image_bytes == b"watermarked-image"
    assert result.metadata["last_completed_stage"] == "watermark"
