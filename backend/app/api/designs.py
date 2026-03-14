"""Updated designs API with generate and job status endpoints."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from app.core.database import get_db
from app.schemas.design import (
    DesignGenerationRequest,
    ParsedTextElements,
    ModifyPromptRequest,
    CopywritingClarifyRequest,
    CopywritingRequest,
    CopywritingResponse,
    GenerateTitleRequest,
    GenerateTitleResponse
)
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

@router.post("/clarify-unified")
async def clarify_unified_brief(request: DesignGenerationRequest) -> dict:
    """Analyze raw text and return combined clarifying questions for both design and copywriting."""
    from app.services.llm_service import generate_unified_brief_questions
    try:
        result = await generate_unified_brief_questions(request.raw_text)
        return result
    except Exception as e:
        import logging
        logging.exception("Failed to generate unified clarification questions")
        raise HTTPException(status_code=500, detail=f"Failed to generate unified clarification questions: {str(e)}")

@router.post("/modify-prompt")
async def modify_prompt(request: ModifyPromptRequest) -> dict:
    """Modifies visual prompt parts via Gemini based on Indonesian text instructions."""
    from app.services.llm_service import modify_visual_prompt
    try:
        result = await modify_visual_prompt(
            original_parts=request.original_prompt_parts,
            original_visual_prompt=request.original_visual_prompt,
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
        style_hint = request.get("style_hint")
        if not image_base64 or not text:
            raise HTTPException(status_code=400, detail="Missing image_base64 or text")

        # Validate base64 is not unreasonably large (>20MB decoded ≈ ~27MB base64)
        if len(image_base64) > 30_000_000:
            raise HTTPException(status_code=400, detail="Image too large. Max ~20MB.")

        canvas_width = request.get("canvas_width", 1024)
        canvas_height = request.get("canvas_height", 1024)
        result = await generate_magic_text_layout(image_base64=image_base64, text=text, style_hint=style_hint, canvas_width=canvas_width, canvas_height=canvas_height)
        return result
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.exception("Failed to generate magic text layout")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate layout: {str(e)}"
        )

@router.post("/generate-title", response_model=GenerateTitleResponse)
async def api_generate_project_title(
    request: GenerateTitleRequest,
    current_user: User = Depends(rate_limit_dependency),
):
    """Generates a short project title from a prompt via LLM."""
    from app.services.llm_service import generate_project_title
    try:
        title = await generate_project_title(request.prompt)
        return GenerateTitleResponse(title=title)
    except Exception:
        import logging
        logging.exception("Failed to generate project title")
        raise HTTPException(status_code=500, detail="Failed to generate project title")

@router.post("/remove-background")
async def api_remove_background(
    file: UploadFile = File(...),
    current_user: User = Depends(rate_limit_dependency),
):
    """
    Stand-alone endpoint to remove background from an uploaded image.
    Returns the URL of the processed PNG transparent image.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400, detail="File must be an image"
        )

    # Read file content safely
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=400,
            detail="Image size exceeds 10MB limit"
        )

    from app.services.bg_removal_service import remove_background
    try:
        no_bg_bytes = await remove_background(content)

        # Upload the transparent PNG to our storage
        from app.services.storage_service import upload_image
        result_url = await upload_image(
            no_bg_bytes,
            content_type="image/png",
            prefix=f"nobg_{current_user.id}"
        )

        return {"url": result_url}
    except Exception as e:
        import logging
        logging.exception("Failed to remove background")
        raise HTTPException(
            status_code=500,
            detail=f"Background removal failed: {str(e)}"
        )

@router.post("/clarify-copywriting")
async def clarify_copywriting(
    request: CopywritingClarifyRequest,
    current_user: User = Depends(rate_limit_dependency),
) -> dict:
    """Generates 3-4 clarification questions for copywriting."""
    from app.services.llm_service import generate_copywriting_questions
    try:
        result = await generate_copywriting_questions(request.product_description)
        return result
    except Exception:
        import logging
        logging.exception("Failed to clarify copywriting")
        raise HTTPException(status_code=500, detail="Failed to clarify copywriting")

@router.post("/generate-copywriting", response_model=CopywritingResponse)
async def generate_copywriting(
    request: CopywritingRequest,
    current_user: User = Depends(rate_limit_dependency),
):
    """Generates 3 variations of copywriting based on product description and clarifications."""
    from app.services.llm_service import generate_ai_copywriting
    try:
        result = await generate_ai_copywriting(
            product_description=request.product_description,
            tone=request.tone,
            brand_name=request.brand_name,
            clarification_answers=request.clarification_answers
        )
        return result
    except Exception:
        import logging
        logging.exception("Failed to generate copywriting")
        raise HTTPException(status_code=500, detail="Failed to generate copywriting")

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
    from app.services.credit_service import log_credit_change
    await log_credit_change(db, current_user, -1, "Generate desain")

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
        try:
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
        except Exception as e:
            job.status = "failed"
            job.error_message = f"Failed to dispatch task: {str(e)}"
            from app.services.credit_service import log_credit_change
            await log_credit_change(db, current_user, 1, "Refund: gagal generate desain")
            await db.commit()
            raise HTTPException(status_code=500, detail=f"Image generation failed to start: {str(e)}")
    import logging
    logging.info("Using Gemini synchronous generation (Nano Banana / Imagen) for image generation")
    try:
        from datetime import datetime, timezone

        def build_strict_brand_suffix(kit) -> str:
            if not kit:
                return ""
            
            parts = []
            if kit.colors:
                color_strs = []
                for c in kit.colors:
                    role = c.get("role", "color").upper()
                    hex_val = c.get("hex", "")
                    if hex_val:
                        color_strs.append(f"{role}: {hex_val}")
                if color_strs:
                    parts.append("Use ONLY these exact hex colors: " + ", ".join(color_strs) + ".")
            
            if kit.typography:
                fonts = []
                if kit.typography.get("primaryFont"):
                    fonts.append(f"Headline Font: {kit.typography.get('primaryFont')}")
                if kit.typography.get("secondaryFont"):
                    fonts.append(f"Body Font: {kit.typography.get('secondaryFont')}")
                if fonts:
                    parts.append("Typography constraints: " + ", ".join(fonts) + ".")
                    
            if not parts:
                return ""
            
            return " CRITICAL INSTRUCTION: " + " ".join(parts) + " Do not improvise or add any other colors or fonts."

        # Load brand kit colors if specified
        brand_colors = None
        if request.brand_kit_id:
            from app.models.brand_kit import BrandKit
            from sqlalchemy.future import select
            import uuid
            try:
                kit_id_uuid = uuid.UUID(request.brand_kit_id)
                kit_result = await db.execute(
                    select(BrandKit).where(
                        BrandKit.id == kit_id_uuid,
                        BrandKit.user_id == current_user.id
                    )
                )
                kit = kit_result.scalar_one_or_none()
                if kit and kit.colors:
                    # extract the hex values
                    brand_colors = [c.get("hex") for c in kit.colors if c.get("hex")]
                
                strict_brand_suffix = build_strict_brand_suffix(kit)
            except Exception as e:
                logging.error(f"Failed to load brand kit {request.brand_kit_id}: {e}")
                strict_brand_suffix = ""
        else:
            strict_brand_suffix = ""

        # Parse text first (reuse existing logic)
        parsed = await parse_design_text(
            request.raw_text,
            integrated_text=request.integrated_text,
            brand_colors=brand_colors
        )

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

        # Determine the best model and text instructions based on integration needs
        if request.integrated_text:
            model_name = 'gemini-3.1-flash-image-preview'

            # Build all text elements for integrated rendering
            text_parts = [f"'{parsed.headline}'"]
            if parsed.sub_headline:
                text_parts.append(f"'{parsed.sub_headline}'")
            if parsed.cta:
                text_parts.append(f"'{parsed.cta}'")
            all_text = ", and ".join(text_parts)

            text_instruction = f"high quality typography, clearly readable text showing {all_text}, with proper visual hierarchy, stylized to perfectly integrate organically into the scene"
        else:
            model_name = 'imagen-4.0-fast-generate-001'  # Keep imagen for non-text backgrounds as it excels at pure aesthetics
            text_instruction = "professional graphic design background, copy space area for text overlay, no text, no letters, no words"

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
            f"{text_instruction}, high quality, 4k{strict_brand_suffix}"
        )

        client = genai.Client(api_key=app_settings.GEMINI_API_KEY)

        image_bytes = None
        if model_name == 'gemini-3.1-flash-image-preview':
            # Nano Banana 2 uses generate_content for image generation
            # Explicitly append aspect ratio to the prompt
            nb2_prompt = f"{enhanced_prompt}, aspect ratio {request.aspect_ratio}"
            response = client.models.generate_content(
                model=model_name,
                contents=nb2_prompt,
            )
            if response.candidates:
                for candidate in response.candidates:
                    if candidate.content and candidate.content.parts:
                        for part in candidate.content.parts:
                            if part.inline_data:
                                image_bytes = part.inline_data.data
                                break
                    if image_bytes:
                        break
        else:
            # Traditional Imagen models use generate_images
            response = client.models.generate_images(
                model=model_name,
                prompt=enhanced_prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio=request.aspect_ratio.replace(":", ":"),
                ),
            )
            if response.generated_images:
                image_bytes = response.generated_images[0].image.image_bytes

        if image_bytes:

            # --- Flow A: Product Composite Logic ---
            if getattr(request, "remove_product_bg", False) and getattr(request, "product_image_url", None):
                try:
                    # Download the product image locally
                    import httpx
                    async with httpx.AsyncClient() as http_client:
                        product_resp = await http_client.get(request.product_image_url)
                        product_resp.raise_for_status()
                        product_bytes = product_resp.content

                    # 1. Remove background from product
                    from app.services.bg_removal_service import remove_background, composite_product_on_background
                    product_nobg_bytes = await remove_background(product_bytes)

                    # 2. Composite the isolated product on top of the newly generated Imagen background
                    image_bytes = await composite_product_on_background(product_nobg_bytes, image_bytes)
                except Exception as comp_e:
                    import logging
                    logging.exception(f"Failed product composite during generation, falling back to raw background: {str(comp_e)}")
                    # We fallback to the raw background image if compositing fails

            from app.services.storage_service import upload_image
            result_url = await upload_image(
                image_bytes,
                content_type="image/png" if not getattr(request, "remove_product_bg", False) else "image/jpeg",
                prefix="generated",
            )
            job.result_url = result_url
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
        else:
            job.status = "failed"
            job.error_message = "Desain ditolak oleh sistem keamanan AI karena mengandung unsur yang dilindungi hak cipta (misal: nama tokoh terkenal, karakter kartun, atau brand spesifik seperti 'Avengers', 'Disney', dll) atau konten sensitif lainnya. Mohon ubah deskripsi Anda menggunakan kata-kata yang lebih umum."
            job.completed_at = datetime.now(timezone.utc)
            # Refund credit
            from app.services.credit_service import log_credit_change
            await log_credit_change(db, current_user, 1, "Refund: prompt ditolak AI")

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
        from app.services.credit_service import log_credit_change
        await log_credit_change(db, current_user, 1, "Refund: sistem error")
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
