"""Schemas for backend-owned analytics events."""

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class FunnelAnalyticsEventName(str, Enum):
    landing_viewed = "landing_viewed"
    signup_completed = "signup_completed"


class FunnelAnalyticsEventCreate(BaseModel):
    visitor_id: str = Field(..., min_length=6, max_length=255)
    event_name: FunnelAnalyticsEventName
    variant: Optional[str] = Field(default=None, max_length=64)
    auth_method: Optional[str] = Field(default=None, max_length=32)
    source: Optional[str] = Field(default=None, max_length=64)
    properties: dict[str, Any] = Field(default_factory=dict)
