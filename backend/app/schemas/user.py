from pydantic import BaseModel, ConfigDict, field_validator, Field
from typing import Optional
import uuid
from datetime import datetime


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Full name of the user to be updated", json_schema_extra={"example": "Siti Rahma"})

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

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Siti Rahma"
            }
        }
    )


class UserResponse(BaseModel):
    id: uuid.UUID = Field(..., description="Unique user identifier", json_schema_extra={"example": "123e4567-e89b-12d3-a456-426614174000"})
    email: str = Field(..., description="User's email address", json_schema_extra={"example": "siti@example.com"})
    name: str = Field(..., description="User's full name", json_schema_extra={"example": "Siti Rahma"})
    avatar_url: Optional[str] = Field(None, description="URL to user's avatar image", json_schema_extra={"example": "https://example.com/avatar.jpg"})
    credits_remaining: int = Field(..., description="Current available credits", json_schema_extra={"example": 25})
    storage_used: int = Field(0, description="Storage used by the user in bytes", json_schema_extra={"example": 102400})
    storage_quota: int = Field(104857600, description="Maximum storage quota in bytes", json_schema_extra={"example": 104857600})
    provider: str = Field(..., description="Authentication provider", json_schema_extra={"example": "credentials"})
    created_at: datetime = Field(..., description="Account creation timestamp", json_schema_extra={"example": "2024-03-15T12:00:00Z"})

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "siti@example.com",
                "name": "Siti Rahma",
                "avatar_url": "https://example.com/avatar.jpg",
                "credits_remaining": 25,
                "storage_used": 102400,
                "storage_quota": 104857600,
                "provider": "credentials",
                "created_at": "2024-03-15T12:00:00Z"
            }
        }
    )
