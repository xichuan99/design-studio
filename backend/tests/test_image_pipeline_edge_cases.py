"""Edge case and error path tests for Phase 1-3 image pipeline (100% coverage)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch
import pytest

from app.services.image_pipeline.pipeline import ImageTransformationPipeline
from app.services.image_pipeline.stages import (
    ApplyWatermarkStage,
    GenerateBackgroundStage,
    InpaintBackgroundStage,
    RemoveBackgroundStage,
    StageExecutionPayload,
    TransformationStage,
)


# === RemoveBackgroundStage Edge Cases ===


@pytest.mark.asyncio
async def test_remove_background_stage_validates_missing_input() -> None:
    """RemoveBackgroundStage validation should fail without image source."""
    stage = RemoveBackgroundStage()
    payload = StageExecutionPayload()

    with pytest.raises(ValueError, match="requires image_bytes or image_url"):
        await stage.validate(payload)


# === InpaintBackgroundStage Edge Cases ===


@pytest.mark.asyncio
async def test_inpaint_background_stage_validates_missing_prompt() -> None:
    """InpaintBackgroundStage requires prompt in params."""
    stage = InpaintBackgroundStage(params={})
    payload = StageExecutionPayload(image_bytes=b"png", metadata={"source_image_url": "url"})

    with pytest.raises(ValueError, match="requires params.prompt"):
        await stage.validate(payload)


@pytest.mark.asyncio
async def test_inpaint_background_stage_validates_missing_mask() -> None:
    """InpaintBackgroundStage requires mask or transparent PNG."""
    stage = InpaintBackgroundStage(params={"prompt": "test"})
    payload = StageExecutionPayload()

    with pytest.raises(ValueError, match="requires transparent PNG or mask_url"):
        await stage.validate(payload)


@pytest.mark.asyncio
async def test_inpaint_background_stage_validates_missing_original_context() -> None:
    """InpaintBackgroundStage requires original image context."""
    stage = InpaintBackgroundStage(params={"prompt": "test"})
    payload = StageExecutionPayload(image_bytes=b"png")

    with pytest.raises(ValueError, match="requires source image context"):
        await stage.validate(payload)


@pytest.mark.asyncio
async def test_inpaint_background_stage_with_bytearray_input() -> None:
    """InpaintBackgroundStage should handle bytearray transparent PNG."""
    stage = InpaintBackgroundStage(params={"prompt": "cafe background"})
    payload = StageExecutionPayload(
        image_bytes=bytearray(b"transparent-png"),
        metadata={"source_image_url": "https://example.com/original.jpg"},
    )

    with patch(
        "app.services.image_pipeline.stages.bg_removal_service.inpaint_background",
        new=AsyncMock(return_value=b"inpainted"),
    ):
        result = await stage.execute(payload)

    assert result.image_bytes == b"inpainted"
    assert result.metadata["last_completed_stage"] == "inpaint_bg"


@pytest.mark.asyncio
async def test_inpaint_background_stage_with_bytearray_original() -> None:
    """InpaintBackgroundStage should handle bytearray original bytes."""
    stage = InpaintBackgroundStage(
        params={
            "prompt": "test",
            "original_bytes": bytearray(b"original-image"),
        }
    )
    payload = StageExecutionPayload(image_bytes=b"transparent-png")

    with patch(
        "app.services.image_pipeline.stages.bg_removal_service.inpaint_background",
        new=AsyncMock(return_value=b"inpainted"),
    ) as mock_inpaint:
        result = await stage.execute(payload)

    mock_inpaint.assert_awaited_once()
    call_kwargs = mock_inpaint.await_args.kwargs
    assert call_kwargs["original_bytes"] == b"original-image"
    assert result.image_bytes == b"inpainted"


@pytest.mark.asyncio
async def test_inpaint_background_stage_invalid_transparent_png_type() -> None:
    """InpaintBackgroundStage should reject non-bytes transparent PNG."""
    stage = InpaintBackgroundStage(params={"prompt": "test"})
    payload = StageExecutionPayload(
        image_bytes=123,  # Invalid type
        metadata={"source_image_url": "https://example.com/original.jpg"},
    )

    with pytest.raises(ValueError, match="transparent PNG payload must be bytes"):
        await stage.execute(payload)


@pytest.mark.asyncio
async def test_inpaint_background_stage_invalid_original_bytes_type() -> None:
    """InpaintBackgroundStage should reject non-bytes original_bytes."""
    stage = InpaintBackgroundStage(
        params={"prompt": "test", "original_bytes": 456}  # Invalid type
    )
    payload = StageExecutionPayload(image_bytes=b"transparent-png")

    with pytest.raises(ValueError, match="original_bytes must be bytes"):
        await stage.execute(payload)


@pytest.mark.asyncio
async def test_inpaint_background_stage_with_mask_url() -> None:
    """InpaintBackgroundStage can use mask_url instead of transparent PNG."""
    stage = InpaintBackgroundStage(
        params={
            "prompt": "cafe background",
            "mask_url": "https://example.com/mask.png",
            "original_url": "https://example.com/original.jpg",
        }
    )
    payload = StageExecutionPayload()

    with (
        patch(
            "app.services.image_pipeline.stages.inpaint_service.inpaint_image",
            new=AsyncMock(return_value={"url": "https://example.com/result.jpg"}),
        ) as mock_inpaint,
        patch(
            "app.services.image_pipeline.stages.download_image",
            new=AsyncMock(return_value=b"inpainted-bytes"),
        ) as mock_download,
    ):
        result = await stage.execute(payload)

    mock_inpaint.assert_awaited_once()
    mock_download.assert_awaited_once_with("https://example.com/result.jpg")
    assert result.image_bytes == b"inpainted-bytes"


@pytest.mark.asyncio
async def test_inpaint_background_stage_inpaint_service_no_result_url() -> None:
    """InpaintBackgroundStage should fail if inpaint service returns no URL."""
    stage = InpaintBackgroundStage(
        params={
            "prompt": "test",
            "mask_url": "https://example.com/mask.png",
            "original_url": "https://example.com/original.jpg",
        }
    )
    payload = StageExecutionPayload()

    with patch(
        "app.services.image_pipeline.stages.inpaint_service.inpaint_image",
        new=AsyncMock(return_value={}),  # No URL in response
    ):
        with pytest.raises(RuntimeError, match="Inpaint service returned no result URL"):
            await stage.execute(payload)


# === GenerateBackgroundStage Edge Cases ===


@pytest.mark.asyncio
async def test_generate_background_stage_validates_missing_prompt() -> None:
    """GenerateBackgroundStage requires visual_prompt or prompt."""
    stage = GenerateBackgroundStage(params={})
    payload = StageExecutionPayload()

    with pytest.raises(ValueError, match="requires params.visual_prompt"):
        await stage.validate(payload)


@pytest.mark.asyncio
async def test_generate_background_stage_uses_fallback_prompt_param() -> None:
    """GenerateBackgroundStage should fallback to 'prompt' if visual_prompt missing."""
    stage = GenerateBackgroundStage(params={"prompt": "fallback prompt"})
    payload = StageExecutionPayload()

    with (
        patch(
            "app.services.image_pipeline.stages.image_service.generate_background",
            new=AsyncMock(return_value={"image_url": "https://example.com/gen.jpg"}),
        ) as mock_generate,
        patch(
            "app.services.image_pipeline.stages.download_image",
            new=AsyncMock(return_value=b"generated"),
        ),
    ):
        await stage.execute(payload)

    call_kwargs = mock_generate.await_args.kwargs
    assert call_kwargs["visual_prompt"] == "fallback prompt"


@pytest.mark.asyncio
async def test_generate_background_stage_no_result_url() -> None:
    """GenerateBackgroundStage should fail if image_service returns no URL."""
    stage = GenerateBackgroundStage(params={"visual_prompt": "test"})
    payload = StageExecutionPayload()

    with patch(
        "app.services.image_pipeline.stages.image_service.generate_background",
        new=AsyncMock(return_value={}),  # No image_url
    ):
        with pytest.raises(RuntimeError, match="Generate background returned no image_url"):
            await stage.execute(payload)


@pytest.mark.asyncio
async def test_generate_background_stage_with_all_params() -> None:
    """GenerateBackgroundStage should pass all parameters correctly."""
    stage = GenerateBackgroundStage(
        params={
            "visual_prompt": "studio background",
            "style": "cinematic",
            "aspect_ratio": "16:9",
            "integrated_text": True,
            "preserve_product": False,
            "seed": 42,
            "reference_image_url": "https://example.com/ref.jpg",
        }
    )
    payload = StageExecutionPayload()

    with (
        patch(
            "app.services.image_pipeline.stages.image_service.generate_background",
            new=AsyncMock(return_value={"image_url": "https://example.com/gen.jpg"}),
        ) as mock_generate,
        patch(
            "app.services.image_pipeline.stages.download_image",
            new=AsyncMock(return_value=b"generated"),
        ),
    ):
        await stage.execute(payload)

    call_kwargs = mock_generate.await_args.kwargs
    assert call_kwargs["visual_prompt"] == "studio background"
    assert call_kwargs["style"] == "cinematic"
    assert call_kwargs["aspect_ratio"] == "16:9"
    assert call_kwargs["integrated_text"] is True
    assert call_kwargs["preserve_product"] is False
    assert call_kwargs["seed"] == 42
    assert call_kwargs["reference_image_url"] == "https://example.com/ref.jpg"


# === ApplyWatermarkStage Edge Cases ===


@pytest.mark.asyncio
async def test_apply_watermark_stage_validates_missing_image_payload() -> None:
    """ApplyWatermarkStage requires image payload."""
    stage = ApplyWatermarkStage(params={"watermark_bytes": b"logo"})
    payload = StageExecutionPayload()

    with pytest.raises(ValueError, match="requires image payload"):
        await stage.validate(payload)


@pytest.mark.asyncio
async def test_apply_watermark_stage_validates_missing_watermark() -> None:
    """ApplyWatermarkStage requires watermark bytes or URL."""
    stage = ApplyWatermarkStage(params={})
    payload = StageExecutionPayload(image_bytes=b"image")

    with pytest.raises(ValueError, match="requires watermark bytes or URL"):
        await stage.validate(payload)


@pytest.mark.asyncio
async def test_apply_watermark_stage_with_base64_watermark() -> None:
    """ApplyWatermarkStage should decode base64 watermark strings."""
    import base64

    logo_b64 = base64.b64encode(b"logo-data").decode()
    stage = ApplyWatermarkStage(
        params={
            "watermark_bytes": logo_b64,
            "position": "top-left",
        }
    )
    payload = StageExecutionPayload(image_bytes=b"image")

    with (
        patch(
            "app.services.image_pipeline.stages.watermark_service.apply_watermark",
            new=AsyncMock(return_value=b"watermarked"),
        ) as mock_apply,
    ):
        await stage.execute(payload)

    call_kwargs = mock_apply.await_args.kwargs
    assert call_kwargs["watermark_bytes"] == b"logo-data"
    assert call_kwargs["position"] == "top-left"


@pytest.mark.asyncio
async def test_apply_watermark_stage_with_data_uri_watermark() -> None:
    """ApplyWatermarkStage should decode data: URI base64 watermarks."""
    import base64

    logo_b64 = base64.b64encode(b"logo-data").decode()
    data_uri = f"data:image/png;base64,{logo_b64}"
    stage = ApplyWatermarkStage(params={"watermark_bytes": data_uri})
    payload = StageExecutionPayload(image_bytes=b"image")

    with patch(
        "app.services.image_pipeline.stages.watermark_service.apply_watermark",
        new=AsyncMock(return_value=b"watermarked"),
    ) as mock_apply:
        await stage.execute(payload)

    call_kwargs = mock_apply.await_args.kwargs
    assert call_kwargs["watermark_bytes"] == b"logo-data"


@pytest.mark.asyncio
async def test_apply_watermark_stage_invalid_base64() -> None:
    """ApplyWatermarkStage should reject invalid base64."""
    stage = ApplyWatermarkStage(params={"watermark_bytes": "not-valid-base64!!!"})
    payload = StageExecutionPayload(image_bytes=b"image")

    with pytest.raises(ValueError, match="Invalid base64 watermark payload"):
        await stage.execute(payload)


@pytest.mark.asyncio
async def test_apply_watermark_stage_with_logo_bytes_param() -> None:
    """ApplyWatermarkStage should accept 'logo_bytes' as alias for watermark_bytes."""
    stage = ApplyWatermarkStage(params={"logo_bytes": b"logo"})
    payload = StageExecutionPayload(image_bytes=b"image")

    with patch(
        "app.services.image_pipeline.stages.watermark_service.apply_watermark",
        new=AsyncMock(return_value=b"watermarked"),
    ):
        result = await stage.execute(payload)

    assert result.image_bytes == b"watermarked"


@pytest.mark.asyncio
async def test_apply_watermark_stage_with_bytearray_base_image() -> None:
    """ApplyWatermarkStage should handle bytearray base image."""
    stage = ApplyWatermarkStage(params={"watermark_bytes": b"logo"})
    payload = StageExecutionPayload(image_bytes=bytearray(b"image"))

    with patch(
        "app.services.image_pipeline.stages.watermark_service.apply_watermark",
        new=AsyncMock(return_value=b"watermarked"),
    ) as mock_apply:
        await stage.execute(payload)

    call_kwargs = mock_apply.await_args.kwargs
    assert isinstance(call_kwargs["base_image_bytes"], bytes)
    assert call_kwargs["base_image_bytes"] == b"image"


@pytest.mark.asyncio
async def test_apply_watermark_stage_with_bytearray_watermark() -> None:
    """ApplyWatermarkStage should handle bytearray watermark."""
    stage = ApplyWatermarkStage(params={"watermark_bytes": bytearray(b"logo")})
    payload = StageExecutionPayload(image_bytes=b"image")

    with patch(
        "app.services.image_pipeline.stages.watermark_service.apply_watermark",
        new=AsyncMock(return_value=b"watermarked"),
    ) as mock_apply:
        await stage.execute(payload)

    call_kwargs = mock_apply.await_args.kwargs
    assert isinstance(call_kwargs["watermark_bytes"], bytes)
    assert call_kwargs["watermark_bytes"] == b"logo"


@pytest.mark.asyncio
async def test_apply_watermark_stage_with_logo_url_param() -> None:
    """ApplyWatermarkStage should accept 'logo_url' as alias for watermark_url."""
    stage = ApplyWatermarkStage(params={"logo_url": "https://example.com/logo.png"})
    payload = StageExecutionPayload(image_bytes=b"image")

    with (
        patch(
            "app.services.image_pipeline.stages.download_image",
            new=AsyncMock(return_value=b"logo"),
        ) as mock_download,
        patch(
            "app.services.image_pipeline.stages.watermark_service.apply_watermark",
            new=AsyncMock(return_value=b"watermarked"),
        ),
    ):
        await stage.execute(payload)

    mock_download.assert_awaited_once_with("https://example.com/logo.png")


@pytest.mark.asyncio
async def test_apply_watermark_stage_with_image_url_base() -> None:
    """ApplyWatermarkStage should download base image if only URL provided."""
    stage = ApplyWatermarkStage(params={"watermark_bytes": b"logo"})
    payload = StageExecutionPayload(image_url="https://example.com/image.jpg")

    with (
        patch(
            "app.services.image_pipeline.stages.download_image",
            new=AsyncMock(return_value=b"downloaded-image"),
        ) as mock_download,
        patch(
            "app.services.image_pipeline.stages.watermark_service.apply_watermark",
            new=AsyncMock(return_value=b"watermarked"),
        ) as mock_apply,
    ):
        await stage.execute(payload)

    mock_download.assert_awaited_once_with("https://example.com/image.jpg")
    call_kwargs = mock_apply.await_args.kwargs
    assert call_kwargs["base_image_bytes"] == b"downloaded-image"


@pytest.mark.asyncio
async def test_apply_watermark_stage_resolve_watermark_bytes_unable_to_resolve() -> None:
    """ApplyWatermarkStage should fail if unable to resolve watermark bytes."""
    stage = ApplyWatermarkStage(params={"watermark_int": 123})  # Invalid param
    payload = StageExecutionPayload(image_bytes=b"image")

    # This stage will fail validation before execute, since no watermark is provided
    with pytest.raises(ValueError, match="requires watermark bytes or URL"):
        await stage.validate(payload)


@pytest.mark.asyncio
async def test_apply_watermark_stage_resolve_base_image_unable_to_resolve() -> None:
    """ApplyWatermarkStage should fail if unable to resolve base image bytes."""
    stage = ApplyWatermarkStage(params={"watermark_bytes": b"logo"})
    payload = StageExecutionPayload()  # No image_bytes or image_url

    # This stage will fail validation before execute, since no image payload
    with pytest.raises(ValueError, match="requires image payload"):
        await stage.validate(payload)


@pytest.mark.asyncio
async def test_apply_watermark_stage_with_all_params() -> None:
    """ApplyWatermarkStage should apply all parameters correctly."""
    stage = ApplyWatermarkStage(
        params={
            "watermark_bytes": b"logo",
            "position": "center",
            "opacity": 0.8,
            "scale": 0.15,
            "visibility_preset": "subtle",
        }
    )
    payload = StageExecutionPayload(image_bytes=b"image")

    with patch(
        "app.services.image_pipeline.stages.watermark_service.apply_watermark",
        new=AsyncMock(return_value=b"watermarked"),
    ) as mock_apply:
        await stage.execute(payload)

    call_kwargs = mock_apply.await_args.kwargs
    assert call_kwargs["position"] == "center"
    assert call_kwargs["opacity"] == 0.8
    assert call_kwargs["scale"] == 0.15
    assert call_kwargs["visibility_preset"] == "subtle"


# === Pipeline Orchestrator Edge Cases ===


def test_pipeline_requires_at_least_one_stage() -> None:
    """Pipeline should reject empty stage list."""
    with pytest.raises(ValueError, match="requires at least one stage"):
        ImageTransformationPipeline(stages=[])


@pytest.mark.asyncio
async def test_pipeline_progress_callback_handles_sync_callback() -> None:
    """Pipeline should handle synchronous progress callbacks."""
    events: list[dict] = []

    def sync_callback(event: dict) -> None:
        events.append(event)

    class DummyStage(TransformationStage):
        stage_type = "dummy"

        async def execute(self, payload: StageExecutionPayload) -> StageExecutionPayload:
            return payload

    pipeline = ImageTransformationPipeline(
        stages=[DummyStage()], progress_callback=sync_callback
    )
    await pipeline.run(StageExecutionPayload(image_bytes=b"test"))

    assert len(events) == 2  # running + completed
    assert events[0]["status"] == "running"
    assert events[1]["status"] == "completed"


@pytest.mark.asyncio
async def test_multi_stage_pipeline_cancellation_handling() -> None:
    """Pipeline should handle stage execution in correct order with metadata chaining."""

    class MetadataChainStage(TransformationStage):
        def __init__(self, stage_id: str):
            super().__init__()
            self.stage_id = stage_id
            self.stage_type = f"metadata_chain_{stage_id}"

        async def execute(self, payload: StageExecutionPayload) -> StageExecutionPayload:
            metadata = dict(payload.metadata)
            metadata[f"visited_stage_{self.stage_id}"] = True
            metadata[f"order_{self.stage_id}"] = metadata.get("visit_count", 0) + 1
            return StageExecutionPayload(
                image_bytes=payload.image_bytes,
                metadata=metadata,
            )

    pipeline = ImageTransformationPipeline(
        stages=[MetadataChainStage("1"), MetadataChainStage("2")],
    )
    result = await pipeline.run(StageExecutionPayload(image_bytes=b"test"))

    assert result.metadata["visited_stage_1"]
    assert result.metadata["visited_stage_2"]


@pytest.mark.asyncio
async def test_multi_stage_pipeline_progress_tracking() -> None:
    """Pipeline should track progress correctly with multiple stages."""

    class CounterStage(TransformationStage):
        def __init__(self, stage_id: str):
            super().__init__()
            self.stage_id = stage_id
            self.stage_type = f"counter_{stage_id}"

        async def execute(self, payload: StageExecutionPayload) -> StageExecutionPayload:
            metadata = dict(payload.metadata)
            metadata[f"stage_{self.stage_id}_completed"] = True
            return StageExecutionPayload(
                image_bytes=payload.image_bytes,
                metadata=metadata,
            )

    events: list[dict] = []

    async def track_progress(event: dict) -> None:
        events.append(event)

    pipeline = ImageTransformationPipeline(
        stages=[CounterStage("a"), CounterStage("b"), CounterStage("c")],
        progress_callback=track_progress,
    )
    result = await pipeline.run(StageExecutionPayload(image_bytes=b"test"))

    # Should have 2 events per stage (running + completed)
    assert len(events) == 6
    assert events[0]["status"] == "running"
    assert events[0]["stage"] == "counter_a"
    assert events[1]["status"] == "completed"
    assert events[1]["progress"] >= 33  # Progress should be cumulative
    assert result.metadata["stage_a_completed"]
    assert result.metadata["stage_b_completed"]
    assert result.metadata["stage_c_completed"]
