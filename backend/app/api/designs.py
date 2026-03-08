"""Updated designs API with generate and job status endpoints."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.schemas.design import DesignGenerationRequest, ParsedTextElements
from app.services.llm_service import parse_design_text
from app.models.job import Job
from app.api.deps import get_current_user
from app.api.rate_limit import rate_limit_dependency
from app.models.user import User

router = APIRouter()


@router.post("/upload")
async def upload_user_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Uploads a user image (for canvas or reference) and returns the public URL."""
    from app.services.storage_service import upload_image

    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")

    content = await file.read()
    try:
        url = await upload_image(
            image_bytes=content, 
            content_type=file.content_type, 
            prefix=f"uploads/{current_user.id}"
        )
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


@router.post("/parse", response_model=ParsedTextElements)
async def parse_design(request: DesignGenerationRequest):
    """
    Step 1 of the generator flow: Parse text into structured design elements (no image generation).
    """
    try:
        parsed_elements = await parse_design_text(request.raw_text)
        return parsed_elements
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse text: {str(e)}")


@router.post("/generate")
async def generate_design(
    request: DesignGenerationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_dependency),
):
    """
    Full generation flow: Creates a job, dispatches to Celery worker.
    Returns the job_id immediately for polling.
    """
    from app.workers.tasks import generate_design_task

    if current_user.credits_remaining <= 0:
        raise HTTPException(
            status_code=402, 
            detail="Insufficient credits. Please upgrade or wait for a refill."
        )

    # Deduct credit
    current_user.credits_remaining -= 1

    # Create a job record in the database
    job = Job(
        raw_text=request.raw_text,
        aspect_ratio=request.aspect_ratio,
        style_preference=request.style_preference,
        reference_image_url=getattr(request, "reference_image_url", None),
        user_id=current_user.id,
        status="queued",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Dispatch Celery task
    generate_design_task.delay(
        job_id=str(job.id),
        raw_text=request.raw_text,
        aspect_ratio=request.aspect_ratio,
        style=request.style_preference,
        reference_url=getattr(request, "reference_image_url", None),
    )

    return {
        "job_id": str(job.id),
        "status": "queued",
        "message": "Design generation started. Poll /api/jobs/{job_id} for status.",
    }


@router.get("/jobs/{job_id}")
async def get_job_status(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Poll job status. Returns result URL when completed."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    response = {
        "job_id": str(job.id),
        "status": job.status,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }

    if job.status == "completed":
        response.update({
            "result_url": job.result_url,
            "headline": job.parsed_headline,
            "sub_headline": job.parsed_sub_headline,
            "cta": job.parsed_cta,
            "visual_prompt": job.visual_prompt,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        })
    elif job.status == "failed":
        response["error_message"] = job.error_message

    return response
