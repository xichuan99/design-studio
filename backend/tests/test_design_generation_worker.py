from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.api.designs_routers.generation import generate_design
from app.api.designs_routers.jobs import get_job_status
from app.schemas.design import DesignGenerationRequest
from app.services.llm_client import LLMRateLimitError
from app.workers.design_generation import _execute_pipeline, generate_design_task


@pytest.mark.asyncio
@patch("app.workers.design_generation._get_job_checkpoint", new_callable=AsyncMock)
@patch("app.workers.design_generation._update_job_status", new_callable=AsyncMock)
@patch("app.workers.design_generation.upload_image", new_callable=AsyncMock)
@patch("app.workers.design_generation.download_image", new_callable=AsyncMock)
@patch("app.workers.design_generation.generate_background", new_callable=AsyncMock)
@patch("app.services.quantum_service.optimize_quantum_layout", new_callable=AsyncMock)
@patch("app.workers.design_generation.parse_design_text", new_callable=AsyncMock)
async def test_execute_pipeline_persists_job_file_size(
    mock_parse_design_text,
    mock_optimize_quantum_layout,
    mock_generate_background,
    mock_download_image,
    mock_upload_image,
    mock_update_job_status,
    mock_get_job_checkpoint,
):
    mock_get_job_checkpoint.return_value = {}
    mock_parse_design_text.return_value = SimpleNamespace(
        headline="Headline",
        sub_headline="Sub",
        cta="CTA",
        visual_prompt="prompt final",
        visual_prompt_parts=None,
    )
    mock_optimize_quantum_layout.return_value = None
    mock_generate_background.return_value = {
        "image_url": "https://cdn.example.com/generated.jpg",
        "content_type": "image/jpeg",
    }
    mock_download_image.return_value = b"abc123"
    mock_upload_image.return_value = "https://cdn.example.com/permanent.jpg"

    await _execute_pipeline(
        job_id="job-1",
        raw_text="Buat desain",
        aspect_ratio="1:1",
        style="auto",
        reference_url=None,
        integrated_text=False,
    )

    completion_call = mock_update_job_status.await_args_list[-1]
    assert completion_call.args[0] == "job-1"
    assert completion_call.kwargs["status"] == "completed"
    assert completion_call.kwargs["result_url"] == "https://cdn.example.com/permanent.jpg"
    assert completion_call.kwargs["file_size"] == 37
    mock_optimize_quantum_layout.assert_awaited_once_with(
        "Headline", "Sub", "CTA", ratio="1:1", num_variations=3
    )


@pytest.mark.asyncio
@patch("app.workers.design_generation._get_job_checkpoint", new_callable=AsyncMock)
@patch("app.workers.design_generation._update_job_status", new_callable=AsyncMock)
@patch("app.workers.design_generation.upload_image", new_callable=AsyncMock)
@patch("app.workers.design_generation.download_image", new_callable=AsyncMock)
@patch("app.workers.design_generation.generate_background", new_callable=AsyncMock)
@patch("app.services.quantum_service.optimize_quantum_layout", new_callable=AsyncMock)
@patch("app.workers.design_generation.parse_design_text", new_callable=AsyncMock)
async def test_execute_pipeline_reuses_parse_checkpoint(
    mock_parse_design_text,
    mock_optimize_quantum_layout,
    mock_generate_background,
    mock_download_image,
    mock_upload_image,
    mock_update_job_status,
    mock_get_job_checkpoint,
):
    mock_get_job_checkpoint.return_value = {
        "parsed_headline": "Saved Headline",
        "parsed_sub_headline": "Saved Sub",
        "parsed_cta": "Saved CTA",
        "visual_prompt": "saved visual prompt",
        "quantum_layout": "{}",
        "result_url": None,
    }
    mock_generate_background.return_value = {
        "image_url": "https://cdn.example.com/generated.jpg",
        "content_type": "image/jpeg",
    }
    mock_download_image.return_value = b"abc123"
    mock_upload_image.return_value = "https://cdn.example.com/permanent.jpg"

    await _execute_pipeline(
        job_id="job-2",
        raw_text="Buat desain",
        aspect_ratio="1:1",
        style="auto",
        reference_url=None,
        integrated_text=False,
    )

    mock_parse_design_text.assert_not_awaited()
    mock_optimize_quantum_layout.assert_not_awaited()
    # First call (var_idx=0) must still use the checkpoint prompt
    assert mock_generate_background.await_args_list[0].kwargs["visual_prompt"] == "saved visual prompt"


@patch("app.workers.design_generation._run_async")
@patch("app.workers.design_generation._execute_pipeline", new_callable=MagicMock)
def test_generate_design_task_passes_arguments_in_correct_order(
    mock_execute_pipeline,
    mock_run_async,
):
    mock_execute_pipeline.return_value = "coro"
    fake_task = SimpleNamespace(
        request=SimpleNamespace(retries=0),
        max_retries=3,
        retry=MagicMock(),
    )

    generate_design_task(
        fake_task,
        job_id="job-3",
        raw_text="Buat desain",
        aspect_ratio="1:1",
        style="auto",
        reference_url="https://example.com/ref.jpg",
        reference_focus="human",
        integrated_text=True,
    )

    call_args = mock_execute_pipeline.call_args.args
    assert call_args[5] is True
    assert call_args[6] == "human"
    mock_run_async.assert_called_once_with("coro")


@patch("app.workers.design_generation._run_async")
@patch("app.workers.design_generation._execute_pipeline", new_callable=MagicMock)
def test_generate_design_task_uses_retry_after_for_rate_limit(
    mock_execute_pipeline,
    mock_run_async,
):
    mock_execute_pipeline.return_value = "coro"
    rate_limit_error = LLMRateLimitError(
        model_id="openrouter/deepseek/deepseek-v4-flash",
        retry_after_seconds=39,
        message="Primary model rate-limited",
    )
    mock_run_async.side_effect = rate_limit_error
    fake_retry = MagicMock(side_effect=RuntimeError("retry called"))
    fake_task = SimpleNamespace(
        request=SimpleNamespace(retries=1),
        max_retries=3,
        retry=fake_retry,
    )

    with pytest.raises(RuntimeError, match="retry called"):
        generate_design_task(
            fake_task,
            job_id="job-4",
            raw_text="Buat desain",
            aspect_ratio="1:1",
            style="auto",
            integrated_text=False,
        )

    fake_retry.assert_called_once_with(exc=rate_limit_error, countdown=39)


@pytest.mark.asyncio
@patch("app.workers.design_generation._get_job_checkpoint", new_callable=AsyncMock)
@patch("app.workers.design_generation._update_job_status", new_callable=AsyncMock)
@patch("app.workers.design_generation.upload_image", new_callable=AsyncMock)
@patch("app.workers.design_generation.download_image", new_callable=AsyncMock)
@patch("app.workers.design_generation.generate_background", new_callable=AsyncMock)
@patch("app.services.quantum_service.optimize_quantum_layout", new_callable=AsyncMock)
@patch("app.workers.design_generation.parse_design_text", new_callable=AsyncMock)
async def test_execute_pipeline_honors_manual_copy_overrides(
    mock_parse_design_text,
    mock_optimize_quantum_layout,
    mock_generate_background,
    mock_download_image,
    mock_upload_image,
    mock_update_job_status,
    mock_get_job_checkpoint,
):
    mock_get_job_checkpoint.return_value = {}
    mock_parse_design_text.return_value = SimpleNamespace(
        headline="AI Headline",
        sub_headline="AI Sub",
        cta="AI CTA",
        visual_prompt="prompt final",
        visual_prompt_parts=None,
    )
    mock_optimize_quantum_layout.return_value = None
    mock_generate_background.return_value = {
        "image_url": "https://cdn.example.com/generated.jpg",
        "content_type": "image/jpeg",
    }
    mock_download_image.return_value = b"abc123"
    mock_upload_image.return_value = "https://cdn.example.com/permanent.jpg"

    await _execute_pipeline(
        job_id="job-override",
        raw_text="Buat desain",
        aspect_ratio="1:1",
        style="auto",
        reference_url=None,
        integrated_text=False,
        headline_override="HEADLINE MANUAL",
        sub_headline_override="SUB MANUAL",
        cta_override="CTA MANUAL",
    )

    assert mock_parse_design_text.await_args.kwargs["headline_override"] == "HEADLINE MANUAL"
    assert mock_parse_design_text.await_args.kwargs["sub_headline_override"] == "SUB MANUAL"
    assert mock_parse_design_text.await_args.kwargs["cta_override"] == "CTA MANUAL"
    assert any(
        call.kwargs.get("parsed_headline") == "HEADLINE MANUAL"
        and call.kwargs.get("parsed_sub_headline") == "SUB MANUAL"
        and call.kwargs.get("parsed_cta") == "CTA MANUAL"
        for call in mock_update_job_status.await_args_list
    )
    mock_optimize_quantum_layout.assert_awaited_once_with(
        "HEADLINE MANUAL", "SUB MANUAL", "CTA MANUAL", ratio="1:1", num_variations=3
    )


@pytest.mark.asyncio
@patch("app.api.designs_routers.generation.httpx.AsyncClient")
@patch("app.services.credit_service.log_credit_change", new_callable=AsyncMock)
@patch("app.services.storage_service.upload_image_tracked", new_callable=AsyncMock)
@patch("app.services.image_service.generate_background", new_callable=AsyncMock)
@patch("app.services.quantum_service.optimize_quantum_layout", new_callable=AsyncMock)
@patch("app.services.llm_service.parse_design_text", new_callable=AsyncMock)
async def test_generate_design_sync_passes_request_aspect_ratio_to_quantum_layout(
    mock_parse_design_text,
    mock_optimize_quantum_layout,
    mock_generate_background,
    mock_upload_image_tracked,
    mock_log_credit_change,
    mock_async_client,
):
    parsed = SimpleNamespace(
        headline="Headline",
        sub_headline="Sub",
        cta="CTA",
        visual_prompt="prompt final",
        visual_prompt_parts=None,
    )
    mock_parse_design_text.return_value = parsed
    mock_optimize_quantum_layout.return_value = (
        '{"variations": [[{"role": "headline", "x": 123, "y": 150}]], '
        '"image_prompt_modifier": "copy space left", '
        '"composition": {"set_num": 4, "ratio": "9:16", "copy_space_side": "top_bottom", "layout_name": "Center Drama", "validation_flags": []}, '
        '"selected_set": 4, '
        '"copy_space_side": "top_bottom"}'
    )
    mock_generate_background.return_value = {
        "image_url": "https://cdn.example.com/generated.jpg",
        "content_type": "image/jpeg",
    }
    mock_upload_image_tracked.return_value = "https://cdn.example.com/permanent.jpg"

    mock_response = MagicMock()
    mock_response.content = b"image-bytes"
    mock_response.raise_for_status = MagicMock()
    mock_http_client = mock_async_client.return_value.__aenter__.return_value
    mock_http_client.get = AsyncMock(return_value=mock_response)

    created_jobs = []

    def _capture_add(job):
        created_jobs.append(job)

    mock_db = MagicMock()
    mock_db.add.side_effect = _capture_add
    mock_db.flush = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    user = SimpleNamespace(
        id=uuid4(),
        credits_remaining=999,
        plan_tier="starter",
    )

    request = DesignGenerationRequest(
        raw_text="Promo spesial akhir pekan",
        aspect_ratio="9:16",
        style_preference="bold",
        integrated_text=False,
        headline_override="HEADLINE MANUAL",
        sub_headline_override="SUB MANUAL",
        cta_override="CTA MANUAL",
    )

    response = await generate_design(request=request, db=mock_db, current_user=user)

    assert response["status"] == "completed"
    assert created_jobs, "expected a Job instance to be added to the session"
    assert created_jobs[0].aspect_ratio == "9:16"
    assert created_jobs[0].parsed_headline == "HEADLINE MANUAL"
    assert created_jobs[0].parsed_sub_headline == "SUB MANUAL"
    assert created_jobs[0].parsed_cta == "CTA MANUAL"
    assert created_jobs[0].variation_results is not None
    assert '"set_num": 4' in created_jobs[0].variation_results
    assert '"ratio": "9:16"' in created_jobs[0].variation_results
    assert mock_parse_design_text.await_args.kwargs["headline_override"] == "HEADLINE MANUAL"
    assert mock_parse_design_text.await_args.kwargs["sub_headline_override"] == "SUB MANUAL"
    assert mock_parse_design_text.await_args.kwargs["cta_override"] == "CTA MANUAL"
    mock_log_credit_change.assert_awaited()
    mock_optimize_quantum_layout.assert_awaited_once_with(
        "HEADLINE MANUAL", "SUB MANUAL", "CTA MANUAL", ratio="9:16", num_variations=3
    )


@pytest.mark.asyncio
async def test_get_job_status_exposes_variation_results_when_completed():
    user_id = uuid4()
    job_id = uuid4()
    mock_job = SimpleNamespace(
        id=job_id,
        user_id=user_id,
        status="completed",
        created_at=None,
        result_url="https://cdn.example.com/generated.png",
        parsed_headline="Headline",
        parsed_sub_headline="Sub",
        parsed_cta="CTA",
        visual_prompt="prompt final",
        quantum_layout='{"variations": [[{"role": "headline", "x": 123, "y": 150}]], "image_prompt_modifier": "copy space left", "composition": {"set_num": 1, "ratio": "1:1", "copy_space_side": "left", "layout_name": "Panel Kiri", "validation_flags": []}, "selected_set": 1, "copy_space_side": "left"}',
        variation_results='[{"set_num": 1, "result_url": "https://cdn.example.com/generated.png", "composition": {"set_num": 1, "ratio": "1:1", "copy_space_side": "left", "layout_name": "Panel Kiri", "validation_flags": []}, "image_prompt_modifier": "copy space left", "layout_elements": [{"role": "headline", "x": 123, "y": 150}]}]',
        seed="seed-1",
        completed_at=None,
        error_message=None,
    )
    exec_result = MagicMock()
    exec_result.scalar_one_or_none.return_value = mock_job
    mock_db = AsyncMock()
    mock_db.execute.return_value = exec_result
    current_user = SimpleNamespace(id=user_id)

    response = await get_job_status(str(job_id), db=mock_db, current_user=current_user)

    assert response["status"] == "completed"
    assert response["variation_results"] == mock_job.variation_results
    assert response["quantum_layout"] == mock_job.quantum_layout
