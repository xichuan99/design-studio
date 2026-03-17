from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
import uuid


class RegisterRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Full name of the user",
        json_schema_extra={"example": "Budi Santoso"},
    )
    email: EmailStr = Field(
        ...,
        description="User's email address",
        json_schema_extra={"example": "budi@example.com"},
    )
    password: str = Field(
        ...,
        min_length=8,
        description="Password must be at least 8 characters long",
        json_schema_extra={"example": "securePassword123!"},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Budi Santoso",
                "email": "budi@example.com",
                "password": "securePassword123!",
            }
        }
    )


class LoginRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="User's registered email address",
        json_schema_extra={"example": "budi@example.com"},
    )
    password: str = Field(
        ...,
        description="User's password",
        json_schema_extra={"example": "securePassword123!"},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"email": "budi@example.com", "password": "securePassword123!"}
        }
    )


class AuthResponse(BaseModel):
    id: uuid.UUID = Field(
        ...,
        description="Unique user identifier",
        json_schema_extra={"example": "123e4567-e89b-12d3-a456-426614174000"},
    )
    email: str = Field(
        ...,
        description="User's email address",
        json_schema_extra={"example": "budi@example.com"},
    )
    name: str = Field(
        ...,
        description="User's full name",
        json_schema_extra={"example": "Budi Santoso"},
    )
    avatar_url: Optional[str] = Field(
        None,
        description="URL of user's avatar image",
        json_schema_extra={"example": "https://example.com/avatar.jpg"},
    )
    credits_remaining: int = Field(
        ...,
        description="Remaining generation credits",
        json_schema_extra={"example": 10},
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "budi@example.com",
                "name": "Budi Santoso",
                "avatar_url": "https://example.com/avatar.jpg",
                "credits_remaining": 10,
            }
        },
    )
