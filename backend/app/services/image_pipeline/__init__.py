"""Composable image transformation pipeline services."""

from app.services.image_pipeline.pipeline import (
    ImageTransformationPipeline,
    build_pipeline,
)
from app.services.image_pipeline.stages import (
    ApplyWatermarkStage,
    GenerateBackgroundStage,
    InpaintBackgroundStage,
    RemoveBackgroundStage,
    StageExecutionPayload,
    TransformationStage,
)

__all__ = [
    "ApplyWatermarkStage",
    "GenerateBackgroundStage",
    "ImageTransformationPipeline",
    "InpaintBackgroundStage",
    "RemoveBackgroundStage",
    "StageExecutionPayload",
    "TransformationStage",
    "build_pipeline",
]
