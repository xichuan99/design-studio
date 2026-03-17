from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from uuid import UUID


class CanvasElementSchema(BaseModel):
    id: str = Field(
        ..., description="Element ID", json_schema_extra={"example": "elem_1"}
    )
    type: str = Field(
        ...,
        description="Element type ('text', 'image', etc.)",
        json_schema_extra={"example": "text"},
    )
    x: float = Field(
        ..., description="X coordinate", json_schema_extra={"example": 10.5}
    )
    y: float = Field(
        ..., description="Y coordinate", json_schema_extra={"example": 20.5}
    )
    width: Optional[float] = Field(
        None, description="Width of the element", json_schema_extra={"example": 100.0}
    )
    height: Optional[float] = Field(
        None, description="Height of the element", json_schema_extra={"example": 50.0}
    )
    rotation: Optional[float] = Field(
        0, description="Rotation in degrees", json_schema_extra={"example": 45.0}
    )
    text: Optional[str] = Field(
        None, description="Text content", json_schema_extra={"example": "Hello World"}
    )
    fontFamily: Optional[str] = Field(
        None, description="Font family", json_schema_extra={"example": "Inter"}
    )
    fontSize: Optional[int] = Field(
        None, description="Font size", json_schema_extra={"example": 14}
    )
    fill: Optional[str] = Field(
        None, description="Fill color", json_schema_extra={"example": "#000000"}
    )
    align: Optional[str] = Field(
        None, description="Text alignment", json_schema_extra={"example": "center"}
    )

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
                "align": "center",
            }
        },
    )


class ProjectCanvasState(BaseModel):
    elements: List[Dict[str, Any]] = Field(..., description="List of canvas elements")
    backgroundUrl: Optional[str] = Field(
        None,
        description="Background image URL",
        json_schema_extra={"example": "https://example.com/bg.png"},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "elements": [
                    {
                        "id": "elem_1",
                        "type": "text",
                        "x": 10.5,
                        "y": 20.5,
                        "text": "Hello World",
                    }
                ],
                "backgroundUrl": "https://example.com/bg.png",
            }
        }
    )


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(
        None,
        description="Project title",
        json_schema_extra={"example": "Promo Ramadhan"},
    )
    canvas_state: Optional[Dict[str, Any]] = Field(
        None, description="State of the project canvas"
    )
    status: Optional[str] = Field(
        None, description="Project status", json_schema_extra={"example": "active"}
    )
    aspect_ratio: Optional[str] = Field(
        None,
        description="Aspect ratio of the project",
        json_schema_extra={"example": "1:1"},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Promo Ramadhan",
                "status": "active",
                "aspect_ratio": "1:1",
            }
        }
    )


class ProjectResponse(BaseModel):
    id: UUID = Field(
        ...,
        description="Unique project ID",
        json_schema_extra={"example": "123e4567-e89b-12d3-a456-426614174000"},
    )
    user_id: UUID = Field(
        ...,
        description="ID of the user who owns the project",
        json_schema_extra={"example": "123e4567-e89b-12d3-a456-426614174001"},
    )
    title: str = Field(
        ...,
        description="Project title",
        json_schema_extra={"example": "Promo Ramadhan"},
    )
    status: str = Field(
        ..., description="Project status", json_schema_extra={"example": "active"}
    )
    aspect_ratio: str = Field(
        ...,
        description="Aspect ratio of the project",
        json_schema_extra={"example": "1:1"},
    )
    canvas_state: Optional[Dict[str, Any]] = Field(
        None, description="State of the project canvas"
    )
    created_at: datetime = Field(
        ...,
        description="Creation timestamp",
        json_schema_extra={"example": "2024-03-15T12:00:00Z"},
    )
    updated_at: datetime = Field(
        ...,
        description="Last update timestamp",
        json_schema_extra={"example": "2024-03-15T12:00:00Z"},
    )

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
                "updated_at": "2024-03-15T12:00:00Z",
            }
        },
    )
