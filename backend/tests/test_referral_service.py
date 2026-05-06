import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.referral import Referral
from app.models.user import User
from app.services.referral_service import (
    ensure_user_referral_code,
    normalize_referral_code,
    verify_pending_referrals,
)


def _exec_result(*, scalar=None, scalar_one_or_none=None, scalars_all=None):
    result = MagicMock()
    if scalar is not None:
        result.scalar.return_value = scalar
    if scalar_one_or_none is not None:
        result.scalar_one_or_none.return_value = scalar_one_or_none
    if scalars_all is not None:
        result.scalars.return_value.all.return_value = scalars_all
    return result


def test_normalize_referral_code() -> None:
    assert normalize_referral_code("  ab12cd34  ") == "AB12CD34"


@pytest.mark.asyncio
async def test_ensure_user_referral_code_keeps_existing() -> None:
    db = MagicMock()
    db.add = MagicMock()
    db.flush = AsyncMock()

    user = User(
        id=uuid.uuid4(),
        email="existing@example.com",
        name="Existing",
        referral_code="KEEP1234",
        provider="google",
    )

    code = await ensure_user_referral_code(db, user)

    assert code == "KEEP1234"
    db.add.assert_not_called()
    db.flush.assert_not_awaited()


@pytest.mark.asyncio
async def test_verify_pending_referrals_marks_verified_and_logs_credit() -> None:
    db = MagicMock()
    db.add = MagicMock()
    db.flush = AsyncMock()

    referrer_id = uuid.uuid4()
    referred_id = uuid.uuid4()

    referral = Referral(
        id=uuid.uuid4(),
        referrer_user_id=referrer_id,
        referred_user_id=referred_id,
        status="pending",
        reward_credits=10,
    )
    referrer = User(
        id=referrer_id,
        email="referrer@example.com",
        name="Referrer",
        provider="google",
        referral_code="REFR1234",
        credits_remaining=100,
    )

    db.execute = AsyncMock(
        side_effect=[
            _exec_result(scalars_all=[referral]),
            _exec_result(scalar_one_or_none=uuid.uuid4()),
            _exec_result(scalar_one_or_none=referrer),
        ]
    )

    with patch("app.services.referral_service.log_credit_change", new=AsyncMock()) as mock_log:
        updated = await verify_pending_referrals(db, referred_user_id=referred_id)

    assert updated == 1
    assert referral.status == "verified"
    assert referral.verified_at is not None
    assert referral.credited_at is not None
    mock_log.assert_awaited_once()
    db.add.assert_called_with(referral)
