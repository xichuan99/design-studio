from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ComparisonVariant(BaseModel):
    tier: str
    status: str
    estimated_cost: int
    result_url: Optional[str] = None
    error_message: Optional[str] = None


class ComparisonSessionCreateRequest(BaseModel):
    raw_text: str = Field(..., min_length=8, max_length=1500)
    aspect_ratio: str = Field("1:1", pattern="^(1:1|4:5|9:16|16:9)$")
    tiers: List[str] = Field(default_factory=lambda: ["basic", "pro", "ultra"], min_length=1)
    integrated_text: bool = False

    @field_validator("tiers")
    @classmethod
    def validate_tiers(cls, value: List[str]) -> List[str]:
        allowed = {"basic", "pro", "ultra"}
        normalized: List[str] = []
        for item in value:
            current = (item or "").strip().lower()
            if current in allowed and current not in normalized:
                normalized.append(current)
        if not normalized:
            raise ValueError("At least one valid comparison tier is required")
        return normalized


class ComparisonSessionResponse(BaseModel):
    id: str
    status: str
    share_slug: str
    raw_text: str
    aspect_ratio: str
    integrated_text: bool
    requested_tiers: List[str]
    variants: List[ComparisonVariant]
    charged_credits: int
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
