"""Catalog render async job executor."""

from __future__ import annotations

import base64
import logging
import os
import shutil
import tempfile
import zipfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.database import AsyncSessionLocal
from app.models.ai_tool_job import AiToolJob
from app.models.ai_tool_result import AiToolResult
from app.services.image_service import generate_background
from app.services.storage_service import download_image, upload_image
from app.workers.ai_tool_jobs_common import (
    refund_ai_tool_job_if_needed,
    set_ai_tool_job_canceled,
)

logger = logging.getLogger(__name__)

# 1x1 transparent PNG fallback.
_FALLBACK_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAukB9VE3q4kAAAAASUVORK5CYII="
)

# ---------------------------------------------------------------------------
# Prompt building helpers
# ---------------------------------------------------------------------------

_PAGE_TYPE_DESCRIPTIONS: Dict[str, str] = {
    "cover": "professional catalog cover with bold brand identity and strong visual impact",
    "hero": "full-bleed hero spread with prominent product or service showcase",
    "grid": "product grid layout with clean product photography and minimal background",
    "text-image": "editorial spread with balanced text and product imagery",
    "contact-cta": "closing call-to-action page with contact details, clean and professional",
    "split-content": "split layout with contrasting image and text sections",
    "product-detail": "detailed product page with clear product photography",
    "testimonial": "customer testimonial page with trust-building visual elements",
    "about": "brand story page with authentic and professional aesthetic",
    "promo": "promotional page with sale or offer highlights, vibrant and attention-grabbing",
}

_LAYOUT_MODIFIERS: Dict[str, str] = {
    "hero": "full-width hero composition",
    "grid": "multi-column product grid",
    "text-image": "balanced text-image split",
    "split-content": "left-right split composition",
    "contact-cta": "centered CTA with whitespace",
}

_TONE_STYLES: Dict[str, str] = {
    "formal": "corporate, professional, clean, minimalist",
    "fun": "playful, colorful, energetic, vibrant",
    "premium": "luxury, elegant, sophisticated, high-end",
    "soft_selling": "warm, approachable, lifestyle-oriented",
}


def _build_page_visual_prompt(
    page: Dict[str, Any],
    catalog_type: str,
    style: str,
    tone: str,
) -> str:
    """Build a visual generation prompt for a single catalog page."""
    page_type = str(page.get("type") or "cover").strip()
    layout = str(page.get("layout") or "hero").strip()
    content = page.get("content") or {}
    title = str(content.get("title") or "").strip()

    type_desc = _PAGE_TYPE_DESCRIPTIONS.get(page_type, f"{page_type} catalog page layout")
    layout_mod = _LAYOUT_MODIFIERS.get(layout, f"{layout} layout")
    tone_style = _TONE_STYLES.get(tone, "professional")
    type_context = "product photography, e-commerce" if catalog_type == "product" else "service illustration, corporate"

    parts = [type_desc, layout_mod, tone_style, type_context]
    if title:
        parts.append(f'themed for "{title}"')

    prompt = (
        "catalog page background visual: "
        + ", ".join(parts)
        + ", copy space for text overlay, no text, professional graphic design quality"
    )
    return prompt


async def _save_progress(
    job_id: str,
    *,
    status: str,
    phase_message: str,
    progress_percent: int,
    result_meta: Dict[str, Any],
) -> None:
    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            return

        payload = dict(job.payload_json or {})
        payload["_result_meta"] = result_meta

        job.status = status
        job.phase_message = phase_message
        job.progress_percent = progress_percent
        job.payload_json = payload
        if status == "processing" and not job.started_at:
            job.started_at = datetime.now(timezone.utc)

        session.add(job)
        await session.commit()


def _write_page_to_tempfile(page_bytes: bytes, page_number: int, tmpdir: str) -> str:
    """Write page bytes to disk tempfile and return the file path.

    Using NamedTemporaryFile(delete=False) so the file survives after
    the context manager closes. Cleanup is done by the caller via
    shutil.rmtree on the tmpdir.
    """
    filepath = os.path.join(tmpdir, f"page-{page_number:02d}.png")
    with open(filepath, "wb") as f:
        f.write(page_bytes)
    return filepath


async def execute_catalog_render_tool_job(job_id: str) -> None:
    async with AsyncSessionLocal() as session:
        job = await session.get(AiToolJob, job_id)
        if not job:
            raise RuntimeError("Catalog render job not found")

        if job.cancel_requested:
            await set_ai_tool_job_canceled(session, job, "Refund: job catalog render dibatalkan")
            await session.commit()
            return

        payload = dict(job.payload_json or {})
        final_plan = payload.get("final_plan") or {}
        options = payload.get("options") or {}
        pages = final_plan.get("pages") or []
        total_pages = int(final_plan.get("total_pages") or len(pages) or 0)

        if total_pages <= 0:
            raise ValueError("Catalog final_plan has no pages to render")

    result_meta: Dict[str, Any] = {
        "total_pages": total_pages,
        "completed_pages": 0,
        "pages": [],
        "zip_url": None,
    }

    await _save_progress(
        job_id,
        status="processing",
        phase_message="Menyiapkan render katalog",
        progress_percent=5,
        result_meta=result_meta,
    )

    reference_image_url: Optional[str] = str(options.get("reference_image_url") or "").strip() or None
    aspect_ratio = str(options.get("aspect_ratio") or "1:1").strip()
    quality_mode = str(options.get("quality_mode") or "standard").strip()

    catalog_type = str(final_plan.get("catalog_type") or "product")
    style = str(final_plan.get("style") or "auto")
    tone = str(final_plan.get("tone") or "formal")

    # Pre-download reference image bytes as fallback source (used if AI generation fails)
    fallback_source_bytes = _FALLBACK_PNG_BYTES
    if reference_image_url:
        try:
            fallback_source_bytes = await download_image(reference_image_url)
        except Exception as dl_err:
            logger.warning(f"[catalog_render:{job_id}] Could not download reference image: {dl_err}")
            reference_image_url = None

    # For draft quality, skip reference to speed up generation
    effective_reference_url = reference_image_url if quality_mode != "draft" else None

    rendered_pages: List[Dict[str, Any]] = []
    # Store page_number -> tempfile path to avoid keeping all bytes in RAM.
    page_file_map: Dict[int, str] = {}
    tmpdir = tempfile.mkdtemp(prefix="catalog_render_")

    try:
        for index in range(1, total_pages + 1):
            async with AsyncSessionLocal() as session:
                live_job = await session.get(AiToolJob, job_id)
                if not live_job:
                    return
                if live_job.cancel_requested:
                    await set_ai_tool_job_canceled(session, live_job, "Refund: job catalog render dibatalkan")
                    await session.commit()
                    return

            page_data = pages[index - 1] if index <= len(pages) else {}

            page_status: Dict[str, Any] = {
                "page_number": index,
                "status": "processing",
                "result_url": None,
                "fallback_used": False,
                "error_message": None,
            }

            # --- Attempt real AI generation ---
            ai_success = False
            try:
                visual_prompt = _build_page_visual_prompt(
                    page=page_data,
                    catalog_type=catalog_type,
                    style=style,
                    tone=tone,
                )
                logger.info(
                    f"[catalog_render:{job_id}] Page {index}/{total_pages}: "
                    f"generating with prompt={visual_prompt[:80]}..."
                )

                gen_result = await generate_background(
                    visual_prompt=visual_prompt,
                    reference_image_url=effective_reference_url,
                    style=style,
                    aspect_ratio=aspect_ratio,
                    integrated_text=False,
                )

                page_bytes = await download_image(gen_result["image_url"])
                page_url = await upload_image(
                    page_bytes,
                    key=f"catalog_render/{job_id}/page-{index:02d}.png",
                    content_type="image/png",
                    prefix="catalog_render",
                )

                page_status["result_url"] = page_url
                page_status["status"] = "completed"
                page_status["fallback_used"] = False
                page_file_map[index] = _write_page_to_tempfile(page_bytes, index, tmpdir)
                ai_success = True

            except Exception as ai_err:
                logger.warning(f"[catalog_render:{job_id}] Page {index} AI generation failed: {ai_err}")

            # --- Fallback: use reference image or transparent PNG ---
            if not ai_success:
                try:
                    page_url = await upload_image(
                        fallback_source_bytes,
                        key=f"catalog_render/{job_id}/page-{index:02d}.png",
                        content_type="image/png",
                        prefix="catalog_render",
                    )
                    page_status["result_url"] = page_url
                    page_status["status"] = "fallback"
                    page_status["fallback_used"] = True
                    page_file_map[index] = _write_page_to_tempfile(fallback_source_bytes, index, tmpdir)
                except Exception as upload_err:
                    page_status["status"] = "failed"
                    page_status["error_message"] = str(upload_err)

            rendered_pages.append(page_status)

            completed_pages = len([p for p in rendered_pages if p.get("result_url")])
            progress = 10 + int((index / total_pages) * 80)
            result_meta = {
                "total_pages": total_pages,
                "completed_pages": completed_pages,
                "pages": rendered_pages,
                "zip_url": None,
            }

            await _save_progress(
                job_id,
                status="processing",
                phase_message=f"Render halaman {index}/{total_pages}",
                progress_percent=min(progress, 95),
                result_meta=result_meta,
            )

        successful_pages = [p for p in rendered_pages if p.get("result_url")]
        if not successful_pages:
            async with AsyncSessionLocal() as session:
                failed_job = await session.get(AiToolJob, job_id)
                if not failed_job:
                    return

                failed_job.status = "failed"
                failed_job.error_message = "Seluruh halaman katalog gagal dirender"
                failed_job.phase_message = "Render katalog gagal"
                failed_job.progress_percent = 100
                failed_job.finished_at = datetime.now(timezone.utc)
                failed_job.payload_json = dict(failed_job.payload_json or {})
                failed_job.payload_json["_result_meta"] = {
                    "total_pages": total_pages,
                    "completed_pages": 0,
                    "pages": rendered_pages,
                    "zip_url": None,
                }
                session.add(failed_job)
                await refund_ai_tool_job_if_needed(
                    session,
                    failed_job,
                    reason="Refund: seluruh halaman catalog render gagal",
                )
                await session.commit()
            return

        # Build ZIP from tempfiles on disk (minimises RAM usage).
        zip_path = os.path.join(tmpdir, "catalog-pages.zip")
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for page in successful_pages:
                page_number = int(page.get("page_number") or 0)
                if page_number <= 0:
                    continue
                src_path = page_file_map.get(page_number)
                if src_path and os.path.isfile(src_path):
                    zip_file.write(src_path, arcname=f"page-{page_number:02d}.png")

        # Read final ZIP from disk (only one file at a time — small).
        with open(zip_path, "rb") as f:
            zip_bytes = f.read()

        zip_url = await upload_image(
            zip_bytes,
            key=f"catalog_render/{job_id}/catalog-pages.zip",
            content_type="application/zip",
            prefix="catalog_render",
        )

        async with AsyncSessionLocal() as session:
            job = await session.get(AiToolJob, job_id)
            if not job:
                return

            if job.cancel_requested:
                await set_ai_tool_job_canceled(session, job, "Refund: job catalog render dibatalkan")
                await session.commit()
                return

            payload = dict(job.payload_json or {})
            payload["_result_meta"] = {
                "total_pages": total_pages,
                "completed_pages": len(successful_pages),
                "pages": rendered_pages,
                "zip_url": zip_url,
            }

            session.add(
                AiToolResult(
                    user_id=job.user_id,
                    tool_name="catalog_render",
                    result_url=zip_url,
                    file_size=len(zip_bytes),
                    input_summary=f"Catalog pages: {total_pages}",
                )
            )

            job.status = "completed"
            job.result_url = zip_url
            job.phase_message = "Render katalog selesai"
            job.progress_percent = 100
            job.finished_at = datetime.now(timezone.utc)
            job.payload_json = payload
            session.add(job)
            await session.commit()

    finally:
        # Always clean up temp files, even on early return / exception.
        try:
            shutil.rmtree(tmpdir, ignore_errors=True)
        except Exception:
            pass
