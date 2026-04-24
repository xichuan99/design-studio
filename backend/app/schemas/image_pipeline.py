"""Schemas for composable image transformation pipeline requests."""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class StageType(str, Enum):
    """Supported pipeline stage types."""

    REMOVE_BG = "remove_bg"
    INPAINT_BG = "inpaint_bg"
    GENERATE_BG = "generate_bg"
    WATERMARK = "watermark"


class TransformationStageRequest(BaseModel):
    """A single stage configuration sent from API/UI."""

    type: StageType = Field(..., description="Stage type to execute")
    params: Dict[str, Any] = Field(
        default_factory=dict,
        description="Stage-specific configuration payload",
    )


class PipelineExecutionRequest(BaseModel):
    """API payload for executing a stage-based image pipeline."""

    image_url: Optional[str] = Field(
        default=None,
        description="Input source image URL. Optional if image bytes are handled separately.",
    )
    stages: List[TransformationStageRequest] = Field(
        ..., min_length=1, description="Ordered list of stages to execute"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional contextual metadata for orchestration",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "image_url": "https://example.com/product.jpg",
                "stages": [
                    {"type": "remove_bg", "params": {"quality": "standard"}}
                ],
            }
        }
    )
