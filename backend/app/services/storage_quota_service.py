"""
Storage quota management service.

Provides helpers for checking, incrementing, and decrementing
per-user storage usage against their quota.
"""

from __future__ import annotations

from fastapi import status

from app.core.exceptions import AppException
from sqlalchemy import update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.user import User


async def estimate_file_size(url: str) -> int:
    """Use HEAD request to get file size without downloading."""
    if not url:
        return 0
    import httpx
    import logging

    try:
        async with httpx.AsyncClient() as client:
            r = await client.head(url, follow_redirects=True, timeout=5.0)
            return int(r.headers.get("content-length", 0))
    except Exception as e:
        logging.getLogger(__name__).warning(
            f"Failed to estimate file size for {url}: {e}"
        )
        return 0


async def get_storage_stats(user_id, db: AsyncSession) -> dict:
    """Return current storage usage stats for a user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise AppException(status_code=404, detail="User not found")

    used = user.storage_used or 0
    quota = user.storage_quota or 0
    percentage = round((used / quota) * 100, 1) if quota > 0 else 0

    return {
        "used": used,
        "quota": quota,
        "percentage": min(percentage, 100.0),
        "used_mb": round(used / (1024 * 1024), 2),
        "quota_mb": round(quota / (1024 * 1024), 2),
    }


async def check_quota(user_id, incoming_size: int, db: AsyncSession) -> None:
    """
    Check if the user has enough storage quota for the incoming file.
    Raises HTTP 413 if quota would be exceeded.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise AppException(status_code=404, detail="User not found")

    used = user.storage_used or 0
    quota = user.storage_quota or 0

    if used + incoming_size > quota:
        used_mb = round(used / (1024 * 1024), 1)
        quota_mb = round(quota / (1024 * 1024), 1)
        raise AppException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"Storage penuh. Anda sudah menggunakan {used_mb} MB "
                f"dari {quota_mb} MB. Hapus file lama atau upgrade plan."
            ),
        )


async def increment_usage(user_id, file_size: int, db: AsyncSession) -> None:
    """Atomically increment the user's storage_used."""
    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(storage_used=User.storage_used + file_size)
    )
    await db.commit()


async def decrement_usage(user_id, file_size: int, db: AsyncSession) -> None:
    """Atomically decrement the user's storage_used (floor at 0)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return

    current = user.storage_used or 0
    new_value = max(0, current - file_size)
    await db.execute(
        update(User).where(User.id == user_id).values(storage_used=new_value)
    )
    await db.commit()


async def recalculate_storage(user_id, db: AsyncSession) -> int:
    """
    Recalculate a user's storage_used from the sum of all stored file_size
    values across ai_tool_results and jobs.

    Updates the user record and returns the new storage_used value.
    This is the authoritative reconciliation mechanism for correcting drift.
    """
    from app.models.ai_tool_result import AiToolResult
    from app.models.job import Job

    ai_result = await db.execute(
        select(func.coalesce(func.sum(AiToolResult.file_size), 0)).where(
            AiToolResult.user_id == user_id
        )
    )
    ai_total: int = ai_result.scalar()

    job_result = await db.execute(
        select(func.coalesce(func.sum(Job.file_size), 0)).where(Job.user_id == user_id)
    )
    job_total: int = job_result.scalar()

    total = ai_total + job_total

    await db.execute(update(User).where(User.id == user_id).values(storage_used=total))
    await db.commit()

    return total
