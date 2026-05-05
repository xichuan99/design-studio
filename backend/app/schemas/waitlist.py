from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class WaitlistJoinRequest(BaseModel):
    email: EmailStr = Field(..., description="Email address to join the waitlist")
    name: Optional[str] = Field(None, description="Optional name for personalization")
    source: str = Field(
        "landing",
        description="Acquisition source marker (landing, popup, campaign, etc.)",
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            return None
        return cleaned[:100]

    @field_validator("source")
    @classmethod
    def validate_source(cls, value: str) -> str:
        cleaned = (value or "landing").strip().lower()
        if not cleaned:
            return "landing"
        return cleaned[:64]


class WaitlistJoinResponse(BaseModel):
    id: str
    email: EmailStr
    position: int
    is_new: bool
    delivery_status: str
    lead_magnet_delivered: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WaitlistCountResponse(BaseModel):
    total: int
