from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import AppException
from app.schemas.error import ERROR_RESPONSES
from app.schemas.storage_payment import (
    MidtransNotification,
    StorageWebhookRequest,
    StorageWebhookResponse,
)
from app.services.storage_payment_service import (
    process_midtrans_notification,
    process_webhook_event,
    verify_webhook_signature,
)

router = APIRouter(tags=["Storage Payments"])


@router.post(
    "/storage/webhook",
    response_model=StorageWebhookResponse,
    status_code=status.HTTP_200_OK,
    summary="Handle internal storage payment webhook",
    description="Processes HMAC-signed internal storage payment webhook callbacks.",
    responses=ERROR_RESPONSES,
)
async def handle_storage_payment_webhook(
    payload: StorageWebhookRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    raw_body = await request.body()
    signature = request.headers.get("X-Storage-Signature")
    verify_webhook_signature(raw_body, signature)

    purchase, already_processed = await process_webhook_event(
        event_id=payload.event_id,
        purchase_id=payload.purchase_id,
        status=payload.status,
        provider_txn_id=payload.provider_txn_id,
        db=db,
    )

    return StorageWebhookResponse(
        accepted=True,
        already_processed=already_processed,
        purchase_id=purchase.id,
        status=purchase.status,
    )


@router.post(
    "/storage/midtrans/notification",
    response_model=StorageWebhookResponse,
    status_code=status.HTTP_200_OK,
    summary="Handle Midtrans payment notification",
    description=(
        "Processes payment notifications from Midtrans. "
        "Signature is validated using SHA512(order_id+status_code+gross_amount+server_key)."
    ),
    responses=ERROR_RESPONSES,
)
async def handle_midtrans_notification(
    notification: MidtransNotification,
    db: AsyncSession = Depends(get_db),
):
    if not settings.STORAGE_PAYMENT_ENABLED:
        raise AppException(status_code=503, detail="Storage payment processing is disabled.")

    purchase, already_processed = await process_midtrans_notification(
        notification=notification,
        db=db,
    )

    return StorageWebhookResponse(
        accepted=True,
        already_processed=already_processed,
        purchase_id=purchase.id,
        status=purchase.status,
    )
