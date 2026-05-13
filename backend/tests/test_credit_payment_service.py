import hashlib
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.exceptions import AppException
from app.models.credit_purchase import CreditPurchase
from app.models.user import User
from app.schemas.storage_payment import MidtransNotification
from app.services.credit_payment_service import (
    create_purchase_intent,
    get_credit_pack_catalog,
    midtrans_status_to_purchase_status,
    process_midtrans_notification,
    process_webhook_event,
    verify_midtrans_signature,
)


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.execute = AsyncMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()
    return db


def _make_midtrans_signature(order_id, status_code, gross_amount, server_key):
    raw = order_id + status_code + gross_amount + server_key
    return hashlib.sha512(raw.encode("utf-8")).hexdigest()


@pytest.mark.asyncio
async def test_create_purchase_intent_uses_credit_pack_catalog(mock_db):
    purchase = await create_purchase_intent(
        user_id=uuid.uuid4(),
        pack_code="credit_pack_starter",
        db=mock_db,
    )

    assert purchase.credits_added == 100
    assert purchase.amount == 15000
    assert mock_db.add.call_count == 1
    assert mock_db.commit.call_count == 1


@pytest.mark.asyncio
async def test_create_purchase_intent_invalid_pack(mock_db):
    with pytest.raises(AppException) as exc_info:
        await create_purchase_intent(
            user_id=uuid.uuid4(),
            pack_code="invalid_pack",
            db=mock_db,
        )

    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_process_webhook_event_paid_updates_credits(mock_db):
    purchase_id = uuid.uuid4()
    user_id = uuid.uuid4()

    purchase = CreditPurchase(
        id=purchase_id,
        user_id=user_id,
        pack_code="credit_pack_starter",
        credits_added=100,
        amount=15000,
        currency="IDR",
        status="pending",
    )
    user = User(
        id=user_id,
        email="test@example.com",
        name="Test",
        storage_used=0,
        storage_quota=100,
        credits_remaining=10,
        provider="google",
    )

    purchase_result = MagicMock()
    purchase_result.scalar_one_or_none.return_value = purchase
    user_result = MagicMock()
    user_result.scalar_one_or_none.return_value = user
    mock_db.execute.side_effect = [purchase_result, user_result]

    updated_purchase, already_processed = await process_webhook_event(
        event_id="evt_1",
        purchase_id=purchase_id,
        status="paid",
        provider_txn_id="txn_1",
        db=mock_db,
    )

    assert already_processed is False
    assert updated_purchase.status == "paid"
    assert updated_purchase.paid_event_id == "evt_1"
    assert user.credits_remaining == 110


@pytest.mark.asyncio
async def test_process_webhook_event_idempotent(mock_db):
    purchase_id = uuid.uuid4()
    user_id = uuid.uuid4()

    purchase = CreditPurchase(
        id=purchase_id,
        user_id=user_id,
        pack_code="credit_pack_starter",
        credits_added=100,
        amount=15000,
        currency="IDR",
        status="paid",
        paid_event_id="evt_1",
    )

    purchase_result = MagicMock()
    purchase_result.scalar_one_or_none.return_value = purchase
    mock_db.execute.return_value = purchase_result

    _, already_processed = await process_webhook_event(
        event_id="evt_1",
        purchase_id=purchase_id,
        status="paid",
        provider_txn_id="txn_1",
        db=mock_db,
    )

    assert already_processed is True
    assert mock_db.commit.call_count == 0


def test_get_credit_pack_catalog_has_default_entries():
    catalog = get_credit_pack_catalog()

    assert "credit_pack_starter" in catalog
    assert "credit_pack_pro" in catalog
    assert "credit_pack_business" in catalog


@pytest.mark.parametrize(
    "transaction_status,fraud_status,expected",
    [
        ("settlement", None, "paid"),
        ("capture", None, "paid"),
        ("capture", "challenge", "pending"),
        ("deny", None, "canceled"),
        ("cancel", None, "canceled"),
        ("expire", None, "expired"),
        ("failure", None, "failed"),
        ("pending", None, "pending"),
    ],
)
def test_midtrans_status_mapping(transaction_status, fraud_status, expected):
    assert midtrans_status_to_purchase_status(transaction_status, fraud_status) == expected


def test_verify_midtrans_signature_invalid(monkeypatch):
    monkeypatch.setattr("app.services.credit_payment_service.settings.MIDTRANS_SERVER_KEY", "sandbox-key")
    notification = MidtransNotification(
        order_id=str(uuid.uuid4()),
        status_code="200",
        gross_amount="15000.00",
        signature_key="bad-signature",
        transaction_status="settlement",
        transaction_id="txn-123",
    )
    with pytest.raises(AppException) as exc_info:
        verify_midtrans_signature(notification)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_process_midtrans_notification_pays_credit_purchase(monkeypatch, mock_db):
    server_key = "sandbox-key"
    monkeypatch.setattr("app.services.credit_payment_service.settings.MIDTRANS_SERVER_KEY", server_key)

    purchase_id = uuid.uuid4()
    user_id = uuid.uuid4()

    purchase = CreditPurchase(
        id=purchase_id,
        user_id=user_id,
        pack_code="credit_pack_pro",
        credits_added=500,
        amount=50000,
        currency="IDR",
        status="pending",
    )
    user = User(
        id=user_id,
        email="test@example.com",
        name="Test",
        storage_used=0,
        storage_quota=100,
        credits_remaining=10,
        provider="google",
    )

    purchase_result = MagicMock()
    purchase_result.scalar_one_or_none.return_value = purchase
    user_result = MagicMock()
    user_result.scalar_one_or_none.return_value = user
    mock_db.execute.side_effect = [purchase_result, user_result]

    order_id = str(purchase_id)
    sig = _make_midtrans_signature(order_id, "200", "50000.00", server_key)

    notification = MidtransNotification(
        order_id=order_id,
        status_code="200",
        gross_amount="50000.00",
        signature_key=sig,
        transaction_status="settlement",
        transaction_id="txn-midtrans-credit-1",
    )

    updated_purchase, already_processed = await process_midtrans_notification(notification, mock_db)

    assert already_processed is False
    assert updated_purchase.status == "paid"
    assert updated_purchase.paid_event_id == "txn-midtrans-credit-1"
    assert user.credits_remaining == 510
