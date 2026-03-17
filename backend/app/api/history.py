from app.schemas.error import ERROR_RESPONSES

"""Design History API: list and create history snapshots for a project."""

from typing import Optional, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from app.core.database import get_db
from app.models.design_history import DesignHistory
from app.api.deps import get_current_user
from app.models.user import User
from pydantic import BaseModel, Field, ConfigDict

router = APIRouter(tags=["History"])


class DesignHistoryCreate(BaseModel):
    project_id: str = Field(..., description="Project ID")
    background_url: str = Field(..., description="URL of the background image")
    text_layers: list = Field(..., description="List of text layers")
    generation_params: Optional[dict] = Field(
        None, description="Parameters used to generate the design"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "project_id": "123e4567-e89b-12d3-a456-426614174000",
                "background_url": "https://example.com/bg.png",
                "text_layers": [],
            }
        }
    )


class DesignHistoryResponse(BaseModel):
    id: str = Field(..., description="History snapshot ID")
    project_id: str = Field(..., description="Project ID")
    background_url: str = Field(..., description="URL of the background image")
    text_layers: list = Field(..., description="List of text layers")
    generation_params: Optional[dict] = Field(
        None, description="Parameters used to generate the design"
    )
    created_at: Optional[str] = Field(None, description="Creation timestamp")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "223e4567-e89b-12d3-a456-426614174000",
                "project_id": "123e4567-e89b-12d3-a456-426614174000",
                "background_url": "https://example.com/bg.png",
                "text_layers": [],
                "created_at": "2024-03-15T12:00:00Z",
            }
        }
    )


@router.get(
    "/{project_id}",
    response_model=List[DesignHistoryResponse],
    status_code=status.HTTP_200_OK,
    summary="List Project History",
    description="List all design history snapshots for a specific project, ordered newest first.",
    responses=ERROR_RESPONSES,
)
async def list_history(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all design history entries for a project, newest first."""
    result = await db.execute(
        select(DesignHistory)
        .where(DesignHistory.project_id == project_id)
        .order_by(desc(DesignHistory.created_at))
    )
    entries = result.scalars().all()

    return [
        {
            "id": str(e.id),
            "project_id": str(e.project_id),
            "background_url": e.background_url,
            "text_layers": e.text_layers,
            "generation_params": e.generation_params,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]


@router.post(
    "/",
    response_model=DesignHistoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create History Snapshot",
    description="Save a design history snapshot for a project.",
    responses=ERROR_RESPONSES,
)
async def create_history(
    data: DesignHistoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save a design history snapshot for a project."""
    entry = DesignHistory(
        project_id=data.project_id,
        background_url=data.background_url,
        text_layers=data.text_layers,
        generation_params=data.generation_params,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    return {
        "id": str(entry.id),
        "project_id": str(entry.project_id),
        "background_url": entry.background_url,
        "text_layers": entry.text_layers,
        "generation_params": entry.generation_params,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    }
