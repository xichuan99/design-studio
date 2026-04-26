from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import httpx
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppException
from app.models.storage_purchase import StoragePurchase
from app.models.storage_quota_ledger import StorageQuotaLedger
from app.models.user import User
from app.schemas.storage_payment import MidtransNotification

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Addon catalog
# ---------------------------------------------------------------------------

def _default_addon_catalog() -> dict[str, dict[str, int | str]]:
    return {
        "storage_plus_5gb": {
            "label": "Storage +5 GB",
            "bytes_added": 5 * 1024 * 1024 * 1024,
            "amount": 49000,
            "currency": "IDR",
        },
        "storage_plus_20gb": {
            "label": "Storage +20 GB",
            "bytes_added": 20 * 1024 * 1024 * 1024,
            "amount": 149000,
            "currency": "IDR",
        },
    }


def get_addon_catalog() -> dict[str, dict[str, int | str]]:
    raw = settings.STORAGE_ADDON_CATALOG_JSON
    if not raw:
        return _default_addon_catalog()

    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            return _default_addon_catalog()
        return parsed
    except Exception:
        return _default_addon_catalog()


# ---------------------------------------------------------------------------
# Midtrans helpers
# ---------------------------------------------------------------------------

def _midtrans_base_url() -> str:
    if settings.MIDTRANS_IS_PRODUCTION:
        return "https://app.midtrans.com/snap/v1"
    return "https://app.sandbox.midtrans.com/snap/v1"


def _midtrans_api_base_url() -> str:
    if settings.MIDTRANS_IS_PRODUCTION:
        return "https://api.midtrans.com/v2"
    return "https://api.sandbox.midtrans.com/v2"


def _midtrans_auth_header() -> str:
    """Basic auth: base64(server_key:)"""
    token = base64.b64encode(f"{settings.MIDTRANS_SERVER_KEY}:".encode()).decode()
    return f"Basic {token}"


async def _midtrans_create_snap_transaction(
    order_id: str,
    gross_amount: int,
    customer_name: Optional[str] = None,
) -> dict:
    """Call Midtrans Snap API to create a payment transaction.
    Returns response dict with 'token' and 'redirect_url'.
    """
    payload = {
        "transaction_details": {
            "order_id": order_id,
            "gross_amount": gross_amount,
        },
        "credit_card": {"secure": True},
    }
    if customer_name:
        payload["customer_details"] = {"first_name": customer_name}

    url = f"{_midtrans_base_url()}/transactions"
    headers = {
        "Authorization": _midtrans_auth_header(),
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()
        except httpx.TimeoutException:
            logger.error("midtrans.snap.timeout order_id=%s", order_id)
            raise AppException(status_code=503, detail="Payment provider timeout. Please try again.")
        except httpx.HTTPStatusError as exc:
            logger.error(
                "midtrans.snap.error order_id=%s status=%s body=%s",
                order_id,
                exc.response.status_code,
                exc.response.text[:200],
            )
            raise AppException(status_code=502, detail="Payment provider error. Please try again.")


async def midtrans_check_transaction_status(order_id: str) -> dict:
    """Query Midtrans transaction status for reconciliation."""
    url = f"{_midtrans_api_base_url()}/{order_id}/status"
    headers = {
        "Authorization": _midtrans_auth_header(),
        "Accept": "application/json",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.json()
        except httpx.TimeoutException:
            logger.error("midtrans.status.timeout order_id=%s", order_id)
            raise AppException(status_code=503, detail="Payment provider timeout.")
        except httpx.HTTPStatusError as exc:
            logger.error(
                "midtrans.status.error order_id=%s status=%s body=%s",
                order_id,
                exc.response.status_code,
                exc.response.text[:200],
            )
            raise AppException(status_code=502, detail="Payment provider error.")


# ---------------------------------------------------------------------------
# Signature / verification
# ---------------------------------------------------------------------------

def sign_webhook_payload(raw_body: bytes) -> str:
    """HMAC-SHA256 signature for internal webhook (non-Midtrans)."""
    secret = settings.STORAGE_WEBHOOK_SECRET
    if not secret:
        return ""

    digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return digest


def verify_webhook_signature(raw_body: bytes, signature: Optional[str]) -> None:
    """Verify internal HMAC-SHA256 webhook signature."""
    if not settings.STORAGE_WEBHOOK_SECRET:
        raise AppException(status_code=500, detail="Webhook secret is not configured")

    if not signature:
        raise AppException(status_code=401, detail="Missing webhook signature")

    expected = sign_webhook_payload(raw_body)
    if not hmac.compare_digest(expected, signature):
        raise AppException(status_code=401, detail="Invalid webhook signature")


def verify_midtrans_signature(notification: MidtransNotification) -> None:
    """
    Verify Midtrans notification signature.
    Formula: SHA512(order_id + status_code + gross_amount + server_key)
    """
    if not settings.MIDTRANS_SERVER_KEY:
        raise AppException(status_code=500, detail="Midtrans server key is not configured")

    raw = (
        notification.order_id
        + notification.status_code
        + notification.gross_amount
        + settings.MIDTRANS_SERVER_KEY
    )
    expected = hashlib.sha512(raw.encode("utf-8")).hexdigest()
    if not hmac.compare_digest(expected, notification.signature_key):
        logger.warning(
            "midtrans.signature.invalid order_id=%s", notification.order_id
        )
        raise AppException(status_code=401, detail="Invalid Midtrans notification signature")


def midtrans_status_to_purchase_status(transaction_status: str, fraud_status: Optional[str] = None) -> str:
    """Map Midtrans transaction_status to internal purchase status."""
    if transaction_status in ("capture", "settlement"):
        if fraud_status and fraud_status == "challenge":
            return "pending"
        return "paid"
    if transaction_status in ("deny", "cancel"):
        return "canceled"
    if transaction_status == "expire":
        return "expired"
    if transaction_status == "failure":
        return "failed"
    return "pending"


# ---------------------------------------------------------------------------
# Purchase intent
# ---------------------------------------------------------------------------

async def create_purchase_intent(
    user_id: UUID,
    addon_code: str,
    db: AsyncSession,
    customer_name: Optional[str] = None,
) -> StoragePurchase:
    catalog = get_addon_catalog()
    addon = catalog.get(addon_code)
    if not addon:
        raise AppException(status_code=422, detail="Invalid storage addon code")

    purchase = StoragePurchase(
        user_id=user_id,
        addon_code=addon_code,
        bytes_added=int(addon["bytes_added"]),
        amount=int(addon["amount"]),
        currency=str(addon.get("currency", "IDR")),
        provider="midtrans" if settings.MIDTRANS_SERVER_KEY else "manual",
        status="pending",
    )
    db.add(purchase)
    await db.flush()  # get purchase.id

    if settings.MIDTRANS_SERVER_KEY:
        # Use purchase.id as Midtrans order_id for traceability
        order_id = str(purchase.id)
        snap_resp = await _midtrans_create_snap_transaction(
            order_id=order_id,
            gross_amount=int(addon["amount"]),
            customer_name=customer_name,
        )
        purchase.checkout_url = snap_resp.get("redirect_url", "")
        purchase.provider_txn_id = order_id
        logger.info(
            "midtrans.snap.created purchase_id=%s order_id=%s",
            purchase.id,
            order_id,
        )
    else:
        # Fallback for local dev without Midtrans key
        checkout_base = settings.STORAGE_CHECKOUT_URL_BASE.rstrip("/")
        purchase.checkout_url = (
            f"{checkout_base}?purchase_id={purchase.id}"
            if checkout_base
            else f"/settings?upgrade=storage&purchase_id={purchase.id}"
        )

    await db.commit()
    await db.refresh(purchase)
    return purchase


# ---------------------------------------------------------------------------
# Purchase listing
# ---------------------------------------------------------------------------

async def list_purchases(
    user_id: UUID,
    db: AsyncSession,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[StoragePurchase], int]:
    query = (
        select(StoragePurchase)
        .where(StoragePurchase.user_id == user_id)
        .order_by(desc(StoragePurchase.created_at))
    )
    result = await db.execute(query.offset(offset).limit(limit))
    items = list(result.scalars().all())

    count_query = select(func.count()).select_from(StoragePurchase).where(
        StoragePurchase.user_id == user_id
    )
    count_result = await db.execute(count_query)
    total = count_result.scalar_one()

    return items, total


# ---------------------------------------------------------------------------
# Webhook fulfillment (idempotent, row-locked)
# ---------------------------------------------------------------------------

async def process_webhook_event(
    event_id: str,
    purchase_id: UUID,
    status: str,
    provider_txn_id: Optional[str],
    db: AsyncSession,
) -> tuple[StoragePurchase, bool]:
    """
    Idempotent purchase fulfillment.
    Uses SELECT FOR UPDATE to prevent race conditions from parallel webhook calls.
    Returns (purchase, already_processed).
    """
    purchase_result = await db.execute(
        select(StoragePurchase)
        .where(StoragePurchase.id == purchase_id)
        .with_for_update()
    )
    purchase = purchase_result.scalar_one_or_none()
    if not purchase:
        raise AppException(status_code=404, detail="Storage purchase not found")

    # Idempotency: same event already processed
    if purchase.paid_event_id == event_id:
        logger.info(
            "storage.webhook.duplicate_event purchase_id=%s event_id=%s",
            purchase_id,
            event_id,
        )
        return purchase, True

    # Already paid by a different event
    if purchase.status == "paid" and status == "paid":
        logger.info(
            "storage.webhook.already_paid purchase_id=%s",
            purchase_id,
        )
        return purchase, True

    purchase.provider_txn_id = provider_txn_id or purchase.provider_txn_id

    if status != "paid":
        purchase.status = status
        await db.commit()
        await db.refresh(purchase)
        logger.info(
            "storage.webhook.status_update purchase_id=%s status=%s",
            purchase_id,
            status,
        )
        return purchase, False

    # Fulfill paid purchase
    user_result = await db.execute(select(User).where(User.id == purchase.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise AppException(status_code=404, detail="User not found")

    user.storage_quota = (user.storage_quota or 0) + purchase.bytes_added

    purchase.status = "paid"
    purchase.paid_event_id = event_id
    purchase.paid_at = datetime.now(timezone.utc)

    ledger = StorageQuotaLedger(
        user_id=user.id,
        purchase_id=purchase.id,
        delta_bytes=purchase.bytes_added,
        reason="storage_addon_purchase",
        source_ref=provider_txn_id or event_id,
    )
    db.add(ledger)

    await db.commit()
    await db.refresh(purchase)

    logger.info(
        "storage.webhook.fulfilled purchase_id=%s bytes_added=%s user_id=%s",
        purchase_id,
        purchase.bytes_added,
        user.id,
    )
    return purchase, False


# ---------------------------------------------------------------------------
# Midtrans notification processing
# ---------------------------------------------------------------------------

async def process_midtrans_notification(
    notification: MidtransNotification,
    db: AsyncSession,
) -> tuple[StoragePurchase, bool]:
    """
    Process a Midtrans payment notification.
    Validates signature, maps status, then delegates to process_webhook_event.
    """
    verify_midtrans_signature(notification)

    # order_id == str(purchase.id) as set during create_purchase_intent
    try:
        purchase_id = UUID(notification.order_id)
    except (ValueError, AttributeError):
        raise AppException(status_code=422, detail="Invalid order_id format")

    internal_status = midtrans_status_to_purchase_status(
        notification.transaction_status,
        notification.fraud_status,
    )

    return await process_webhook_event(
        event_id=notification.transaction_id,
        purchase_id=purchase_id,
        status=internal_status,
        provider_txn_id=notification.transaction_id,
        db=db,
    )

