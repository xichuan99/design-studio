from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.services.ai_tool_job_service import create_job, normalize_idempotency_key


def test_normalize_idempotency_key_hashes_long_values() -> None:
    normalized = normalize_idempotency_key("x" * 300)

    assert normalized is not None
    assert normalized.startswith("sha256:")
    assert len(normalized) <= 255


def test_normalize_idempotency_key_keeps_short_values() -> None:
    assert normalize_idempotency_key("short-key") == "short-key"


@pytest.mark.asyncio
async def test_create_job_normalizes_long_idempotency_key() -> None:
    scalars_result = MagicMock()
    scalars_result.first.return_value = None

    execute_result = MagicMock()
    execute_result.scalars.return_value = scalars_result

    db = AsyncMock()
    db.execute = AsyncMock(return_value=execute_result)
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    job, is_new_job = await create_job(
        db=db,
        user_id=uuid4(),
        tool_name="retouch",
        payload={"image_url": "https://example.com/image.jpg"},
        idempotency_key="y" * 300,
    )

    assert is_new_job is True
    assert job.idempotency_key is not None
    assert job.idempotency_key.startswith("sha256:")
    assert len(job.idempotency_key) <= 255
    db.add.assert_called_once()
    db.commit.assert_awaited()
    db.refresh.assert_awaited()
