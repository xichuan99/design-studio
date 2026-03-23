from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TemplateSubmissionCreate(BaseModel):
    source_project_id: UUID = Field(..., description="Project ID used as template source")
    title: str = Field(..., min_length=3, max_length=120)
    description: Optional[str] = Field(None, max_length=2000)
    category: str = Field(..., min_length=2, max_length=80)
    industry: Optional[str] = Field(None, max_length=80)
    thumbnail_url: Optional[str] = None
    prompt_suffix: Optional[str] = None


class TemplateSubmissionResponse(BaseModel):
    id: UUID
    owner_user_id: UUID
    source_project_id: Optional[UUID]
    title: str
    description: Optional[str]
    category: str
    industry: Optional[str]
    aspect_ratio: str
    status: str
    preview_canvas_state: dict[str, Any]
    default_text_layers: list[Any]
    thumbnail_url: Optional[str]
    prompt_suffix: Optional[str]
    is_featured: bool
    submitted_at: Optional[datetime]
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommunityTemplateListItem(BaseModel):
    id: UUID
    title: str
    category: str
    industry: Optional[str]
    aspect_ratio: str
    thumbnail_url: Optional[str]
    is_featured: bool
    published_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
