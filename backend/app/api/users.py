from app.core.exceptions import AppException, NotFoundError, ValidationError, InsufficientCreditsError, UnauthorizedError, ForbiddenError, ConflictError, InternalServerError
from app.schemas.error import ERROR_RESPONSES
import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy import desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.credit_transaction import CreditTransaction
from app.models.job import Job
from app.models.user import User
from app.schemas.credit import CreditHistoryResponse
from app.schemas.user import UserUpdate, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/me", response_model=UserResponse, responses=ERROR_RESPONSES)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Returns the current user's profile and credits."""
    return current_user


@router.put("/me", response_model=UserResponse, responses=ERROR_RESPONSES)
async def update_my_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Updates the current user's profile."""
    if user_update.name is not None:
        current_user.name = user_update.name

    await db.commit()
    await db.refresh(current_user)
    logger.info("User %s updated profile", current_user.id)
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT, responses=ERROR_RESPONSES)
async def delete_my_account(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> None:
    """Deletes the current user's account and all related data."""
    user_id = current_user.id
    try:
        # Manually delete jobs (FK user_id has no ondelete CASCADE)
        jobs_result = await db.execute(select(Job).where(Job.user_id == user_id))
        for job in jobs_result.scalars().all():
            await db.delete(job)

        # Projects + DesignHistory will cascade via DB-level ondelete=CASCADE
        await db.delete(current_user)
        await db.commit()
        logger.info("User %s account deleted successfully", user_id)
    except Exception:
        await db.rollback()
        logger.exception("Failed to delete user %s", user_id)
        raise AppException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account. Please try again.",
        )
    return None


@router.get("/me/credits/history", response_model=CreditHistoryResponse, responses=ERROR_RESPONSES)
async def get_my_credit_history(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns the user's credit transaction history."""
    query = (
        select(CreditTransaction)
        .where(CreditTransaction.user_id == current_user.id)
        .order_by(desc(CreditTransaction.created_at))
    )

    result = await db.execute(query.offset(offset).limit(limit))
    transactions = result.scalars().all()

    # Get total count
    count_query = select(func.count()).where(
        CreditTransaction.user_id == current_user.id
    )
    count_result = await db.execute(count_query)
    total_count = count_result.scalar_one()

    return CreditHistoryResponse(transactions=transactions, total_count=total_count)


@router.get("/me/storage", responses=ERROR_RESPONSES)
async def get_my_storage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns the current user's storage usage and quota."""
    from app.services.storage_quota_service import get_storage_stats

    return await get_storage_stats(current_user.id, db)
