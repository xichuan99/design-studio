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
from app.models.credit_purchase import CreditPurchase
from app.models.user import User
from app.schemas.storage_payment import MidtransNotification
from app.services.credit_service import log_credit_change

logger = logging.getLogger(__name__)


def _default_credit_pack_catalog() -> dict[str, dict[str, int | str]]:
    return {
        "credit_pack_starter": {
            "label": "Paket Starter",
            "credits_added": 100,
            "amount": 15000,
            "currency": "IDR",
        },
        "credit_pack_pro": {
            "label": "Paket Pro",
            "credits_added": 500,
            "amount": 50000,
            "currency": "IDR",
        },
        "credit_pack_business": {
            "label": "Paket Business",
            "credits_added": 2000,
            "amount": 150000,
            "currency": "IDR",
        },
    }


def get_credit_pack_catalog() -> dict[str, dict[str, int | str]]:
    raw = settings.CREDIT_PACK_CATALOG_JSON
    if not raw:
        return _default_credit_pack_catalog()

    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            return _default_credit_pack_catalog()
        return parsed
    except Exception:
        return _default_credit_pack_catalog()


def _midtrans_base_url() -> str:
    if settings.MIDTRANS_IS_PRODUCTION:
        return "https://app.midtrans.com/snap/v1"
    return "https://app.sandbox.midtrans.com/snap/v1"


def _midtrans_api_base_url() -> str:
    if settings.MIDTRANS_IS_PRODUCTION:
        return "https://api.midtrans.com/v2"
    return "https://api.sandbox.midtrans.com/v2"


def _midtrans_auth_header() -> str:
    token = base64.b64encode(f"{settings.MIDTRANS_SERVER_KEY}:".encode()).decode()
    return f"Basic {token}"


async def _midtrans_create_snap_transaction(
    order_id: str,
    gross_amount: int,
    customer_name: Optional[str] = None,
) -> dict:
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
            logger.error("midtrans.credit.snap.timeout order_id=%s", order_id)
            raise AppException(status_code=503, detail="Payment provider timeout. Please try again.")
        except httpx.HTTPStatusError as exc:
            logger.error(
                "midtrans.credit.snap.error order_id=%s status=%s body=%s",
                order_id,
                exc.response.status_code,
                exc.response.text[:200],
            )
            raise AppException(status_code=502, detail="Payment provider error. Please try again.")


async def midtrans_check_transaction_status(order_id: str) -> dict:
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
            logger.error("midtrans.credit.status.timeout order_id=%s", order_id)
            raise AppException(status_code=503, detail="Payment provider timeout.")
        except httpx.HTTPStatusError as exc:
            logger.error(
                "midtrans.credit.status.error order_id=%s status=%s body=%s",
                order_id,
                exc.response.status_code,
                exc.response.text[:200],
            )
            raise AppException(status_code=502, detail="Payment provider error.")


def verify_midtrans_signature(notification: MidtransNotification) -> None:
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
        logger.warning("midtrans.credit.signature.invalid order_id=%s", notification.order_id)
        raise AppException(status_code=401, detail="Invalid Midtrans notification signature")


def midtrans_status_to_purchase_status(transaction_status: str, fraud_status: Optional[str] = None) -> str:
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


async def create_purchase_intent(
    user_id: UUID,
    pack_code: str,
    db: AsyncSession,
    customer_name: Optional[str] = None,
) -> CreditPurchase:
    catalog = get_credit_pack_catalog()
    pack = catalog.get(pack_code)
    if not pack:
        raise AppException(status_code=422, detail="Invalid credit pack code")

    purchase = CreditPurchase(
        user_id=user_id,
        pack_code=pack_code,
        credits_added=int(pack["credits_added"]),
        amount=int(pack["amount"]),
        currency=str(pack.get("currency", "IDR")),
        provider="midtrans" if settings.MIDTRANS_SERVER_KEY else "manual",
        status="pending",
    )
    db.add(purchase)
    await db.flush()

    if settings.MIDTRANS_SERVER_KEY:
        order_id = str(purchase.id)
        snap_resp = await _midtrans_create_snap_transaction(
            order_id=order_id,
            gross_amount=int(pack["amount"]),
            customer_name=customer_name,
        )
        purchase.checkout_url = snap_resp.get("redirect_url", "")
        purchase.provider_txn_id = order_id
        logger.info("midtrans.credit.snap.created purchase_id=%s order_id=%s", purchase.id, order_id)
    else:
        checkout_base = settings.CREDIT_CHECKOUT_URL_BASE.rstrip("/")
        purchase.checkout_url = (
            f"{checkout_base}?purchase_id={purchase.id}"
            if checkout_base
            else f"/settings?upgrade=credits&purchase_id={purchase.id}"
        )

    await db.commit()
    await db.refresh(purchase)
    return purchase


async def list_purchases(
    user_id: UUID,
    db: AsyncSession,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[CreditPurchase], int]:
    query = (
        select(CreditPurchase)
        .where(CreditPurchase.user_id == user_id)
        .order_by(desc(CreditPurchase.created_at))
    )
    result = await db.execute(query.offset(offset).limit(limit))
    items = list(result.scalars().all())

    count_query = select(func.count()).select_from(CreditPurchase).where(
        CreditPurchase.user_id == user_id
    )
    count_result = await db.execute(count_query)
    total = count_result.scalar_one()

    return items, total


async def process_webhook_event(
    event_id: str,
    purchase_id: UUID,
    status: str,
    provider_txn_id: Optional[str],
    db: AsyncSession,
) -> tuple[CreditPurchase, bool]:
    purchase_result = await db.execute(
        select(CreditPurchase)
        .where(CreditPurchase.id == purchase_id)
        .with_for_update()
    )
    purchase = purchase_result.scalar_one_or_none()
    if not purchase:
        raise AppException(status_code=404, detail="Credit purchase not found")

    if purchase.paid_event_id == event_id:
        logger.info(
            "credits.webhook.duplicate_event purchase_id=%s event_id=%s",
            purchase_id,
            event_id,
        )
        return purchase, True

    if purchase.status == "paid" and status == "paid":
        logger.info("credits.webhook.already_paid purchase_id=%s", purchase_id)
        return purchase, True

    purchase.provider_txn_id = provider_txn_id or purchase.provider_txn_id

    if status != "paid":
        purchase.status = status
        await db.commit()
        await db.refresh(purchase)
        logger.info(
            "credits.webhook.status_update purchase_id=%s status=%s",
            purchase_id,
            status,
        )
        return purchase, False

    user_result = await db.execute(select(User).where(User.id == purchase.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise AppException(status_code=404, detail="User not found")

    await log_credit_change(
        db,
        user,
        int(purchase.credits_added),
        f"Credit pack purchase: {purchase.pack_code}",
    )

    purchase.status = "paid"
    purchase.paid_event_id = event_id
    purchase.paid_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(purchase)

    logger.info(
        "credits.webhook.fulfilled purchase_id=%s credits_added=%s user_id=%s",
        purchase_id,
        purchase.credits_added,
        user.id,
    )
    return purchase, False


async def process_midtrans_notification(
    notification: MidtransNotification,
    db: AsyncSession,
) -> tuple[CreditPurchase, bool]:
    verify_midtrans_signature(notification)

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
