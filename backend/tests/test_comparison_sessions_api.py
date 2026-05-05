from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.api.comparison_sessions import (
    create_comparison_session,
    get_comparison_session,
    get_shared_comparison_session,
)
from app.core.exceptions import InsufficientCreditsError, NotFoundError, ValidationError
from app.schemas.comparison import ComparisonSessionCreateRequest


class _FakeDB:
    def __init__(self) -> None:
        self.added = []
        self.committed = False
        self.last_get_value = None
        self.last_execute_value = None

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        self.committed = True

    async def refresh(self, obj):
        if not getattr(obj, "id", None):
            obj.id = uuid4()
        if not getattr(obj, "created_at", None):
            obj.created_at = datetime.now(timezone.utc)

    async def get(self, model, key):
        return self.last_get_value

    async def execute(self, query):
        result = MagicMock()
        result.scalar_one_or_none.return_value = self.last_execute_value
        return result


def _user(plan_tier: str = "starter", credits: int = 500):
    return SimpleNamespace(
        id=uuid4(),
        email="user@example.com",
        plan_tier=plan_tier,
        credits_remaining=credits,
    )


@pytest.mark.asyncio
async def test_create_comparison_session_rejects_inaccessible_tier() -> None:
    db = _FakeDB()
    payload = ComparisonSessionCreateRequest(
        raw_text="Buat promo minuman dingin untuk IG",
        tiers=["ultra"],
    )

    with pytest.raises(ValidationError, match="membutuhkan paket minimal business"):
        await create_comparison_session(payload=payload, db=db, current_user=_user("pro", 999))


@pytest.mark.asyncio
async def test_create_comparison_session_rejects_when_credits_insufficient() -> None:
    db = _FakeDB()
    payload = ComparisonSessionCreateRequest(
        raw_text="Buat promo minuman dingin untuk IG",
        tiers=["basic", "pro"],
    )

    with pytest.raises(InsufficientCreditsError, match="Kredit tidak cukup"):
        await create_comparison_session(payload=payload, db=db, current_user=_user("business", 10))


@pytest.mark.asyncio
@patch("app.api.comparison_sessions.dispatch_comparison_session")
@patch("app.api.comparison_sessions.log_credit_change", new_callable=AsyncMock)
async def test_create_comparison_session_success(mock_log_credit_change, mock_dispatch) -> None:
    db = _FakeDB()
    payload = ComparisonSessionCreateRequest(
        raw_text="Buat promo minuman dingin untuk IG",
        tiers=["basic", "pro", "ultra"],
    )
    user = _user("business", 999)

    result = await create_comparison_session(payload=payload, db=db, current_user=user)

    assert result.status == "queued"
    assert result.requested_tiers == ["basic", "pro", "ultra"]
    assert result.charged_credits == 160
    assert db.committed is True
    assert len(db.added) == 1
    mock_log_credit_change.assert_awaited_once()
    # 40 + 40 + 80
    assert mock_log_credit_change.await_args.args[2] == -160
    mock_dispatch.assert_called_once_with(str(result.id))


@pytest.mark.asyncio
async def test_get_comparison_session_invalid_uuid_returns_not_found() -> None:
    db = _FakeDB()

    with pytest.raises(NotFoundError, match="Comparison session not found"):
        await get_comparison_session(
            session_id="not-a-uuid",
            db=db,
            current_user=_user("business", 999),
        )


@pytest.mark.asyncio
async def test_get_shared_comparison_session_returns_not_found() -> None:
    db = _FakeDB()
    db.last_execute_value = None

    with pytest.raises(NotFoundError, match="Shared comparison session not found"):
        await get_shared_comparison_session("unknown-slug", db=db)
