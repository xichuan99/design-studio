import hashlib
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import AppException
from app.models.storage_purchase import StoragePurchase
from app.models.user import User
from app.schemas.storage_payment import MidtransNotification
from app.services.storage_payment_service import (
    create_purchase_intent,
    get_addon_catalog,
    midtrans_status_to_purchase_status,
    process_midtrans_notification,
    process_webhook_event,
    sign_webhook_payload,
    verify_midtrans_signature,
    verify_webhook_signature,
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


@pytest.mark.asyncio
async def test_create_purchase_intent_success(mock_db):
    user_id = uuid.uuid4()

    purchase = await create_purchase_intent(
        user_id=user_id,
        addon_code="storage_plus_5gb",
        db=mock_db,
    )

    assert purchase.user_id == user_id
    assert purchase.status == "pending"
    assert purchase.bytes_added == 5 * 1024 * 1024 * 1024
    assert purchase.amount == 49000
    assert "purchase_id=" in (purchase.checkout_url or "")
    assert mock_db.add.call_count == 1
    assert mock_db.commit.call_count == 1


@pytest.mark.asyncio
async def test_create_purchase_intent_invalid_addon(mock_db):
    with pytest.raises(AppException) as exc_info:
        await create_purchase_intent(
            user_id=uuid.uuid4(),
            addon_code="invalid_addon",
            db=mock_db,
        )

    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_process_webhook_event_paid_updates_quota(mock_db):
    purchase_id = uuid.uuid4()
    user_id = uuid.uuid4()

    purchase = StoragePurchase(
        id=purchase_id,
        user_id=user_id,
        addon_code="storage_plus_5gb",
        bytes_added=1024,
        amount=49000,
        currency="IDR",
        status="pending",
    )
    user = User(
        id=user_id,
        email="test@example.com",
        name="Test",
        storage_used=10,
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
    assert user.storage_quota == 1124
    assert mock_db.add.call_count == 1
    assert mock_db.commit.call_count == 1


@pytest.mark.asyncio
async def test_process_webhook_event_idempotent(mock_db):
    purchase_id = uuid.uuid4()
    user_id = uuid.uuid4()

    purchase = StoragePurchase(
        id=purchase_id,
        user_id=user_id,
        addon_code="storage_plus_5gb",
        bytes_added=1024,
        amount=49000,
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


@pytest.mark.asyncio
async def test_process_webhook_event_non_paid_status(mock_db):
    purchase_id = uuid.uuid4()
    user_id = uuid.uuid4()

    purchase = StoragePurchase(
        id=purchase_id,
        user_id=user_id,
        addon_code="storage_plus_5gb",
        bytes_added=1024,
        amount=49000,
        currency="IDR",
        status="pending",
    )

    purchase_result = MagicMock()
    purchase_result.scalar_one_or_none.return_value = purchase
    mock_db.execute.return_value = purchase_result

    updated_purchase, already_processed = await process_webhook_event(
        event_id="evt_2",
        purchase_id=purchase_id,
        status="failed",
        provider_txn_id="txn_2",
        db=mock_db,
    )

    assert already_processed is False
    assert updated_purchase.status == "failed"
    assert mock_db.commit.call_count == 1


def test_verify_webhook_signature_missing_signature():
    with pytest.raises(AppException) as exc_info:
        verify_webhook_signature(b"{}", None)

    assert exc_info.value.status_code in [401, 500]


def test_get_addon_catalog_has_default_entries():
    catalog = get_addon_catalog()

    assert "storage_plus_5gb" in catalog
    assert "storage_plus_20gb" in catalog
    assert int(catalog["storage_plus_5gb"]["bytes_added"]) == 5 * 1024 * 1024 * 1024


def test_verify_webhook_signature_valid(monkeypatch):
    monkeypatch.setattr("app.services.storage_payment_service.settings.STORAGE_WEBHOOK_SECRET", "test-secret")
    raw_body = b'{"event_id":"evt_test"}'
    signature = sign_webhook_payload(raw_body)

    verify_webhook_signature(raw_body, signature)


def test_verify_webhook_signature_invalid(monkeypatch):
    monkeypatch.setattr("app.services.storage_payment_service.settings.STORAGE_WEBHOOK_SECRET", "test-secret")

    with pytest.raises(AppException) as exc_info:
        verify_webhook_signature(b'{"event_id":"evt_test"}', "invalid-signature")

    assert exc_info.value.status_code == 401


# ---------------------------------------------------------------------------
# Midtrans status mapping
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("transaction_status,fraud_status,expected", [
    ("settlement", None, "paid"),
    ("capture", None, "paid"),
    ("capture", "challenge", "pending"),
    ("deny", None, "canceled"),
    ("cancel", None, "canceled"),
    ("expire", None, "expired"),
    ("failure", None, "failed"),
    ("pending", None, "pending"),
    ("unknown_status", None, "pending"),
])
def test_midtrans_status_mapping(transaction_status, fraud_status, expected):
    result = midtrans_status_to_purchase_status(transaction_status, fraud_status)
    assert result == expected


# ---------------------------------------------------------------------------
# Midtrans signature verification
# ---------------------------------------------------------------------------

def _make_midtrans_signature(order_id, status_code, gross_amount, server_key):
    raw = order_id + status_code + gross_amount + server_key
    return hashlib.sha512(raw.encode("utf-8")).hexdigest()


def test_verify_midtrans_signature_valid(monkeypatch):
    monkeypatch.setattr("app.services.storage_payment_service.settings.MIDTRANS_SERVER_KEY", "sandbox-key")
    order_id = str(uuid.uuid4())
    sig = _make_midtrans_signature(order_id, "200", "49000.00", "sandbox-key")

    notification = MidtransNotification(
        order_id=order_id,
        status_code="200",
        gross_amount="49000.00",
        signature_key=sig,
        transaction_status="settlement",
        transaction_id="txn-123",
    )
    verify_midtrans_signature(notification)  # should not raise


def test_verify_midtrans_signature_invalid(monkeypatch):
    monkeypatch.setattr("app.services.storage_payment_service.settings.MIDTRANS_SERVER_KEY", "sandbox-key")
    order_id = str(uuid.uuid4())

    notification = MidtransNotification(
        order_id=order_id,
        status_code="200",
        gross_amount="49000.00",
        signature_key="bad-signature",
        transaction_status="settlement",
        transaction_id="txn-123",
    )
    with pytest.raises(AppException) as exc_info:
        verify_midtrans_signature(notification)
    assert exc_info.value.status_code == 401


def test_verify_midtrans_signature_no_key_configured(monkeypatch):
    monkeypatch.setattr("app.services.storage_payment_service.settings.MIDTRANS_SERVER_KEY", "")
    notification = MidtransNotification(
        order_id="order-1",
        status_code="200",
        gross_amount="49000.00",
        signature_key="any",
        transaction_status="settlement",
        transaction_id="txn-1",
    )
    with pytest.raises(AppException) as exc_info:
        verify_midtrans_signature(notification)
    assert exc_info.value.status_code == 500


# ---------------------------------------------------------------------------
# process_midtrans_notification
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_process_midtrans_notification_pays_purchase(monkeypatch, mock_db):
    server_key = "sandbox-key"
    monkeypatch.setattr("app.services.storage_payment_service.settings.MIDTRANS_SERVER_KEY", server_key)

    purchase_id = uuid.uuid4()
    user_id = uuid.uuid4()

    purchase = StoragePurchase(
        id=purchase_id,
        user_id=user_id,
        addon_code="storage_plus_5gb",
        bytes_added=1024,
        amount=49000,
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
    sig = _make_midtrans_signature(order_id, "200", "49000.00", server_key)

    notification = MidtransNotification(
        order_id=order_id,
        status_code="200",
        gross_amount="49000.00",
        signature_key=sig,
        transaction_status="settlement",
        transaction_id="txn-midtrans-1",
    )

    updated_purchase, already_processed = await process_midtrans_notification(notification, mock_db)

    assert already_processed is False
    assert updated_purchase.status == "paid"
    assert updated_purchase.paid_event_id == "txn-midtrans-1"
    assert user.storage_quota == 1124


@pytest.mark.asyncio
async def test_process_midtrans_notification_invalid_order_id(monkeypatch, mock_db):
    server_key = "sandbox-key"
    monkeypatch.setattr("app.services.storage_payment_service.settings.MIDTRANS_SERVER_KEY", server_key)

    sig = _make_midtrans_signature("not-a-uuid", "200", "49000.00", server_key)
    notification = MidtransNotification(
        order_id="not-a-uuid",
        status_code="200",
        gross_amount="49000.00",
        signature_key=sig,
        transaction_status="settlement",
        transaction_id="txn-x",
    )
    with pytest.raises(AppException) as exc_info:
        await process_midtrans_notification(notification, mock_db)
    assert exc_info.value.status_code == 422


# ---------------------------------------------------------------------------
# create_purchase_intent — Midtrans path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_purchase_intent_midtrans_calls_snap(monkeypatch, mock_db):
    monkeypatch.setattr("app.services.storage_payment_service.settings.MIDTRANS_SERVER_KEY", "sandbox-key")

    snap_response = {"token": "snap-token-xyz", "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-xyz"}

    with patch("app.services.storage_payment_service._midtrans_create_snap_transaction", new=AsyncMock(return_value=snap_response)):
        purchase = await create_purchase_intent(
            user_id=uuid.uuid4(),
            addon_code="storage_plus_20gb",
            db=mock_db,
        )

    assert purchase.provider == "midtrans"
    assert "midtrans.com" in (purchase.checkout_url or "")
    assert purchase.provider_txn_id is not None
