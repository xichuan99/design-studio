from app.core.exceptions import NotFoundError, ValidationError
from app.schemas.error import ERROR_RESPONSES
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from app.core.database import get_db
from app.models.job import Job
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(tags=["Designs - Jobs"])


@router.get(
    "/my-generations",
    response_model=list,
    status_code=status.HTTP_200_OK,
    summary="Get My Generations",
    description="Fetch completed AI design generations for the current user.",
    responses=ERROR_RESPONSES,
)
async def get_my_generations(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch completed AI design generations for the current user."""
    result = await db.execute(
        select(Job)
        .where(
            Job.user_id == current_user.id,
            Job.status == "completed",
            Job.result_url.isnot(None),
        )
        .order_by(desc(Job.created_at))
        .offset(offset)
        .limit(limit)
    )
    jobs = result.scalars().all()

    return [
        {
            "id": str(job.id),
            "project_id": str(job.project_id) if job.project_id else None,
            "result_url": job.result_url,
            "visual_prompt": job.visual_prompt,
            "raw_text": job.raw_text,
            "created_at": job.created_at.isoformat() if job.created_at else None,
        }
        for job in jobs
    ]


@router.get(
    "/jobs/{job_id}",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Get Job Status",
    description="Poll job status. Returns result URL when completed.",
    responses=ERROR_RESPONSES,
)
async def get_job_status(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Poll job status. Returns result URL when completed."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()

    if not job:
        raise NotFoundError(detail="Job not found")

    response = {
        "job_id": str(job.id),
        "status": job.status,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }

    if job.status == "completed":
        response.update(
            {
                "result_url": job.result_url,
                "headline": job.parsed_headline,
                "sub_headline": job.parsed_sub_headline,
                "cta": job.parsed_cta,
                "visual_prompt": job.visual_prompt,
                "quantum_layout": job.quantum_layout,
                "completed_at": job.completed_at.isoformat()
                if job.completed_at
                else None,
            }
        )
    elif job.status == "failed":
        response["error_message"] = job.error_message

    return response


@router.delete(
    "/jobs/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Job",
    description="Delete a generation job and reclaim storage quota.",
    responses=ERROR_RESPONSES,
)
async def delete_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a generation job and reclaim storage quota."""
    try:
        import uuid

        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise ValidationError(detail="Invalid job ID format")

    result = await db.execute(
        select(Job).where(Job.id == job_uuid, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()

    if not job:
        raise NotFoundError(detail="Job not found")

    if job.result_url:
        from app.services.storage_quota_service import (
            estimate_file_size,
            decrement_usage,
        )

        size = await estimate_file_size(job.result_url)
        if size > 0:
            await decrement_usage(current_user.id, size, db)

    await db.delete(job)
    await db.commit()
