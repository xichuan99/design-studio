from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from uuid import UUID


class CanvasElementSchema(BaseModel):
    id: str = Field(..., description="Element ID", example="elem_1")
    type: str = Field(..., description="Element type ('text', 'image', etc.)", example="text")
    x: float = Field(..., description="X coordinate", example=10.5)
    y: float = Field(..., description="Y coordinate", example=20.5)
    width: Optional[float] = Field(None, description="Width of the element", example=100.0)
    height: Optional[float] = Field(None, description="Height of the element", example=50.0)
    rotation: Optional[float] = Field(0, description="Rotation in degrees", example=45.0)
    text: Optional[str] = Field(None, description="Text content", example="Hello World")
    fontFamily: Optional[str] = Field(None, description="Font family", example="Inter")
    fontSize: Optional[int] = Field(None, description="Font size", example=14)
    fill: Optional[str] = Field(None, description="Fill color", example="#000000")
    align: Optional[str] = Field(None, description="Text alignment", example="center")

    model_config = ConfigDict(
        extra="allow",
        json_schema_extra={
            "example": {
                "id": "elem_1",
                "type": "text",
                "x": 10.5,
                "y": 20.5,
                "text": "Hello World",
                "fontFamily": "Inter",
                "fontSize": 14,
                "fill": "#000000",
                "align": "center"
            }
        }
    )


class ProjectCanvasState(BaseModel):
    elements: List[Dict[str, Any]] = Field(..., description="List of canvas elements")
    backgroundUrl: Optional[str] = Field(None, description="Background image URL", example="https://example.com/bg.png")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "elements": [
                    {
                        "id": "elem_1",
                        "type": "text",
                        "x": 10.5,
                        "y": 20.5,
                        "text": "Hello World"
                    }
                ],
                "backgroundUrl": "https://example.com/bg.png"
            }
        }
    )


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Project title", example="Promo Ramadhan")
    canvas_state: Optional[Dict[str, Any]] = Field(None, description="State of the project canvas")
    status: Optional[str] = Field(None, description="Project status", example="active")
    aspect_ratio: Optional[str] = Field(None, description="Aspect ratio of the project", example="1:1")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Promo Ramadhan",
                "status": "active",
                "aspect_ratio": "1:1"
            }
        }
    )


class ProjectResponse(BaseModel):
    id: UUID = Field(..., description="Unique project ID", example="123e4567-e89b-12d3-a456-426614174000")
    user_id: UUID = Field(..., description="ID of the user who owns the project", example="123e4567-e89b-12d3-a456-426614174001")
    title: str = Field(..., description="Project title", example="Promo Ramadhan")
    status: str = Field(..., description="Project status", example="active")
    aspect_ratio: str = Field(..., description="Aspect ratio of the project", example="1:1")
    canvas_state: Optional[Dict[str, Any]] = Field(None, description="State of the project canvas")
    created_at: datetime = Field(..., description="Creation timestamp", example="2024-03-15T12:00:00Z")
    updated_at: datetime = Field(..., description="Last update timestamp", example="2024-03-15T12:00:00Z")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "title": "Promo Ramadhan",
                "status": "active",
                "aspect_ratio": "1:1",
                "created_at": "2024-03-15T12:00:00Z",
                "updated_at": "2024-03-15T12:00:00Z"
            }
        }
    )
