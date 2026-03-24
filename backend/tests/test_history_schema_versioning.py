from datetime import datetime, timezone
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from app.api.deps import get_current_user, get_db
from app.main import app
from app.models.design_history import DesignHistory
from app.models.user import User


def _override_current_user() -> User:
    return User(
        id="550e8400-e29b-41d4-a716-446655440000",
        email="owner@example.com",
        name="Owner",
    )


def test_create_history_defaults_canvas_schema_version() -> None:
    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    async def refresh_side_effect(entry: DesignHistory) -> None:
        entry.id = uuid4()
        entry.created_at = datetime.now(timezone.utc)

    mock_db.refresh.side_effect = refresh_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_current_user] = _override_current_user
    app.dependency_overrides[get_db] = override_get_db

    try:
        client = TestClient(app)
        response = client.post(
            "/api/history/",
            json={
                "project_id": str(uuid4()),
                "background_url": "https://example.com/bg.png",
                "text_layers": [],
                "generation_params": {},
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["canvas_schema_version"] == 1
        saved_entry = mock_db.add.call_args.args[0]
        assert saved_entry.canvas_schema_version == 1
        mock_db.commit.assert_awaited_once()
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)


def test_list_history_returns_canvas_schema_version_fallback() -> None:
    entry = DesignHistory(
        id=uuid4(),
        project_id=uuid4(),
        background_url="https://example.com/bg.png",
        text_layers=[],
        generation_params={},
        canvas_schema_version=None,
    )
    entry.created_at = datetime.now(timezone.utc)

    mock_scalars = MagicMock()
    mock_scalars.all.return_value = [entry]
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars

    mock_db = AsyncMock()
    mock_db.execute.return_value = mock_result

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_current_user] = _override_current_user
    app.dependency_overrides[get_db] = override_get_db

    try:
        client = TestClient(app)
        response = client.get(f"/api/history/{entry.project_id}")

        assert response.status_code == 200
        body = response.json()
        assert body[0]["canvas_schema_version"] == 1
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
