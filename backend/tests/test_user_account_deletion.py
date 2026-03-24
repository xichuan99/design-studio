from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.api.deps import get_current_user, get_db
from app.main import app
from app.models.user import User


def _override_current_user() -> User:
    return User(
        id="550e8400-e29b-41d4-a716-446655440000",
        email="owner@example.com",
        name="Owner",
    )


def test_delete_my_account_uses_cascade_cleanup() -> None:
    mock_db = AsyncMock()

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_current_user] = _override_current_user
    app.dependency_overrides[get_db] = override_get_db

    try:
        client = TestClient(app)
        response = client.delete("/api/users/me")

        assert response.status_code == 204
        mock_db.delete.assert_awaited_once()
        deleted_user = mock_db.delete.await_args.args[0]
        assert isinstance(deleted_user, User)
        assert str(deleted_user.id) == "550e8400-e29b-41d4-a716-446655440000"
        mock_db.commit.assert_awaited_once()
        mock_db.rollback.assert_not_awaited()
        mock_db.execute.assert_not_awaited()
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)


def test_delete_my_account_rolls_back_on_failure() -> None:
    mock_db = AsyncMock()
    mock_db.delete.side_effect = Exception("delete failed")

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_current_user] = _override_current_user
    app.dependency_overrides[get_db] = override_get_db

    try:
        client = TestClient(app)
        response = client.delete("/api/users/me")

        assert response.status_code == 500
        assert response.json()["error"]["detail"] == (
            "Failed to delete account. Please try again."
        )
        mock_db.delete.assert_awaited_once()
        mock_db.rollback.assert_awaited_once()
        mock_db.commit.assert_not_awaited()
        mock_db.execute.assert_not_awaited()
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
