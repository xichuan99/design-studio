from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime
from uuid import UUID


class CanvasElementSchema(BaseModel):
    id: str
    type: str  # 'text', 'image', etc.
    x: float
    y: float
    width: Optional[float] = None
    height: Optional[float] = None
    rotation: Optional[float] = 0
    text: Optional[str] = None
    fontFamily: Optional[str] = None
    fontSize: Optional[int] = None
    fill: Optional[str] = None
    align: Optional[str] = None
    # Add other flexible properties using extra fields if necessary
    model_config = {"extra": "allow"}


class ProjectCanvasState(BaseModel):
    elements: List[Dict[str, Any]]
    backgroundUrl: Optional[str] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    canvas_state: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    aspect_ratio: Optional[str] = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    title: str
    status: str
    aspect_ratio: str
    canvas_state: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
