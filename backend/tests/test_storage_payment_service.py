import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.exceptions import AppException
from app.models.storage_purchase import StoragePurchase
from app.models.user import User
from app.services.storage_payment_service import (
    create_purchase_intent,
    get_addon_catalog,
    process_webhook_event,
    sign_webhook_payload,
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
