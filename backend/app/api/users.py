import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user
from app.models.user import User
from app.models.job import Job
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.schemas.user import UserUpdate, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Returns the current user's profile and credits."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates the current user's profile."""
    if user_update.name is not None:
        current_user.name = user_update.name

    await db.commit()
    await db.refresh(current_user)
    logger.info("User %s updated profile", current_user.id)
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account. Please try again."
        )
    return None

