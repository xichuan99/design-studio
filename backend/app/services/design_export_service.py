"""Service for logging and tracking design exports."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.design_export import DesignExport

logger = logging.getLogger(__name__)


async def log_design_export(
    user_id: UUID,
    design_id: UUID,
    export_format: str,
    target_platform: str | None = None,
    job_id: UUID | None = None,
    success: bool = True,
    error_message: str | None = None,
    db: AsyncSession | None = None,
) -> DesignExport:
    """Log a design export event.

    Args:
        user_id: ID of user performing export
        design_id: ID of design being exported
        export_format: Format (png, jpg, pdf, etc.)
        target_platform: Optional platform (shopee, tokopedia, etc.)
        job_id: Optional AI job ID if export was from generation
        success: Whether export succeeded
        error_message: Error message if export failed
        db: Database session (required)

    Returns:
        DesignExport record
    """
    if db is None:
        raise ValueError("db session is required")

    export = DesignExport(
        user_id=user_id,
        design_id=design_id,
        job_id=job_id,
        export_format=export_format,
        target_platform=target_platform,
        success=success,
        error_message=error_message,
        created_at=datetime.now(timezone.utc),
    )

    db.add(export)
    await db.flush()

    logger.info(
        "design.export.logged user_id=%s design_id=%s format=%s success=%s",
        user_id,
        design_id,
        export_format,
        success,
    )

    return export


async def count_first_export_by_user_since(
    db: AsyncSession,
    since: datetime | None = None,
) -> dict[UUID, datetime]:
    """Count users with at least one successful export since date.

    Returns dict of user_id -> first_export_created_at
    """
    query = select(
        DesignExport.user_id,
        func.min(DesignExport.created_at).label("first_export_at"),
    ).where(DesignExport.success.is_(True))

    if since:
        query = query.where(DesignExport.created_at >= since)

    query = query.group_by(DesignExport.user_id)

    result = await db.execute(query)
    rows = result.all()

    return {row[0]: row[1] for row in rows}


async def count_total_exports_by_status_since(
    db: AsyncSession,
    since: datetime | None = None,
) -> dict[str, int]:
    """Count total exports by success/failure since date."""
    query = select(
        DesignExport.success,
        func.count(DesignExport.id).label("count"),
    )

    if since:
        query = query.where(DesignExport.created_at >= since)

    query = query.group_by(DesignExport.success)

    result = await db.execute(query)
    rows = result.all()

    return {
        "successful": next((row[1] for row in rows if row[0] is True), 0),
        "failed": next((row[1] for row in rows if row[0] is False), 0),
    }
