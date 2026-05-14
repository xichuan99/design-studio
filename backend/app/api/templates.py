from app.core.exceptions import NotFoundError
from app.schemas.error import ERROR_RESPONSES

"""Templates API: list and retrieve design templates."""

from typing import Optional, List, Dict, Any
import json
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.redis import redis_client
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
    platform: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"templates:list:{category or 'all'}:{aspect_ratio or 'all'}:{platform or 'all'}"
    if redis_client:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)

    query = select(Template)

    if category:
        query = query.where(Template.category == category)
    if aspect_ratio:
        query = query.where(Template.aspect_ratio == aspect_ratio)
    if platform:
        query = query.where(Template.platform == platform)

    result = await db.execute(query)
    templates = result.scalars().all()

    response_data = [
        {
            "id": str(t.id),
            "name": t.name,
            "category": t.category,
            "aspect_ratio": t.aspect_ratio,
            "style": t.style,
            "default_text_layers": t.default_text_layers,
            "prompt_suffix": t.prompt_suffix,
            "thumbnail_url": t.thumbnail_url,
            "platform": t.platform,
        }
        for t in templates
    ]

    if redis_client:
        await redis_client.setex(cache_key, 3600, json.dumps(response_data))

    return response_data


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
    cache_key = f"templates:detail:{template_id}"
    if redis_client:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)

    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()

    if not template:
        raise NotFoundError(detail="Template not found")

    response_data = {
        "id": str(template.id),
        "name": template.name,
        "category": template.category,
        "aspect_ratio": template.aspect_ratio,
        "style": template.style,
        "default_text_layers": template.default_text_layers,
        "prompt_suffix": template.prompt_suffix,
        "thumbnail_url": template.thumbnail_url,
        "platform": template.platform,
    }

    if redis_client:
        await redis_client.setex(cache_key, 3600, json.dumps(response_data))

    return response_data
