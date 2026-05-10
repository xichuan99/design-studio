from fastapi import status
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.design import (
    DesignGenerationRequest,
    GenerateTitleRequest,
    GenerateTitleResponse,
    RedesignRequest,
)
from app.models.job import Job
from app.api.rate_limit import rate_limit_dependency
from app.models.user import User
from app.schemas.error import ERROR_RESPONSES
from app.core.exceptions import (
    InternalServerError,
    ValidationError,
    InsufficientCreditsError,
    AppException,
)
from app.core.config import settings
from uuid import UUID
import re
import httpx
from app.core.model_tiers import default_model_tier_for_plan, is_model_accessible


def sanitize_prompt_for_imagen(prompt: str) -> str:
    """Remove age-related terms that may trigger safety filters in Imagen."""
    replacements = {
        r"\b(child|children|kid|kids|boy|girl|toddler|baby|infant|teen|teenager|young student|school child)(s)?\b": "person",
        r"\b(young singer)\b": "singer",
        r"\b(elementary school)\b": "",
    }
    sanitized = prompt
    for pattern, replacement in replacements.items():
        sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)
    return sanitized.strip()


async def _apply_brand_kit_logo_if_exists(
    db: AsyncSession, user_id: UUID, brand_kit_id: str, image_bytes: bytes
) -> bytes:
    try:
        from app.models.brand_kit import BrandKit
        from sqlalchemy.future import select
        import uuid
        import httpx
        import io
        from PIL import Image

        kit_id_uuid = uuid.UUID(brand_kit_id)
        kit_result = await db.execute(
            select(BrandKit).where(
                BrandKit.id == kit_id_uuid, BrandKit.user_id == user_id
            )
        )
        kit = kit_result.scalar_one_or_none()

        logo_url = None
        if kit:
            if kit.logos and len(kit.logos) > 0:
                logo_url = kit.logos[0]
            elif hasattr(kit, "logo_url") and kit.logo_url:
                logo_url = kit.logo_url

        if logo_url:
            async with httpx.AsyncClient(timeout=10.0) as http_client:
                logo_resp = await http_client.get(logo_url)
                if logo_resp.status_code == 200:
                    logo_bytes = logo_resp.content

                    base_img = Image.open(io.BytesIO(image_bytes))
                    base_w, base_h = base_img.size

                    logo_img = Image.open(io.BytesIO(logo_bytes))
                    logo_w, logo_h = logo_img.size

                    from app.services.quantum_service import (
                        optimize_quantum_logo_placement,
                    )

                    placement = await optimize_quantum_logo_placement(
                        base_w, base_h, logo_w, logo_h
                    )

                    if placement:
                        from app.services.watermark_service import apply_logo_overlay

                        new_image_bytes = await apply_logo_overlay(
                            image_bytes,
                            logo_bytes,
                            x=placement["x"],
                            y=placement["y"],
                            width=placement["width"],
                            height=placement["height"],
                        )
                        return new_image_bytes
    except Exception as e:
        import logging

        logging.warning(f"Failed to auto-place brand kit logo: {str(e)}")

    return image_bytes


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
        raise InternalServerError(
            detail=f"Failed to generate clarification questions: {str(e)}",
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
        result = await generate_unified_brief_questions(
            request.raw_text, mode=request.mode
        )
        return result
    except Exception as e:
        import logging

        logging.exception("Failed to generate unified clarification questions")
        raise InternalServerError(
            detail=f"Failed to generate unified clarification questions: {str(e)}",
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
        raise InternalServerError(detail=f"Failed to generate layout: {str(e)}")


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
        raise InsufficientCreditsError(
            detail="Insufficient credits. Please upgrade or wait for a refill.",
        )

    # Deduct credit — track total charged for accurate refunds
    from app.services.credit_service import log_credit_change

    total_charged = COST_GENERATE_DESIGN
    await log_credit_change(db, current_user, -COST_GENERATE_DESIGN, "Generate desain")

    # Catalog flow may upload the image as product_image_url without remove_product_bg.
    # Treat it as reference image so i2i path can follow the real subject.
    effective_reference_image_url = (
        getattr(request, "reference_image_url", None)
        or getattr(request, "product_image_url", None)
    )
    reference_focus = getattr(request, "reference_focus", "auto")

    # Create a job record in the database
    job = Job(
        raw_text=request.raw_text,
        aspect_ratio=request.aspect_ratio,
        style_preference=request.style_preference,
        reference_image_url=effective_reference_image_url,
        user_id=current_user.id,
        seed=getattr(request, "seed", None),
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
                reference_url=effective_reference_image_url,
                reference_focus=reference_focus,
                integrated_text=request.integrated_text,
                brand_colors=brand_colors,
                brand_typography=brand_typography,
                headline_override=request.headline_override,
                sub_headline_override=request.sub_headline_override,
                cta_override=request.cta_override,
                product_name=request.product_name,
                offer_text=request.offer_text,
                use_ai_copy_assist=request.use_ai_copy_assist,
                seed=getattr(request, "seed", None),
                charged_credits=total_charged,
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
                db, current_user, total_charged, "Refund: gagal generate desain"
            )
            await db.commit()
            raise InternalServerError(
                detail=f"Image generation failed to start: {str(e)}"
            )

    import logging

    logging.info("Using Fal/OpenRouter synchronous generation for image generation")
    try:
        from datetime import datetime, timezone
        from app.services.llm_service import apply_copy_overrides, parse_design_text

        # Parse text first (reuse existing logic)
        parsed = await parse_design_text(
            request.raw_text,
            integrated_text=request.integrated_text,
            brand_colors=brand_colors,
            brand_typography=brand_typography,
            headline_override=request.headline_override,
            sub_headline_override=request.sub_headline_override,
            cta_override=request.cta_override,
            product_name=request.product_name,
            offer_text=request.offer_text,
            use_ai_copy_assist=request.use_ai_copy_assist,
        )
        parsed = apply_copy_overrides(
            parsed,
            headline_override=request.headline_override,
            sub_headline_override=request.sub_headline_override,
            cta_override=request.cta_override,
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

        num_variations = getattr(request, "num_variations", 3)
        # Step 2.5: Quantum Layout Optimization (Synchronous Fallback route)
        if settings.QUANTUM_LAYOUT_ENABLED:
            import json as _json
            from app.services.quantum_service import optimize_quantum_layout

            quantum_layout = await optimize_quantum_layout(
                parsed.headline, parsed.sub_headline, parsed.cta,
                ratio=request.aspect_ratio,
                num_variations=num_variations,
            )
            if quantum_layout:
                job.quantum_layout = quantum_layout
                try:
                    ql_data = _json.loads(quantum_layout)
                    modifier = ql_data.get("image_prompt_modifier")
                    if modifier:
                        visual_prompt_final = f"{visual_prompt_final} {modifier}"

                    bundle: list[dict] = []
                    var_list = ql_data.get("variations") or [[]]
                    for i, layout_els in enumerate(var_list):
                        bundle.append({
                            "set_num": (ql_data.get("selected_set") or 1) + i,
                            "result_url": None,
                            "composition": ql_data.get("composition"),
                            "image_prompt_modifier": ql_data.get("image_prompt_modifier"),
                            "layout_elements": layout_els,
                        })
                    job.variation_results = _json.dumps(bundle)
                except Exception:
                    pass

        await db.commit()

        # Generate image with Fal.ai providers
        from app.services.image_service import generate_background
        from app.services.prompt_builder import PromptBuilder

        style_raw = request.style_preference if request.style_preference else "auto"
        preset = PromptBuilder.get_preset(style_raw)
        style_key = preset.key

        # Fal.ai-only image pipeline.
        model_name = "fal-ai"
        if request.integrated_text:
            text_parts = [f"'{parsed.headline}'"]
            if parsed.sub_headline:
                text_parts.append(f"'{parsed.sub_headline}'")
            if parsed.cta:
                text_parts.append(f"'{parsed.cta}'")
            all_text = ", and ".join(text_parts)
            text_instruction = (
                f"high quality typography, clearly readable text showing {all_text}, "
                "with proper visual hierarchy, polished ad design"
            )
        else:
            text_instruction = (
                "professional graphic design background, copy space area for text overlay, "
                "no text, no letters, no words"
            )

        enhanced_prompt = sanitize_prompt_for_imagen(
            PromptBuilder.build(
                visual_prompt=visual_prompt_final,
                style_key=style_key,
                text_instruction=text_instruction,
                brand_suffix=strict_brand_suffix.lstrip(", "),
            )
        )

        requested_quality = (getattr(request, "quality", "auto") or "auto").lower()
        if requested_quality == "standard":
            requested_quality = "pro"

        if requested_quality == "auto":
            selected_model_tier = default_model_tier_for_plan(current_user.plan_tier)
        else:
            selected_model_tier = requested_quality

        required_plan_by_tier = {
            "basic": "starter",
            "pro": "pro",
            "ultra": "business",
        }
        required_plan_tier = required_plan_by_tier.get(selected_model_tier, "starter")
        if not is_model_accessible(current_user.plan_tier, required_plan_tier):
            raise ValidationError(
                detail=f"Model tier '{selected_model_tier}' membutuhkan paket minimal {required_plan_tier}."
            )

        use_ultra = selected_model_tier == "ultra"
        if use_ultra:
            from app.services.image_service import generate_background_ultra
            from app.core.credit_costs import COST_GENERATE_DESIGN_ULTRA, COST_GENERATE_DESIGN
            extra_cost = COST_GENERATE_DESIGN_ULTRA - COST_GENERATE_DESIGN
            if current_user.credits_remaining < extra_cost:
                raise InsufficientCreditsError(detail="Insufficient credits for ultra quality")
            await log_credit_change(db, current_user, -extra_cost, "Generate desain (ultra surcharge)")
            total_charged = COST_GENERATE_DESIGN_ULTRA  # full 80
            fal_result = await generate_background_ultra(
                visual_prompt=enhanced_prompt,
                aspect_ratio=request.aspect_ratio,
            )
            model_name = "gpt-image-2"
        else:
            fal_result = await generate_background(
                visual_prompt=enhanced_prompt,
                reference_image_url=effective_reference_image_url,
                reference_focus=reference_focus,
                model_tier=selected_model_tier,
                style=style_key,
                aspect_ratio=request.aspect_ratio,
                integrated_text=request.integrated_text,
                preserve_product=bool(getattr(request, "remove_product_bg", False)),
                seed=getattr(request, "seed", None),
            )
        async with httpx.AsyncClient() as http_client:
            img_resp = await http_client.get(fal_result["image_url"], timeout=30.0)
            img_resp.raise_for_status()
            image_bytes = img_resp.content

        # --- Sequential multi-image generation ---
        generated_urls: list[str] = []
        for var_idx in range(num_variations):
            try:
                # Slight prompt perturbation to get visual diversity
                if var_idx > 0:
                    var_prompt = f"{enhanced_prompt} [variant seed {var_idx}]"
                else:
                    var_prompt = enhanced_prompt

                if use_ultra:
                    var_fal = await generate_background_ultra(
                        visual_prompt=var_prompt,
                        aspect_ratio=request.aspect_ratio,
                    )
                else:
                    var_fal = await generate_background(
                        visual_prompt=var_prompt,
                        reference_image_url=effective_reference_image_url,
                        reference_focus=reference_focus,
                        model_tier=selected_model_tier,
                        style=style_key,
                        aspect_ratio=request.aspect_ratio,
                        integrated_text=request.integrated_text,
                        preserve_product=bool(getattr(request, "remove_product_bg", False)),
                        seed=getattr(request, "seed", None),
                    )

                async with httpx.AsyncClient() as http_client:
                    img_resp = await http_client.get(var_fal["image_url"], timeout=30.0)
                    img_resp.raise_for_status()
                    var_bytes = img_resp.content

                if var_bytes:
                    if getattr(request, "remove_product_bg", False) and getattr(
                        request, "product_image_url", None
                    ):
                        from app.services.bg_removal_service import (
                            composite_product_on_background,
                        )
                        var_bytes = await composite_product_on_background(
                            product_nobg_bytes, var_bytes
                        ) if 'product_nobg_bytes' in dir() else var_bytes

                    from app.services.storage_service import upload_image_tracked
                    if getattr(request, "brand_kit_id", None):
                        var_bytes = await _apply_brand_kit_logo_if_exists(
                            db, current_user.id, request.brand_kit_id, var_bytes
                        )
                    var_url = await upload_image_tracked(
                        var_bytes,
                        user_id=current_user.id,
                        db=db,
                        content_type="image/png"
                        if not getattr(request, "remove_product_bg", False)
                        else "image/jpeg",
                        prefix="generated",
                    )
                    generated_urls.append(var_url)
            except Exception:
                pass  # skip failed variation

        if generated_urls:
            # Patch variation_results with real URLs
            try:
                bundle = _json.loads(job.variation_results or "[]")
                for i, item in enumerate(bundle):
                    if i < len(generated_urls):
                        item["result_url"] = generated_urls[i]
                job.variation_results = _json.dumps(bundle)
            except Exception:
                pass

            result_url = generated_urls[0]
            job.result_url = result_url
            job.file_size = len(image_bytes)
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
        else:
            job.status = "failed"
            job.error_message = "Desain ditolak oleh sistem keamanan AI karena mengandung unsur yang dilindungi hak cipta (misal: nama tokoh terkenal, karakter kartun, atau brand spesifik seperti 'Avengers', 'Disney', dll) atau konten sensitif lainnya. Mohon ubah deskripsi Anda menggunakan kata-kata yang lebih umum."
            job.completed_at = datetime.now(timezone.utc)
            # Refund credit
            from app.services.credit_service import log_credit_change

            await log_credit_change(
                db, current_user, total_charged, "Refund: prompt ditolak AI"
            )

        await db.commit()
        await db.refresh(job)

        return {
            "job_id": str(job.id),
            "status": job.status,
            "message": f"Generated synchronously via {model_name}.",
        }

    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        from app.services.credit_service import log_credit_change

        await log_credit_change(
            db, current_user, total_charged, "Refund: sistem error"
        )
        await db.commit()
        raise InternalServerError(detail=f"Image generation failed: {str(e)}")


@router.post(
    "/redesign",
    response_model=dict,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Redesign from Image",
    description="Redesigns a reference image using Gemini Vision for style analysis and FLUX.2 for image generation.",
    responses=ERROR_RESPONSES,
)
async def redesign_image(
    request: RedesignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_dependency),
):
    """Redesigns an image using Gemini Vision and FLUX.2 Dev."""
    from app.core.credit_costs import COST_REDESIGN, COST_REDESIGN_ULTRA
    from app.core.exceptions import InsufficientCreditsError, InternalServerError
    from app.services.credit_service import log_credit_change
    from app.services.redesign_service import (
        analyze_reference_image,
        run_flux_redesign,
    )
    from app.services.image_service import build_gpt2_image_edit_args, run_gpt2_image_edit
    from app.services.storage_service import upload_image_tracked
    from datetime import datetime, timezone

    requested_quality = (getattr(request, "quality", "auto") or "auto").lower()
    if requested_quality == "standard":
        requested_quality = "pro"

    if requested_quality == "auto":
        selected_model_tier = default_model_tier_for_plan(current_user.plan_tier)
    else:
        selected_model_tier = requested_quality

    required_plan_by_tier = {
        "basic": "starter",
        "pro": "pro",
        "ultra": "business",
    }
    required_plan_tier = required_plan_by_tier.get(selected_model_tier, "starter")
    if not is_model_accessible(current_user.plan_tier, required_plan_tier):
        raise ValidationError(
            detail=f"Model tier '{selected_model_tier}' membutuhkan paket minimal {required_plan_tier}."
        )

    credit_cost = COST_REDESIGN_ULTRA if selected_model_tier == "ultra" else COST_REDESIGN

    if current_user.credits_remaining < credit_cost:
        raise InsufficientCreditsError(
            detail="Insufficient credits. Please upgrade or wait for a refill."
        )

    # Deduct credit
    await log_credit_change(
        db,
        current_user,
        -credit_cost,
        "Redesign gambar ultra" if selected_model_tier == "ultra" else "Redesign gambar",
    )

    # Create a job record in the database
    job = Job(
        raw_text=request.raw_text,
        aspect_ratio=request.aspect_ratio,
        style_preference=request.style_preference,
        reference_image_url=request.reference_image_url,
        user_id=current_user.id,
        status="processing",  # we do it synchronously but still record processing
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    try:
        # Step 1: Analyze reference image
        analysis = await analyze_reference_image(request.reference_image_url)

        # Build enriched prompt
        from app.services.prompt_builder import PromptBuilder

        style_key = (
            request.style_preference.value
            if request.style_preference
            else "auto"
        )

        # Load brand kit colors if specified
        brand_suffix = ""
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
                if kit and kit.colors:
                    colors = [c.get("hex") for c in kit.colors if c.get("hex")]
                    if colors:
                        brand_suffix = f"incorporate brand colors: {', '.join(colors)}"
            except Exception as e:
                import logging
                logging.warning(f"Could not load brand kit for redesign: {e}")

        enriched_prompt = PromptBuilder.build(
            visual_prompt=f"{request.raw_text} {analysis.suggested_prompt_suffix}".strip(),
            style_key=style_key,
            brand_suffix=brand_suffix,
            preserve_product=request.preserve_product,
        )

        # Step 2: Route redesign request to the selected model tier.
        if selected_model_tier == "ultra":
            ultra_result = await run_gpt2_image_edit(
                build_gpt2_image_edit_args(
                    prompt=enriched_prompt,
                    image_urls=[request.reference_image_url],
                )
            )
            result_url = ultra_result.get("images", [{}])[0].get("url")
            if not result_url:
                raise ValueError("No image URL returned from ultra redesign service")

            async with httpx.AsyncClient(timeout=30.0) as client:
                image_response = await client.get(result_url)
                image_response.raise_for_status()
                image_bytes = image_response.content
        else:
            image_bytes = await run_flux_redesign(
                image_url=request.reference_image_url,
                enriched_prompt=enriched_prompt,
                strength=request.strength,
                aspect_ratio=request.aspect_ratio.value,
            )

        if not image_bytes:
            raise ValueError("No image bytes returned from redesign service")

        # 2.5: Apply Brand Kit Logo if applicable
        if request.brand_kit_id:
            image_bytes = await _apply_brand_kit_logo_if_exists(
                db, current_user.id, request.brand_kit_id, image_bytes
            )

        # Step 3: Upload the result to storage
        result_url = await upload_image_tracked(
            image_bytes,
            user_id=current_user.id,
            db=db,
            content_type="image/jpeg",
            prefix="redesign",
        )

        # Update job success
        job.result_url = result_url
        job.file_size = len(image_bytes)
        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(job)

        return {
            "job_id": str(job.id),
            "status": job.status,
            "result_url": job.result_url,
            "message": "Redesign completed successfully.",
        }

    except Exception as e:
        import logging

        logging.exception(f"Redesign image failed: {e}")

        job.status = "failed"
        job.error_message = str(e)
        job.completed_at = datetime.now(timezone.utc)

        # Refund credit
        await log_credit_change(
            db,
            current_user,
            credit_cost,
            "Refund: sistem error pada redesign ultra"
            if selected_model_tier == "ultra"
            else "Refund: sistem error pada redesign",
        )
        await db.commit()

        raise InternalServerError(detail=f"Redesign failed: {str(e)}")
