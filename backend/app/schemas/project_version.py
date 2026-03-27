from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class ProjectVersionCreate(BaseModel):
    version_name: Optional[str] = Field(
        "Auto Save",
        description="Name of the version snapshot",
        json_schema_extra={"example": "Initial Version"},
    )
    canvas_state: Optional[Dict[str, Any]] = Field(
        None, description="State of the project canvas at this version"
    )
    canvas_schema_version: Optional[int] = Field(
        1,
        description="Version of the persisted canvas schema",
        json_schema_extra={"example": 1},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "version_name": "V1 - Before Client Feedback",
                "canvas_schema_version": 1,
            }
        }
    )


class ProjectVersionResponse(BaseModel):
    id: UUID = Field(
        ...,
        description="Unique project version ID",
        json_schema_extra={"example": "123e4567-e89b-12d3-a456-426614174000"},
    )
    project_id: UUID = Field(
        ...,
        description="ID of the project this version belongs to",
        json_schema_extra={"example": "123e4567-e89b-12d3-a456-426614174001"},
    )
    user_id: UUID = Field(
        ...,
        description="ID of the user who created the version",
        json_schema_extra={"example": "123e4567-e89b-12d3-a456-426614174002"},
    )
    version_name: str = Field(
        ...,
        description="Name of the version snapshot",
        json_schema_extra={"example": "V1"},
    )
    canvas_state: Optional[Dict[str, Any]] = Field(
        None, description="State of the project canvas at this version"
    )
    canvas_schema_version: int = Field(
        1,
        description="Version of the persisted canvas schema",
        json_schema_extra={"example": 1},
    )
    created_at: datetime = Field(
        ...,
        description="Creation timestamp",
        json_schema_extra={"example": "2024-03-15T12:00:00Z"},
    )

    model_config = ConfigDict(
        from_attributes=True,
    )
