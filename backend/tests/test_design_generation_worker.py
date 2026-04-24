from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.workers.design_generation import _execute_pipeline


@pytest.mark.asyncio
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
):
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
    assert completion_call.kwargs["file_size"] == 6
