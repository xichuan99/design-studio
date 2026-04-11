import asyncio
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app
from app.workers.ai_tool_jobs_common import run_async


async def _override_get_db():
    mock_db = AsyncMock()
    mock_db.execute.return_value = None
    yield mock_db


client = TestClient(app)


def test_backend_health_alias_exists() -> None:
    app.dependency_overrides[get_db] = _override_get_db
    try:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
    finally:
        app.dependency_overrides.pop(get_db, None)


async def _current_loop():
    return asyncio.get_running_loop()


def test_run_async_keeps_reusable_worker_loop() -> None:
    first_loop = run_async(_current_loop())
    second_loop = run_async(_current_loop())

    assert not first_loop.is_closed()
    assert first_loop is second_loop
