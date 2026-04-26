"""Scheduled reconcile worker for storage purchases.

Scans pending purchases that are older than a threshold and checks their
status against Midtrans. Fulfills any missed paid purchases using the same
idempotent process_webhook_event path used by the webhook endpoint.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from celery import shared_task
from sqlalchemy import select

from app.models.storage_purchase import StoragePurchase
from app.services.storage_payment_service import (
    midtrans_status_to_purchase_status,
    midtrans_check_transaction_status,
)

logger = logging.getLogger(__name__)

# Purchases older than this threshold without resolution are eligible for reconcile
RECONCILE_THRESHOLD_MINUTES = 10
# Max purchases to process per reconcile run
RECONCILE_BATCH_SIZE = 50


async def _reconcile_one(purchase_id: UUID) -> str:
    """
    Check one pending purchase against Midtrans and fulfill if paid.
    Returns outcome label: 'fulfilled' | 'failed' | 'expired' | 'skipped' | 'error'.
    """
    from app.core.database import AsyncSessionLocal
    from app.services.storage_payment_service import process_webhook_event
    from app.core.exceptions import AppException

    async with AsyncSessionLocal() as db:
        try:
            txn = await midtrans_check_transaction_status(str(purchase_id))
        except AppException as exc:
            logger.error(
                "storage.reconcile.provider_error purchase_id=%s detail=%s",
                purchase_id,
                exc.detail,
            )
            return "error"

        transaction_status = txn.get("transaction_status", "")
        fraud_status = txn.get("fraud_status")
        transaction_id = txn.get("transaction_id", str(purchase_id))

        internal_status = midtrans_status_to_purchase_status(transaction_status, fraud_status)

        if internal_status == "pending":
            return "skipped"

        try:
            _, already_processed = await process_webhook_event(
                event_id=f"reconcile:{transaction_id}",
                purchase_id=purchase_id,
                status=internal_status,
                provider_txn_id=transaction_id,
                db=db,
            )
        except AppException as exc:
            logger.error(
                "storage.reconcile.fulfill_error purchase_id=%s detail=%s",
                purchase_id,
                exc.detail,
            )
            return "error"

        if already_processed:
            return "skipped"

        logger.info(
            "storage.reconcile.outcome purchase_id=%s status=%s",
            purchase_id,
            internal_status,
        )
        return internal_status


@shared_task(
    bind=True,
    name="app.workers.storage_reconcile.reconcile_pending_storage_purchases",
    max_retries=0,
    ignore_result=True,
)
def reconcile_pending_storage_purchases(self) -> None:  # type: ignore[override]
    """
    Celery beat task: check pending storage purchases against Midtrans
    and fulfill any that have been paid but whose webhook was missed.

    Schedule example (celery beat):
        "reconcile-storage-every-10-min": {
            "task": "app.workers.storage_reconcile.reconcile_pending_storage_purchases",
            "schedule": crontab(minute="*/10"),
        }
    """
    import asyncio

    from app.core.database import AsyncSessionLocal

    logger.info("storage.reconcile.start")

    threshold = datetime.now(timezone.utc) - timedelta(minutes=RECONCILE_THRESHOLD_MINUTES)

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(StoragePurchase.id)
                .where(
                    StoragePurchase.status == "pending",
                    StoragePurchase.provider == "midtrans",
                    StoragePurchase.created_at <= threshold,
                )
                .order_by(StoragePurchase.created_at)
                .limit(RECONCILE_BATCH_SIZE)
            )
            purchase_ids = [row[0] for row in result.all()]

        logger.info("storage.reconcile.candidates count=%d", len(purchase_ids))

        counters: dict[str, int] = {
            "fulfilled": 0,
            "failed": 0,
            "expired": 0,
            "canceled": 0,
            "skipped": 0,
            "error": 0,
        }

        for purchase_id in purchase_ids:
            outcome = await _reconcile_one(purchase_id)
            counters[outcome] = counters.get(outcome, 0) + 1

        logger.info(
            "storage.reconcile.done fulfilled=%d failed=%d expired=%d "
            "canceled=%d skipped=%d error=%d",
            counters["fulfilled"],
            counters["failed"],
            counters["expired"],
            counters["canceled"],
            counters["skipped"],
            counters["error"],
        )

    asyncio.run(_run())
