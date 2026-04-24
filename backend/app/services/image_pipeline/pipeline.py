"""Pipeline orchestrator for sequential image transformation stages."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any, Dict, List, Optional, Type

from app.schemas.image_pipeline import TransformationStageRequest
from app.services.image_pipeline.stages import (
    ApplyWatermarkStage,
    GenerateBackgroundStage,
    InpaintBackgroundStage,
    RemoveBackgroundStage,
    StageExecutionPayload,
    TransformationStage,
)

ProgressCallback = Callable[[Dict[str, Any]], Optional[Awaitable[None]]]


class ImageTransformationPipeline:
    """Sequentially executes configured transformation stages."""

    def __init__(
        self,
        stages: List[TransformationStage],
        progress_callback: Optional[ProgressCallback] = None,
    ) -> None:
        if not stages:
            raise ValueError("Pipeline requires at least one stage")

        self.stages = stages
        self.progress_callback = progress_callback

    async def run(self, payload: StageExecutionPayload) -> StageExecutionPayload:
        """Run all stages in sequence."""
        current_payload = payload
        total_stages = len(self.stages)

        for idx, stage in enumerate(self.stages):
            await self._emit_progress(
                {
                    "stage": stage.stage_type,
                    "stage_index": idx,
                    "total_stages": total_stages,
                    "status": "running",
                    "progress": int((idx / total_stages) * 100),
                }
            )

            current_payload = await stage.execute(current_payload)

            await self._emit_progress(
                {
                    "stage": stage.stage_type,
                    "stage_index": idx,
                    "total_stages": total_stages,
                    "status": "completed",
                    "progress": int(((idx + 1) / total_stages) * 100),
                }
            )

        return current_payload

    async def _emit_progress(self, event: Dict[str, Any]) -> None:
        if not self.progress_callback:
            return

        result = self.progress_callback(event)
        if isinstance(result, Awaitable):
            await result


def build_pipeline(
    stage_requests: List[TransformationStageRequest],
    progress_callback: Optional[ProgressCallback] = None,
) -> ImageTransformationPipeline:
    """Build pipeline instance from API stage request objects."""
    stage_registry: Dict[str, Type[TransformationStage]] = {
        "remove_bg": RemoveBackgroundStage,
        "inpaint_bg": InpaintBackgroundStage,
        "generate_bg": GenerateBackgroundStage,
        "watermark": ApplyWatermarkStage,
    }

    stages: List[TransformationStage] = []
    for stage_request in stage_requests:
        stage_cls = stage_registry.get(stage_request.type.value)
        if stage_cls is None:
            raise ValueError(f"Unsupported stage type: {stage_request.type.value}")
        stages.append(stage_cls(params=stage_request.params))

    return ImageTransformationPipeline(stages=stages, progress_callback=progress_callback)
