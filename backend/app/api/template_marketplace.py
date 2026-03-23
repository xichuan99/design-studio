from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy import desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.models.project import Project
from app.models.template_submission import TemplateSubmission
from app.models.user import User
from app.schemas.error import ERROR_RESPONSES
from app.schemas.template_marketplace import (
    CommunityTemplateListItem,
    TemplateSubmissionCreate,
    TemplateSubmissionResponse,
)

router = APIRouter(tags=["Template Marketplace"])


@router.post(
    "/template-submissions/",
    response_model=TemplateSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Template Submission",
    description="Create a community template submission from one of the current user's projects.",
    responses=ERROR_RESPONSES,
)
async def create_template_submission(
    payload: TemplateSubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project_result = await db.execute(
        select(Project).where(
            Project.id == payload.source_project_id,
            Project.user_id == current_user.id,
        )
    )
    project = project_result.scalar_one_or_none()

    if not project:
        raise NotFoundError(detail="Source project not found")

    canvas_state = project.canvas_state or {}
    elements = canvas_state.get("elements", [])
    default_text_layers = [el for el in elements if el.get("type") == "text"]

    submission = TemplateSubmission(
        owner_user_id=current_user.id,
        source_project_id=project.id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        industry=payload.industry,
        aspect_ratio=project.aspect_ratio,
        status="submitted",
        preview_canvas_state=canvas_state,
        default_text_layers=default_text_layers,
        thumbnail_url=payload.thumbnail_url,
        prompt_suffix=payload.prompt_suffix,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission


@router.get(
    "/template-submissions/mine",
    response_model=List[TemplateSubmissionResponse],
    status_code=status.HTTP_200_OK,
    summary="List My Template Submissions",
    description="List template submissions created by the current user.",
    responses=ERROR_RESPONSES,
)
async def list_my_template_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TemplateSubmission)
        .where(TemplateSubmission.owner_user_id == current_user.id)
        .order_by(desc(TemplateSubmission.updated_at))
    )
    return result.scalars().all()


@router.get(
    "/community-templates/",
    response_model=List[CommunityTemplateListItem],
    status_code=status.HTTP_200_OK,
    summary="List Published Community Templates",
    description="List approved/published community templates.",
    responses=ERROR_RESPONSES,
)
async def list_community_templates(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(TemplateSubmission).where(TemplateSubmission.status == "published")
    if category:
        query = query.where(TemplateSubmission.category == category)

    query = query.order_by(
        desc(TemplateSubmission.is_featured), desc(TemplateSubmission.published_at)
    )
    result = await db.execute(query)
    return result.scalars().all()
