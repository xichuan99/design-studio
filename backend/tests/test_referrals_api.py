from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from app.api.deps import get_current_user, get_db
from app.main import app
from app.models.user import User


def _override_user() -> User:
    return User(
        id="550e8400-e29b-41d4-a716-446655440111",
        email="owner@example.com",
        name="Owner",
        provider="google",
        referral_code="OWNER123",
    )


_UNSET = object()


def _exec_result(*, scalar=_UNSET, scalar_one_or_none=_UNSET, scalars_all=_UNSET):
    result = MagicMock()
    if scalar is not _UNSET:
        result.scalar.return_value = scalar
    if scalar_one_or_none is not _UNSET:
        result.scalar_one_or_none.return_value = scalar_one_or_none
    if scalars_all is not _UNSET:
        result.scalars.return_value.all.return_value = scalars_all
    return result


def test_get_referral_status_success() -> None:
    mock_db = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.flush = AsyncMock()
    mock_db.add = MagicMock()

    mock_db.execute = AsyncMock(
        side_effect=[
            _exec_result(scalars_all=[]),  # verify pending as referred
            _exec_result(scalars_all=[]),  # verify pending as referrer
            _exec_result(scalar=0),  # summary pending_count
            _exec_result(scalar=0),  # summary verified_count
            _exec_result(scalar=0),  # summary credits total
            _exec_result(scalar_one_or_none=None),  # applied referral
        ]
    )

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_current_user] = _override_user
    app.dependency_overrides[get_db] = override_get_db

    try:
        client = TestClient(app)
        response = client.get("/api/referrals/status")

        assert response.status_code == 200
        body = response.json()
        assert body["referral_code"] == "OWNER123"
        assert body["summary"]["pending_count"] == 0
        assert body["summary"]["verified_count"] == 0
        assert body["summary"]["credits_earned_total"] == 0
        assert body["applied_referral"] is None
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
