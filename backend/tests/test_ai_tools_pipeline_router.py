from unittest.mock import AsyncMock, patch

import pytest

from app.api.ai_tools_routers.pipeline import (
    CreatePipelineJobRequest,
    ExecutePipelinePreviewRequest,
    create_pipeline_job,
    execute_pipeline_preview,
)
from app.core.exceptions import ValidationError


@pytest.mark.asyncio
async def test_create_pipeline_job_requires_image_source() -> None:
    request = CreatePipelineJobRequest(
        image_url=None,
        image_bytes=None,
        stages=[{"type": "remove_bg", "params": {}}],
    )

    with pytest.raises(ValidationError, match="image_url or image_bytes is required"):
        await create_pipeline_job(request=request, db=object(), current_user=object())


@pytest.mark.asyncio
@patch("app.api.ai_tools_routers.pipeline.create_tool_job", new_callable=AsyncMock)
async def test_create_pipeline_job_maps_payload_to_generic_job(
    mock_create_tool_job,
) -> None:
    mock_create_tool_job.return_value = {"job_id": "job-1", "tool_name": "pipeline"}
    request = CreatePipelineJobRequest(
        image_url="https://example.com/image.jpg",
        stages=[{"type": "remove_bg", "params": {"quality": "standard"}}],
        metadata={"source": "test"},
    )

    result = await create_pipeline_job(request=request, db="db", current_user="user")

    assert result["job_id"] == "job-1"
    mock_create_tool_job.assert_awaited_once()
    called_request = mock_create_tool_job.await_args.args[0]
    assert called_request.tool_name == "pipeline"
    assert called_request.payload["image_url"] == "https://example.com/image.jpg"
    assert called_request.payload["stages"][0]["type"] == "remove_bg"
    assert called_request.payload["metadata"]["source"] == "test"


@pytest.mark.asyncio
@patch("app.api.ai_tools_routers.pipeline.create_tool_job", new_callable=AsyncMock)
async def test_create_pipeline_job_accepts_image_bytes_and_output_content_type(
    mock_create_tool_job,
) -> None:
    mock_create_tool_job.return_value = {"job_id": "job-2", "tool_name": "pipeline"}
    request = CreatePipelineJobRequest(
        image_url=None,
        image_bytes="data:image/png;base64,aGVsbG8=",
        stages=[{"type": "remove_bg", "params": {}}],
        output_content_type="image/png",
    )

    result = await create_pipeline_job(request=request, db="db", current_user="user")

    assert result["job_id"] == "job-2"
    called_request = mock_create_tool_job.await_args.args[0]
    assert called_request.payload["image_url"] is None
    assert called_request.payload["image_bytes"] == "data:image/png;base64,aGVsbG8="
    assert called_request.payload["output_content_type"] == "image/png"


@pytest.mark.asyncio
async def test_create_pipeline_job_validates_inpaint_prompt() -> None:
    request = CreatePipelineJobRequest(
        image_url="https://example.com/image.jpg",
        stages=[{"type": "inpaint_bg", "params": {}}],
    )

    with pytest.raises(ValidationError, match="prompt is required for inpaint_bg"):
        await create_pipeline_job(request=request, db=object(), current_user=object())


@pytest.mark.asyncio
async def test_create_pipeline_job_validates_generate_prompt() -> None:
    request = CreatePipelineJobRequest(
        image_url="https://example.com/image.jpg",
        stages=[{"type": "generate_bg", "params": {}}],
    )

    with pytest.raises(ValidationError, match=r"visual_prompt \(or prompt\) is required"):
        await create_pipeline_job(request=request, db=object(), current_user=object())


@pytest.mark.asyncio
async def test_create_pipeline_job_validates_watermark_source() -> None:
    request = CreatePipelineJobRequest(
        image_url="https://example.com/image.jpg",
        stages=[{"type": "watermark", "params": {"position": "bottom-right"}}],
    )

    with pytest.raises(ValidationError, match="requires watermark_url/logo_url"):
        await create_pipeline_job(request=request, db=object(), current_user=object())


@pytest.mark.asyncio
async def test_execute_pipeline_preview_requires_image_source() -> None:
    request = ExecutePipelinePreviewRequest(
        image_url=None,
        image_bytes=None,
        stages=[{"type": "remove_bg", "params": {}}],
    )

    with pytest.raises(ValidationError, match="image_url or image_bytes is required"):
        await execute_pipeline_preview(request=request, db=object(), current_user=object())


@pytest.mark.asyncio
@patch("app.api.ai_tools_routers.pipeline.upload_image", new_callable=AsyncMock)
@patch("app.api.ai_tools_routers.pipeline.build_pipeline")
async def test_execute_pipeline_preview_returns_uploaded_result(
    mock_build_pipeline,
    mock_upload_image,
) -> None:
    request = ExecutePipelinePreviewRequest(
        image_bytes="data:image/png;base64,aGVsbG8=",
        stages=[{"type": "remove_bg", "params": {}}],
        save_result=False,
        output_content_type="image/png",
    )

    mock_pipeline = AsyncMock()
    mock_pipeline.run = AsyncMock(return_value=type("Result", (), {"image_bytes": b"output-bytes"})())
    mock_build_pipeline.return_value = mock_pipeline
    mock_upload_image.return_value = "https://example.com/pipeline-preview.png"

    result = await execute_pipeline_preview(request=request, db=object(), current_user=type("User", (), {"id": "u1"})())

    assert result["url"] == "https://example.com/pipeline-preview.png"
    assert result["result_id"] is None
    assert result["stage_count"] == 1
    mock_upload_image.assert_awaited_once_with(
        b"output-bytes",
        content_type="image/png",
        prefix="pipeline_preview_u1",
    )
