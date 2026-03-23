from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.deps import get_current_user, get_db
from app.main import app
from app.models.project import Project
from app.models.template_submission import TemplateSubmission
from app.models.user import User


def _override_current_user() -> User:
    return User(
        id="550e8400-e29b-41d4-a716-446655440000",
        email="owner@example.com",
        name="Owner",
    )


def test_create_template_submission_from_project() -> None:
    user_id = uuid4()
    project = Project(
        id=uuid4(),
        user_id=user_id,
        title="Promo 1",
        status="draft",
        aspect_ratio="1:1",
        canvas_state={
            "elements": [
                {"id": "1", "type": "text", "text": "Judul"},
                {"id": "2", "type": "image", "url": "https://example.com/a.png"},
            ],
            "backgroundUrl": None,
        },
    )

    project_result = MagicMock()
    project_result.scalar_one_or_none.return_value = project

    mock_db = AsyncMock()
    mock_db.execute.return_value = project_result
    mock_db.add = MagicMock()

    async def refresh_side_effect(submission: TemplateSubmission) -> None:
        submission.id = uuid4()
        submission.is_featured = False
        submission.created_at = datetime.now(timezone.utc)
        submission.updated_at = datetime.now(timezone.utc)

    mock_db.refresh.side_effect = refresh_side_effect

    async def override_get_db():
        yield mock_db

    def override_user() -> User:
        return User(id=user_id, email="owner@example.com", name="Owner")

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_get_db

    try:
        client = TestClient(app)
        response = client.post(
            "/api/template-submissions/",
            json={
                "source_project_id": str(project.id),
                "title": "Template Promo",
                "description": "Desc",
                "category": "sale",
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["status"] == "submitted"
        assert body["title"] == "Template Promo"
        saved_submission = mock_db.add.call_args.args[0]
        assert saved_submission.default_text_layers == [
            {"id": "1", "type": "text", "text": "Judul"}
        ]
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)


def test_list_community_templates_only_published() -> None:
    published = TemplateSubmission(
        id=uuid4(),
        owner_user_id=uuid4(),
        source_project_id=None,
        title="Public Template",
        category="food",
        industry="fnb",
        aspect_ratio="1:1",
        status="published",
        preview_canvas_state={"elements": []},
        default_text_layers=[],
        is_featured=True,
    )
    published.created_at = datetime.now(timezone.utc)
    published.updated_at = datetime.now(timezone.utc)

    scalars_result = MagicMock()
    scalars_result.all.return_value = [published]
    result = MagicMock()
    result.scalars.return_value = scalars_result

    mock_db = AsyncMock()
    mock_db.execute.return_value = result

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        client = TestClient(app)
        response = client.get("/api/community-templates/")

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["title"] == "Public Template"
        assert body[0]["is_featured"] is True
    finally:
        app.dependency_overrides.pop(get_db, None)
