from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.main import app
from app.models.template import Template


def _template_result(*templates: Template) -> MagicMock:
    scalars_result = MagicMock()
    scalars_result.all.return_value = list(templates)
    result = MagicMock()
    result.scalars.return_value = scalars_result
    return result


def test_list_templates_filters_by_platform_and_includes_platform_field() -> None:
    shopee_template = Template(
        id=uuid4(),
        name="Shopee Flash Sale",
        category="sale",
        aspect_ratio="1:1",
        style="bold",
        default_text_layers=[],
        prompt_suffix="sale",
        thumbnail_url="https://example.com/shopee.jpg",
        platform="shopee",
    )
    tokopedia_template = Template(
        id=uuid4(),
        name="Tokopedia Harbolnas",
        category="sale",
        aspect_ratio="1:1",
        style="bold",
        default_text_layers=[],
        prompt_suffix="sale",
        thumbnail_url="https://example.com/tokopedia.jpg",
        platform="tokopedia",
    )

    mock_db = AsyncMock()
    mock_db.execute.return_value = _template_result(shopee_template)

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        client = TestClient(app)
        with patch("app.api.templates.redis_client", None):
            response = client.get("/api/templates/?platform=shopee")

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["name"] == "Shopee Flash Sale"
        assert body[0]["platform"] == "shopee"
        assert all(item["platform"] != tokopedia_template.platform for item in body)
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_get_template_includes_platform_field() -> None:
    template = Template(
        id=uuid4(),
        name="WhatsApp Broadcast Promo",
        category="sale",
        aspect_ratio="9:16",
        style="bold",
        default_text_layers=[],
        prompt_suffix="broadcast",
        thumbnail_url="https://example.com/whatsapp.jpg",
        platform="whatsapp",
    )

    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = template

    mock_db = AsyncMock()
    mock_db.execute.return_value = scalar_result

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        client = TestClient(app)
        with patch("app.api.templates.redis_client", None):
            response = client.get(f"/api/templates/{template.id}")

        assert response.status_code == 200
        body = response.json()
        assert body["id"] == str(template.id)
        assert body["platform"] == "whatsapp"
        assert body["thumbnail_url"] == "https://example.com/whatsapp.jpg"
    finally:
        app.dependency_overrides.pop(get_db, None)
