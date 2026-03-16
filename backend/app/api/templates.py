from app.core.exceptions import NotFoundError
from app.schemas.error import ERROR_RESPONSES
"""Templates API: list and retrieve design templates."""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.template import Template

router = APIRouter(tags=["Templates"])


@router.get(
    "/",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="List Templates",
    description="List all available templates. Optionally filter by category or aspect ratio.",
    responses=ERROR_RESPONSES,
)
async def list_templates(
    category: Optional[str] = None,
    aspect_ratio: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all templates, optionally filtered by category or aspect_ratio."""
    query = select(Template)

    if category:
        query = query.where(Template.category == category)
    if aspect_ratio:
        query = query.where(Template.aspect_ratio == aspect_ratio)

    result = await db.execute(query)
    templates = result.scalars().all()

    return [
        {
            "id": str(t.id),
            "name": t.name,
            "category": t.category,
            "aspect_ratio": t.aspect_ratio,
            "style": t.style,
            "default_text_layers": t.default_text_layers,
            "prompt_suffix": t.prompt_suffix,
            "thumbnail_url": t.thumbnail_url,
        }
        for t in templates
    ]


@router.get(
    "/{template_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get Template",
    description="Retrieve a single template by its unique ID.",
    responses=ERROR_RESPONSES,
)
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a single template by ID."""
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()

    if not template:
        raise NotFoundError(detail="Template not found")

    return {
        "id": str(template.id),
        "name": template.name,
        "category": template.category,
        "aspect_ratio": template.aspect_ratio,
        "style": template.style,
        "default_text_layers": template.default_text_layers,
        "prompt_suffix": template.prompt_suffix,
        "thumbnail_url": template.thumbnail_url,
    }
