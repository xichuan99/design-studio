from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
import uuid


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(
        ..., min_length=8, description="Password must be at least 8 characters long"
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    credits_remaining: int
