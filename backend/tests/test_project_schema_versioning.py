from datetime import datetime, timezone
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from app.api.deps import get_current_user, get_db
from app.main import app
from app.models.project import Project
from app.models.user import User


def _override_current_user() -> User:
    return User(
        id="550e8400-e29b-41d4-a716-446655440000",
        email="owner@example.com",
        name="Owner",
    )


def test_create_project_defaults_canvas_schema_version() -> None:
    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    async def refresh_side_effect(project: Project) -> None:
        project.id = uuid4()
        project.user_id = uuid4()
        project.created_at = datetime.now(timezone.utc)
        project.updated_at = datetime.now(timezone.utc)

    mock_db.refresh.side_effect = refresh_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_current_user] = _override_current_user
    app.dependency_overrides[get_db] = override_get_db

    try:
        client = TestClient(app)
        response = client.post(
            "/api/projects/",
            json={
                "title": "Versioned Project",
                "status": "draft",
                "canvas_state": {"elements": [], "backgroundUrl": None},
                "aspect_ratio": "1:1",
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["canvas_schema_version"] == 1
        saved_project = mock_db.add.call_args.args[0]
        assert saved_project.canvas_schema_version == 1
        mock_db.commit.assert_awaited_once()
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)


def test_update_project_persists_canvas_schema_version() -> None:
    project = Project(
        id=uuid4(),
        user_id=uuid4(),
        title="Existing",
        status="draft",
        aspect_ratio="1:1",
        canvas_state={"elements": []},
        canvas_schema_version=1,
    )
    project.created_at = datetime.now(timezone.utc)
    project.updated_at = datetime.now(timezone.utc)

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = project

    mock_db = AsyncMock()
    mock_db.execute.return_value = mock_result

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_current_user] = _override_current_user
    app.dependency_overrides[get_db] = override_get_db

    try:
        client = TestClient(app)
        response = client.put(
            f"/api/projects/{project.id}",
            json={
                "title": "Existing",
                "status": "draft",
                "canvas_state": {"elements": [], "backgroundUrl": None},
                "canvas_schema_version": 1,
            },
        )

        assert response.status_code == 200
        assert response.json()["canvas_schema_version"] == 1
        assert project.canvas_schema_version == 1
        mock_db.commit.assert_awaited_once()
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)