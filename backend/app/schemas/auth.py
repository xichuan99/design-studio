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
    invite_code: Optional[str] = Field(
        None,
        description="Optional beta invite code (if beta gating is enabled)",
        json_schema_extra={"example": "BETA2026WAVE1"},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Budi Santoso",
                "email": "budi@example.com",
                "password": "securePassword123!",
                "invite_code": "BETA2026WAVE1",
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
    plan_tier: str = Field(
        "starter",
        description="Current plan tier for entitlement",
        json_schema_extra={"example": "starter"},
    )
    access_token: Optional[str] = Field(
        None,
        description="JWT access token",
        json_schema_extra={"example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."},
    )
    refresh_token: Optional[str] = Field(
        None,
        description="JWT refresh token",
        json_schema_extra={"example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."},
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
                "plan_tier": "starter",
                "access_token": "eyJhbG...",
                "refresh_token": "eyJhbG...",
            }
        },
    )

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="The refresh token to use for issuing a new access token")

class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="User's registered email address")

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="The reset token received via email")
    new_password: str = Field(..., min_length=8, description="The new password")
