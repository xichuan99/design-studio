from datetime import datetime
from typing import List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TestimonialCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    role: str = Field(..., min_length=2, max_length=120)
    quote: str = Field(..., min_length=12, max_length=600)

    @field_validator("name", "role", "quote")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()


class TestimonialResponseItem(BaseModel):
    id: UUID
    name: str
    role: str
    quote: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicTestimonialItem(BaseModel):
    id: UUID
    name: str
    role: str
    quote: str

    model_config = ConfigDict(from_attributes=True)


class TestimonialListResponse(BaseModel):
    items: List[PublicTestimonialItem]


class TestimonialSubmitResponse(BaseModel):
    item: TestimonialResponseItem
    is_update: bool = False
    message: str
