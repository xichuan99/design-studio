from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
import uuid
from datetime import datetime


class UserUpdate(BaseModel):
    name: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if len(v) == 0:
            raise ValueError("Name cannot be empty or whitespace only")
        if len(v) > 100:
            raise ValueError("Name must be 100 characters or fewer")
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    avatar_url: Optional[str]
    credits_remaining: int
    storage_used: int = 0
    storage_quota: int = 104857600
    provider: str
    created_at: datetime
