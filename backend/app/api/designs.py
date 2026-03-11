"""Updated designs API with generate and job status endpoints."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from app.core.database import get_db
from app.schemas.design import DesignGenerationRequest, ParsedTextElements, ModifyPromptRequest
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
        import logging
        logging.exception("Upload endpoint failed")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


@router.post("/parse", response_model=ParsedTextElements)
async def parse_text(request: DesignGenerationRequest) -> ParsedTextElements:
    """Preview functionality: parse text into structured elements without generating the image."""
    try:
        # Use simple caching (or direct pass-through) to not over-query the LLM
        # For this prototype we'll just call the LLM directly
        parsed = await parse_design_text(
            raw_text=request.raw_text,
            integrated_text=request.integrated_text,
            clarification_answers=request.clarification_answers
        )
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse text: {str(e)}")

@router.post("/clarify")
async def clarify_design_brief(request: DesignGenerationRequest) -> dict:
    """Analyze raw text and return 3-4 specific clarifying questions."""
    from app.services.llm_service import generate_design_brief_questions
    try:
        result = await generate_design_brief_questions(request.raw_text)
        return result
    except Exception as e:
        import logging
        logging.exception("Failed to generate clarification questions")
        raise HTTPException(status_code=500, detail=f"Failed to generate clarification questions: {str(e)}")

@router.post("/modify-prompt")
async def modify_prompt(request: ModifyPromptRequest) -> dict:
    """Modifies visual prompt parts via Gemini based on Indonesian text instructions."""
    from app.services.llm_service import modify_visual_prompt
    try:
        result = await modify_visual_prompt(
            original_parts=request.original_prompt_parts,
            instruction=request.user_instruction
        )
        return result
    except Exception as e:
        import logging
        logging.exception("Failed to modify prompt")
        raise HTTPException(status_code=500, detail=f"Failed to modify prompt: {str(e)}")

@router.post("/magic-text")
async def magic_text_layout(
    request: dict,
    current_user: User = Depends(rate_limit_dependency),
) -> dict:
    """Uses Vision AI to layout user text onto an existing canvas image."""
    from app.services.llm_service import generate_magic_text_layout
    try:
        image_base64 = request.get("image_base64")
        text = request.get("text")
        if not image_base64 or not text:
            raise HTTPException(status_code=400, detail="Missing image_base64 or text")

        # Validate base64 is not unreasonably large (>20MB decoded ≈ ~27MB base64)
        if len(image_base64) > 30_000_000:
            raise HTTPException(status_code=400, detail="Image too large. Max ~20MB.")

        result = await generate_magic_text_layout(image_base64=image_base64, text=text)
        return result
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.exception("Failed to generate magic text layout")
        raise HTTPException(status_code=500, detail=f"Failed to generate layout: {str(e)}")

@router.post("/generate")
async def generate_design(
    request: DesignGenerationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_dependency),
):
    """
    Full generation flow. When FAL_KEY is available, dispatches to Celery.
    Otherwise, runs synchronously using Gemini Imagen as fallback.
    """
    from app.core.config import settings as app_settings

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

    # Use Celery+Fal.ai only when explicitly enabled (requires running celery worker)
    import os
    _use_celery = app_settings.FAL_KEY and os.getenv("USE_CELERY", "false").lower() == "true"

    if _use_celery:
        from app.workers.tasks import generate_design_task
        generate_design_task.delay(
            job_id=str(job.id),
            raw_text=request.raw_text,
            aspect_ratio=request.aspect_ratio,
            style=request.style_preference,
            reference_url=getattr(request, "reference_image_url", None),
            integrated_text=request.integrated_text,
        )
        return {
            "job_id": str(job.id),
            "status": "queued",
            "message": "Design generation started. Poll /api/designs/jobs/{job_id} for status.",
        }
    # Sync fallback: generate with Gemini Imagen (no Celery needed)
    import logging
    logging.warning("Using Gemini Imagen sync fallback for image generation")
    try:
        from datetime import datetime, timezone

        # Parse text first (reuse existing logic)
        parsed = await parse_design_text(request.raw_text, integrated_text=request.integrated_text)

        # Assemble visual prompt from parts if available (user might have edited/toggled them)
        if parsed.visual_prompt_parts:
            # We filter for enabled parts just in case, though the backend /generate endpoint
            # currently just takes raw_text and re-parses it. This is prep for when
            # frontend sends the modified parsed object directly or as an assembled prompt.
            assembled = ", ".join(p.value for p in parsed.visual_prompt_parts if p.enabled)
            visual_prompt_final = assembled if assembled else parsed.visual_prompt
        else:
            visual_prompt_final = parsed.visual_prompt

        # Update job with parsed data
        job.parsed_headline = parsed.headline
        job.parsed_sub_headline = parsed.sub_headline
        job.parsed_cta = parsed.cta
        job.visual_prompt = visual_prompt_final
        job.status = "processing"
        await db.commit()

        # Generate image with Gemini Imagen
        from google import genai
        from google.genai import types

        style_map = {
            "bold": "bold vibrant colors, high contrast, eye-catching",
            "minimalist": "clean minimal design, soft colors, whitespace",
            "elegant": "luxury premium feel, gold accents, sophisticated",
            "playful": "fun colorful, happy energetic vibe, bubbly shapes",
        }
        style_suffix = style_map.get(request.style_preference, style_map["bold"])

        # Modify the prompt based on whether we want embedded text or not
        text_instruction = (
            f"high quality typography, clearly readable text saying '{parsed.headline}', stylized to match the scene"
            if request.integrated_text
            else "copy space area for text overlay, no text, no letters, no words"
        )

        import re
        def sanitize_prompt_for_imagen(prompt: str) -> str:
            replacements = {
                r'\b(child|children|kid|kids|boy|girl|toddler|baby|infant|teen|teenager|young student|school child)(s)?\b': 'person',
                r'\b(young singer)\b': 'singer',
                r'\b(elementary school)\b': '', # remove specific young age contexts
            }
            sanitized = prompt
            for pattern, replacement in replacements.items():
                sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)
            return sanitized.strip()

        enhanced_prompt = (
            f"{sanitize_prompt_for_imagen(visual_prompt_final)}, {style_suffix}, "
            f"professional graphic design background, {text_instruction}, high quality, 4k"
        )

        client = genai.Client(api_key=app_settings.GEMINI_API_KEY)
        response = client.models.generate_images(
            model='imagen-4.0-fast-generate-001',
            prompt=enhanced_prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio=request.aspect_ratio.replace(":", ":"),
            ),
        )

        if response.generated_images:
            image_bytes = response.generated_images[0].image.image_bytes
            from app.services.storage_service import upload_image
            result_url = await upload_image(
                image_bytes,
                content_type="image/png",
                prefix="generated",
            )
            job.result_url = result_url
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
        else:
            job.status = "failed"
            job.error_message = "Prompt rejected by Gemini safety filters (e.g. contains minors, sensitive topics). Please try rephrasing the prompt."
            job.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(job)

        return {
            "job_id": str(job.id),
            "status": job.status,
            "message": "Generated synchronously via Gemini Imagen.",
        }

    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")


@router.get("/my-generations")
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
            Job.result_url.isnot(None)
        )
        .order_by(desc(Job.created_at))
        .offset(offset)
        .limit(limit)
    )
    jobs = result.scalars().all()

    return [
        {
            "id": str(job.id),
            "result_url": job.result_url,
            "visual_prompt": job.visual_prompt,
            "raw_text": job.raw_text,
            "created_at": job.created_at.isoformat() if job.created_at else None,
        }
        for job in jobs
    ]


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
