from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.api.rate_limit import rate_limit_dependency
from app.api.deps import get_db
from app.models.user import User


@pytest.fixture(autouse=True)
def setup_dependency_overrides():
    def override_rate_limit():
        user = User(id="test-user-id", email="test@test.com")
        user.credits_remaining = 100
        return user

    async def override_get_db():
        mock_session = AsyncMock()
        mock_session.add = MagicMock()
        mock_session.commit = AsyncMock()
        mock_session.refresh = AsyncMock()
        yield mock_session

    app.dependency_overrides[rate_limit_dependency] = override_rate_limit
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(rate_limit_dependency, None)
    app.dependency_overrides.pop(get_db, None)


client = TestClient(app)


def test_id_photo_allows_file_larger_than_5mb_up_to_10mb():
    medium_content = b"0" * (6 * 1024 * 1024)
    files = {"file": ("test.png", medium_content, "image/png")}
    data = {"bg_color": "red", "size": "3x4"}

    with (
        patch(
            "app.services.file_validation.validate_uploaded_image",
            new_callable=AsyncMock,
        ) as mock_validate,
        patch(
            "app.services.id_photo_service.generate_id_photo",
            new_callable=AsyncMock,
        ) as mock_gen,
        patch(
            "app.api.ai_tools_routers.enhancement.upload_image",
            new_callable=AsyncMock,
        ) as mock_upload,
    ):
        mock_validate.return_value = "image/png"
        mock_gen.return_value = b"id_photo"
        mock_upload.return_value = "http://storage.com/idphoto.jpg"

        res = client.post("/api/tools/id-photo", data=data, files=files)

        assert res.status_code == 200
        assert mock_validate.await_count == 1
        await_args = mock_validate.await_args
        max_size_mb = await_args.kwargs.get("max_size_mb")
        if max_size_mb is None and len(await_args.args) >= 2:
            max_size_mb = await_args.args[1]

        assert max_size_mb == 10
