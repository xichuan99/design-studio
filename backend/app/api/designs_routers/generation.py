from fastapi import status
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.design import (
    DesignGenerationRequest,
    GenerateTitleRequest,
    GenerateTitleResponse,
)
from app.models.job import Job
from app.api.rate_limit import rate_limit_dependency
from app.models.user import User
from app.schemas.error import ERROR_RESPONSES
from app.core.exceptions import InternalServerError, ValidationError, InsufficientCreditsError, AppException

router = APIRouter(tags=["Designs - Generation"])


@router.post(
    "/clarify",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Clarify Design Brief",
    description="Analyze raw text and return 3-4 specific clarifying questions.",
    responses=ERROR_RESPONSES,
)
async def clarify_design_brief(request: DesignGenerationRequest) -> dict:
    """Analyze raw text and return 3-4 specific clarifying questions."""
    from app.services.llm_service import generate_design_brief_questions

    try:
        result = await generate_design_brief_questions(request.raw_text)
        return result
    except Exception as e:
        import logging

        logging.exception("Failed to generate clarification questions")
        raise InternalServerError(detail=f"Failed to generate clarification questions: {str(e)}",
        )

@router.post(
    "/clarify-unified",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Clarify Unified Brief",
    description="Analyze raw text and return combined clarifying questions for both design and copywriting.",
    responses=ERROR_RESPONSES,
)
async def clarify_unified_brief(request: DesignGenerationRequest) -> dict:
    """Analyze raw text and return combined clarifying questions for both design and copywriting."""
    from app.services.llm_service import generate_unified_brief_questions

    try:
        result = await generate_unified_brief_questions(request.raw_text)
        return result
    except Exception as e:
        import logging

        logging.exception("Failed to generate unified clarification questions")
        raise InternalServerError(detail=f"Failed to generate unified clarification questions: {str(e)}",
        )

@router.post(
    "/magic-text",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Magic Text Layout",
    description="Uses Vision AI to layout user text onto an existing canvas image.",
    responses=ERROR_RESPONSES,
)
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
            raise ValidationError(detail="Missing image_base64 or text")

        # Validate base64 is not unreasonably large (>20MB decoded ≈ ~27MB base64)
        if len(image_base64) > 30_000_000:
            raise ValidationError(detail="Image too large. Max ~20MB.")

        canvas_width = request.get("canvas_width", 1024)
        canvas_height = request.get("canvas_height", 1024)
        result = await generate_magic_text_layout(
            image_base64=image_base64,
            text=text,
            style_hint=style_hint,
            canvas_width=canvas_width,
            canvas_height=canvas_height,
        )
        return result
    except AppException:
        raise
    except Exception as e:
        import logging

        logging.exception("Failed to generate magic text layout")
        raise InternalServerError(detail=f"Failed to generate layout: {str(e)}"
        )

@router.post(
    "/generate-title",
    response_model=GenerateTitleResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Project Title",
    description="Generates a short project title from a prompt via LLM.",
    responses=ERROR_RESPONSES,
)
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
        raise InternalServerError(detail="Failed to generate project title")

@router.post(
    "/generate",
    response_model=dict,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Generate Design",
    description="Accepts generation request, charges credits, and queues or executes generation.",
    responses=ERROR_RESPONSES,
)
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

    from app.core.credit_costs import COST_GENERATE_DESIGN
    if current_user.credits_remaining < COST_GENERATE_DESIGN:
        raise InsufficientCreditsError(detail="Insufficient credits. Please upgrade or wait for a refill.",
        )

    # Deduct credit
    from app.services.credit_service import log_credit_change

    await log_credit_change(db, current_user, -COST_GENERATE_DESIGN, "Generate desain")

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

    # Load brand kit colors and typography if specified
    brand_colors = None
    brand_typography = None
    strict_brand_suffix = ""
    if request.brand_kit_id:
        from app.models.brand_kit import BrandKit
        from sqlalchemy.future import select
        import uuid

        try:
            kit_id_uuid = uuid.UUID(request.brand_kit_id)
            kit_result = await db.execute(
                select(BrandKit).where(
                    BrandKit.id == kit_id_uuid, BrandKit.user_id == current_user.id
                )
            )
            kit = kit_result.scalar_one_or_none()
            if kit:
                if kit.colors:
                    brand_colors = [c.get("hex") for c in kit.colors if c.get("hex")]
                if kit.typography:
                    brand_typography = kit.typography

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
                        parts.append(
                            "Use ONLY these exact hex colors: "
                            + ", ".join(color_strs)
                            + "."
                        )
                if kit.typography:
                    fonts = []
                    if kit.typography.get("primaryFont"):
                        fonts.append(
                            f"Headline Font: {kit.typography.get('primaryFont')}"
                        )
                    if kit.typography.get("secondaryFont"):
                        fonts.append(
                            f"Body Font: {kit.typography.get('secondaryFont')}"
                        )
                    if fonts:
                        parts.append(
                            "Typography constraints: " + ", ".join(fonts) + "."
                        )
                if not parts:
                    return ""
                return (
                    " CRITICAL INSTRUCTION: "
                    + " ".join(parts)
                    + " Do not improvise or add any other colors or fonts."
                )

            strict_brand_suffix = build_strict_brand_suffix(kit)
        except Exception as e:
            import logging

            logging.error(f"Failed to load brand kit {request.brand_kit_id}: {e}")

    # Use Celery+Fal.ai only when explicitly enabled (requires running celery worker)
    import os

    _use_celery = (
        app_settings.FAL_KEY and os.getenv("USE_CELERY", "false").lower() == "true"
    )

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
                brand_colors=brand_colors,
                brand_typography=brand_typography,
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

            await log_credit_change(
                db, current_user, COST_GENERATE_DESIGN, "Refund: gagal generate desain"
            )
            await db.commit()
            raise InternalServerError(detail=f"Image generation failed to start: {str(e)}"
            )

    import logging

    logging.info(
        "Using Gemini synchronous generation (Nano Banana / Imagen) for image generation"
    )
    try:
        from datetime import datetime, timezone
        from app.services.llm_service import parse_design_text
        import asyncio

        # Parse text first (reuse existing logic)
        parsed = await parse_design_text(
            request.raw_text,
            integrated_text=request.integrated_text,
            brand_colors=brand_colors,
            brand_typography=brand_typography,
        )

        # Assemble visual prompt from parts if available (user might have edited/toggled them)
        if parsed.visual_prompt_parts:
            # We filter for enabled parts just in case, though the backend /generate endpoint
            # currently just takes raw_text and re-parses it. This is prep for when
            # frontend sends the modified parsed object directly or as an assembled prompt.
            assembled = ", ".join(
                p.value for p in parsed.visual_prompt_parts if p.enabled
            )
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
            model_name = "gemini-3.1-flash-image-preview"

            # Build all text elements for integrated rendering
            text_parts = [f"'{parsed.headline}'"]
            if parsed.sub_headline:
                text_parts.append(f"'{parsed.sub_headline}'")
            if parsed.cta:
                text_parts.append(f"'{parsed.cta}'")
            all_text = ", and ".join(text_parts)

            text_instruction = f"high quality typography, clearly readable text showing {all_text}, with proper visual hierarchy, stylized to perfectly integrate organically into the scene"
        else:
            model_name = "imagen-4.0-fast-generate-001"  # Keep imagen for non-text backgrounds as it excels at pure aesthetics
            text_instruction = "professional graphic design background, copy space area for text overlay, no text, no letters, no words"

        import re

        def sanitize_prompt_for_imagen(prompt: str) -> str:
            replacements = {
                r"\b(child|children|kid|kids|boy|girl|toddler|baby|infant|teen|teenager|young student|school child)(s)?\b": "person",
                r"\b(young singer)\b": "singer",
                r"\b(elementary school)\b": "",  # remove specific young age contexts
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
        if model_name == "gemini-3.1-flash-image-preview":
            # Nano Banana 2 uses generate_content for image generation
            # Explicitly append aspect ratio to the prompt
            nb2_prompt = f"{enhanced_prompt}, aspect ratio {request.aspect_ratio}"
            response = await asyncio.to_thread(
                client.models.generate_content,
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
            response = await asyncio.to_thread(
                client.models.generate_images,
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
            if getattr(request, "remove_product_bg", False) and getattr(
                request, "product_image_url", None
            ):
                try:
                    # Download the product image locally
                    import httpx

                    async with httpx.AsyncClient() as http_client:
                        product_resp = await http_client.get(request.product_image_url)
                        product_resp.raise_for_status()
                        product_bytes = product_resp.content

                    # 1. Remove background from product
                    from app.services.bg_removal_service import (
                        remove_background,
                        composite_product_on_background,
                    )

                    product_nobg_bytes = await remove_background(product_bytes)

                    # 2. Composite the isolated product on top of the newly generated Imagen background
                    image_bytes = await composite_product_on_background(
                        product_nobg_bytes, image_bytes
                    )
                except Exception as comp_e:
                    import logging

                    logging.exception(
                        f"Failed product composite during generation, falling back to raw background: {str(comp_e)}"
                    )
                    # We fallback to the raw background image if compositing fails

            from app.services.storage_service import upload_image_tracked

            result_url = await upload_image_tracked(
                image_bytes,
                user_id=current_user.id,
                db=db,
                content_type="image/png"
                if not getattr(request, "remove_product_bg", False)
                else "image/jpeg",
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

            await log_credit_change(db, current_user, COST_GENERATE_DESIGN, "Refund: prompt ditolak AI")

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

        await log_credit_change(db, current_user, COST_GENERATE_DESIGN, "Refund: sistem error")
        await db.commit()
        raise InternalServerError(detail=f"Image generation failed: {str(e)}"
        )

