"""Design export event tracking API."""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.design_export_service import log_design_export
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/designs", tags=["designs-exports"])


class ExportEventRequest:
    """Request body for logging export event."""

    def __init__(self, export_format: str, target_platform: str | None = None):
        self.export_format = export_format
        self.target_platform = target_platform


@router.post("/{design_id}/export-event", status_code=status.HTTP_201_CREATED)
async def log_export_event(
    design_id: UUID,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log a design export event.

    This endpoint records when a user exports a design, enabling backend-owned
    measurement of the generation-to-export funnel without dependency on user
    feedback submission.

    Request body:
    {
        "export_format": "png|jpg|pdf|etc",
        "target_platform": "shopee|tokopedia|etc|null",
        "job_id": "uuid|null"
    }

    Returns:
        {"export_id": "uuid", "success": true, "message": "Export logged"}
    """
    export_format = body.get("export_format")
    target_platform = body.get("target_platform")
    job_id = body.get("job_id")

    if not export_format:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="export_format is required",
        )

    try:
        export = await log_design_export(
            user_id=current_user.id,
            design_id=design_id,
            export_format=export_format,
            target_platform=target_platform,
            job_id=UUID(job_id) if job_id else None,
            success=True,
            db=db,
        )

        await db.commit()

        return {
            "export_id": str(export.id),
            "success": True,
            "message": f"Export logged as {export_format}",
        }
    except Exception as exc:
        logger.error(
            "export_event.error design_id=%s user_id=%s error=%s",
            design_id,
            current_user.id,
            str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to log export event",
        ) from exc
