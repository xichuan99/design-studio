"""Design History API: list and create history snapshots for a project."""

from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from app.core.database import get_db
from app.models.design_history import DesignHistory
from app.api.deps import get_current_user
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()


class DesignHistoryCreate(BaseModel):
    project_id: str
    background_url: str
    text_layers: list
    generation_params: Optional[dict] = None


@router.get("/{project_id}")
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


@router.post("/")
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
