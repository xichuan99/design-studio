from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timezone

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppException
from app.models.storage_purchase import StoragePurchase
from app.models.storage_quota_ledger import StorageQuotaLedger
from app.models.user import User


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


def sign_webhook_payload(raw_body: bytes) -> str:
    secret = settings.STORAGE_WEBHOOK_SECRET
    if not secret:
        return ""

    digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return digest


def verify_webhook_signature(raw_body: bytes, signature: str | None) -> None:
    if not settings.STORAGE_WEBHOOK_SECRET:
        raise AppException(status_code=500, detail="Webhook secret is not configured")

    if not signature:
        raise AppException(status_code=401, detail="Missing webhook signature")

    expected = sign_webhook_payload(raw_body)
    if not hmac.compare_digest(expected, signature):
        raise AppException(status_code=401, detail="Invalid webhook signature")


async def create_purchase_intent(
    user_id,
    addon_code: str,
    db: AsyncSession,
) -> StoragePurchase:
    catalog = get_addon_catalog()
    addon = catalog.get(addon_code)
    if not addon:
        raise AppException(status_code=422, detail="Invalid storage addon code")

    checkout_base = settings.STORAGE_CHECKOUT_URL_BASE.rstrip("/")

    purchase = StoragePurchase(
        user_id=user_id,
        addon_code=addon_code,
        bytes_added=int(addon["bytes_added"]),
        amount=int(addon["amount"]),
        currency=str(addon.get("currency", "IDR")),
        provider="manual",
        status="pending",
    )
    db.add(purchase)
    await db.flush()

    purchase.checkout_url = (
        f"{checkout_base}?purchase_id={purchase.id}" if checkout_base else f"/settings?upgrade=storage&purchase_id={purchase.id}"
    )

    await db.commit()
    await db.refresh(purchase)
    return purchase


async def list_purchases(user_id, db: AsyncSession, limit: int = 20, offset: int = 0) -> tuple[list[StoragePurchase], int]:
    query = (
        select(StoragePurchase)
        .where(StoragePurchase.user_id == user_id)
        .order_by(desc(StoragePurchase.created_at))
    )
    result = await db.execute(query.offset(offset).limit(limit))
    items = result.scalars().all()

    count_query = select(func.count()).where(StoragePurchase.user_id == user_id)
    count_result = await db.execute(count_query)
    total = count_result.scalar_one()

    return items, total


async def process_webhook_event(
    event_id: str,
    purchase_id,
    status: str,
    provider_txn_id: str | None,
    db: AsyncSession,
) -> tuple[StoragePurchase, bool]:
    purchase_result = await db.execute(
        select(StoragePurchase).where(StoragePurchase.id == purchase_id)
    )
    purchase = purchase_result.scalar_one_or_none()
    if not purchase:
        raise AppException(status_code=404, detail="Storage purchase not found")

    if purchase.paid_event_id == event_id:
        return purchase, True

    if purchase.status == "paid" and status == "paid":
        return purchase, True

    purchase.provider_txn_id = provider_txn_id or purchase.provider_txn_id

    if status != "paid":
        purchase.status = status
        await db.commit()
        await db.refresh(purchase)
        return purchase, False

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

    return purchase, False
