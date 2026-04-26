from app.core.exceptions import AppException
from app.schemas.error import ERROR_RESPONSES
import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy import desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.credit_transaction import CreditTransaction
from app.models.user import User
from app.schemas.credit import CreditHistoryResponse
from app.schemas.storage_payment import (
    StorageAddon,
    StorageAddonListResponse,
    StoragePurchaseIntentRequest,
    StoragePurchaseIntentResponse,
    StoragePurchaseListResponse,
)
from app.schemas.user import UserUpdate, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Users"])


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get My Profile",
    description="Returns the currently authenticated user's profile and credits.",
    responses=ERROR_RESPONSES,
)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Returns the current user's profile and credits."""
    return current_user


@router.put(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update My Profile",
    description="Updates the currently authenticated user's profile information.",
    responses=ERROR_RESPONSES,
)
async def update_my_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates the current user's profile.
    Currently supports updating the user's name.
    """
    if user_update.name is not None:
        current_user.name = user_update.name

    await db.commit()
    await db.refresh(current_user)
    logger.info("User %s updated profile", current_user.id)
    return current_user


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete My Account",
    description="Deletes the currently authenticated user's account and all related data.",
    responses=ERROR_RESPONSES,
)
async def delete_my_account(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> None:
    """
    Deletes the current user's account and all related data.
    Relies on database cascade rules for owned records.
    """
    user_id = current_user.id
    try:
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


@router.get(
    "/me/credits/history",
    response_model=CreditHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Credit History",
    description="Returns the current user's credit transaction history.",
    responses=ERROR_RESPONSES,
)
async def get_my_credit_history(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the user's credit transaction history with pagination.
    Orders history by descending creation date.
    """
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


@router.get(
    "/me/storage",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Get Storage Info",
    description="Returns the current user's storage usage and quota.",
    responses=ERROR_RESPONSES,
)
async def get_my_storage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the current user's storage usage and quota by calculating file uploads.
    """
    from app.services.storage_quota_service import get_storage_stats

    return await get_storage_stats(current_user.id, db)


@router.post(
    "/me/recalculate-storage",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Recalculate Storage Usage",
    description=(
        "Recalculates the user's storage_used from actual DB records "
        "(ai_tool_results + jobs). Use this to fix drift caused by "
        "failed deletions or missing decrements."
    ),
    responses=ERROR_RESPONSES,
)
async def recalculate_my_storage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reconcile storage_used against actual stored file sizes.
    Safe to call at any time — idempotent.
    """
    from app.services.storage_quota_service import (
        recalculate_storage,
        get_storage_stats,
    )

    await recalculate_storage(current_user.id, db)
    return await get_storage_stats(current_user.id, db)


@router.get(
    "/me/storage/addons",
    response_model=StorageAddonListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Storage Addon Catalog",
    description="Returns available storage addon packages for the current user.",
    responses=ERROR_RESPONSES,
)
async def get_my_storage_addons(
    current_user: User = Depends(get_current_user),
):
    from app.services.storage_payment_service import get_addon_catalog

    _ = current_user
    catalog = get_addon_catalog()
    items = [
        StorageAddon(
            code=code,
            label=str(data.get("label", code)),
            bytes_added=int(data.get("bytes_added", 0)),
            amount=int(data.get("amount", 0)),
            currency=str(data.get("currency", "IDR")),
        )
        for code, data in catalog.items()
    ]

    return StorageAddonListResponse(items=items)


@router.post(
    "/me/storage/purchase-intent",
    response_model=StoragePurchaseIntentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Storage Purchase Intent",
    description="Creates a pending storage addon purchase and returns checkout URL.",
    responses=ERROR_RESPONSES,
)
async def create_my_storage_purchase_intent(
    payload: StoragePurchaseIntentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.storage_payment_service import create_purchase_intent

    purchase = await create_purchase_intent(
        user_id=current_user.id,
        addon_code=payload.addon_code,
        db=db,
    )

    return StoragePurchaseIntentResponse(
        purchase_id=purchase.id,
        status=purchase.status,
        checkout_url=purchase.checkout_url or "/settings?upgrade=storage",
        addon_code=purchase.addon_code,
        bytes_added=purchase.bytes_added,
        amount=purchase.amount,
        currency=purchase.currency,
    )


@router.get(
    "/me/storage/purchases",
    response_model=StoragePurchaseListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Storage Purchase History",
    description="Returns the current user's storage purchase history.",
    responses=ERROR_RESPONSES,
)
async def get_my_storage_purchases(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.storage_payment_service import list_purchases

    items, total_count = await list_purchases(
        user_id=current_user.id,
        db=db,
        limit=limit,
        offset=offset,
    )

    return StoragePurchaseListResponse(items=items, total_count=total_count)
