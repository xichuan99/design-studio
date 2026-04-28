from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.rate_limit import rate_limit_dependency
from app.main import app
from app.models.user import User


def _override_rate_limit() -> User:
    return User(id="catalog-test-user", email="catalog@test.local")


@pytest.fixture
def client() -> TestClient:
    app.dependency_overrides[rate_limit_dependency] = _override_rate_limit
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(rate_limit_dependency, None)


BASICS_PAYLOAD = {
    "catalog_type": "product",
    "total_pages": 6,
    "goal": "selling",
    "tone": "premium",
    "language": "id",
    "business_name": "Kopi Nusantara",
    "business_context": "Produk kopi blend untuk pasar retail",
}

STRUCTURE_PAYLOAD = [
    {
        "page_number": 1,
        "type": "cover",
        "layout": "hero",
        "content": {"title": "Kopi Nusantara"},
    },
    {
        "page_number": 2,
        "type": "product_list",
        "layout": "grid",
        "content": {"title": "Varian Pilihan"},
    },
]

IMAGE_MAPPING_PAYLOAD = [
    {
        "image_id": "img-cover",
        "category": "cover_image",
        "confidence": 0.95,
        "recommended_pages": [1],
    }
]


def test_plan_structure_route(client: TestClient) -> None:
    mocked_response = {
        "suggested_structure": STRUCTURE_PAYLOAD,
        "missing_data": [],
        "warnings": [],
    }

    with patch("app.api.catalog.plan_catalog_structure", new=AsyncMock(return_value=mocked_response)) as mocked_call:
        response = client.post("/api/catalog/plan-structure", json=BASICS_PAYLOAD)

    assert response.status_code == 200
    assert response.json()["suggested_structure"][0]["type"] == "cover"
    mocked_call.assert_awaited_once()


def test_suggest_styles_route(client: TestClient) -> None:
    mocked_response = {
        "style_options": [
            {
                "style": "minimal clean",
                "description": "Layout bersih dengan fokus produk utama.",
                "use_case": "Retail premium",
                "layout": "hero + grid",
            },
            {
                "style": "editorial modern",
                "description": "Kesan majalah modern dengan ritme visual dinamis.",
                "use_case": "Brand storytelling",
                "layout": "split sections",
            },
            {
                "style": "commercial bold",
                "description": "Tipografi besar untuk promosi dan CTA kuat.",
                "use_case": "Campaign promo",
                "layout": "banner blocks",
            },
        ]
    }

    payload = {
        "basics": BASICS_PAYLOAD,
        "structure": STRUCTURE_PAYLOAD,
    }

    with patch("app.api.catalog.suggest_catalog_styles", new=AsyncMock(return_value=mocked_response)) as mocked_call:
        response = client.post("/api/catalog/suggest-styles", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert len(body["style_options"]) == 3
    mocked_call.assert_awaited_once()


def test_map_images_route(client: TestClient) -> None:
    mocked_response = {
        "image_mapping": IMAGE_MAPPING_PAYLOAD,
        "unassigned_images": [],
        "warnings": [],
    }

    payload = {
        "basics": BASICS_PAYLOAD,
        "structure": STRUCTURE_PAYLOAD,
        "images": [
            {
                "image_id": "img-cover",
                "filename": "cover.jpg",
                "description": "Foto produk utama",
            }
        ],
    }

    with patch("app.api.catalog.map_catalog_images", new=AsyncMock(return_value=mocked_response)) as mocked_call:
        response = client.post("/api/catalog/map-images", json=payload)

    assert response.status_code == 200
    assert response.json()["image_mapping"][0]["recommended_pages"] == [1]
    mocked_call.assert_awaited_once()


def test_generate_copy_route(client: TestClient) -> None:
    mocked_response = {
        "pages": [
            {
                "page_number": 1,
                "type": "cover",
                "layout": "hero",
                "content": {
                    "title": "Kopi Nusantara",
                    "headline": "Racikan Premium untuk Hari Anda",
                },
            }
        ],
        "missing_data": [],
        "warnings": [],
    }

    payload = {
        "basics": BASICS_PAYLOAD,
        "selected_style": "minimal clean",
        "pages": STRUCTURE_PAYLOAD,
        "business_data": {
            "usp": "Single origin blend",
        },
    }

    with patch("app.api.catalog.generate_catalog_copy", new=AsyncMock(return_value=mocked_response)) as mocked_call:
        response = client.post("/api/catalog/generate-copy", json=payload)

    assert response.status_code == 200
    assert response.json()["pages"][0]["content"]["headline"] == "Racikan Premium untuk Hari Anda"
    mocked_call.assert_awaited_once()


def test_finalize_plan_route(client: TestClient) -> None:
    mocked_response = {
        "schema_version": "catalog.plan.v1",
        "catalog_type": "product",
        "total_pages": 6,
        "tone": "premium",
        "style": "minimal clean",
        "pages": STRUCTURE_PAYLOAD,
        "missing_data": [],
    }

    payload = {
        "basics": BASICS_PAYLOAD,
        "selected_style": "minimal clean",
        "structure": STRUCTURE_PAYLOAD,
        "image_mapping": IMAGE_MAPPING_PAYLOAD,
        "page_copy": STRUCTURE_PAYLOAD,
        "overrides": {},
    }

    with patch("app.api.catalog.finalize_catalog_plan", new=AsyncMock(return_value=mocked_response)) as mocked_call:
        response = client.post("/api/catalog/finalize-plan", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["schema_version"] == "catalog.plan.v1"
    assert body["total_pages"] == 6
    mocked_call.assert_awaited_once()
