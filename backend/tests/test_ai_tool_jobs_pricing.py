from app.api.ai_tools_routers.jobs import (
    _is_advanced_relight_payload,
    _preflight_product_scene_payload,
    _is_retouch_advanced_relight_requested,
    get_credit_cost,
)
from app.core.credit_costs import COST_BG_SWAP, COST_RETOUCH, COST_RETOUCH_ADVANCED
from unittest.mock import patch, AsyncMock
import pytest


def test_advanced_relight_payload_detection() -> None:
    assert _is_advanced_relight_payload({"relight_mode": "advanced"}) is True
    assert _is_advanced_relight_payload({"relight_mode": "auto"}) is True
    assert _is_advanced_relight_payload({"relight_mode": "off"}) is False
    assert _is_advanced_relight_payload({"relight_mode": "  ADVANCED "}) is True
    assert _is_advanced_relight_payload({}) is False


def test_retouch_advanced_relight_request_detection() -> None:
    assert _is_retouch_advanced_relight_requested(
        "retouch", {"relight_mode": "advanced"}
    ) is True
    assert _is_retouch_advanced_relight_requested(
        "retouch", {"relight_mode": "off"}
    ) is False
    assert _is_retouch_advanced_relight_requested(
        "background_swap", {"relight_mode": "advanced"}
    ) is False


def test_get_credit_cost_retouch_basic_and_advanced() -> None:
    assert get_credit_cost("retouch", "standard", {"relight_mode": "off"}) == COST_RETOUCH
    assert get_credit_cost("retouch", "standard", {"relight_mode": "advanced"}) == COST_RETOUCH_ADVANCED
    assert get_credit_cost("retouch", "standard", {"relight_mode": "auto"}) == COST_RETOUCH_ADVANCED


def test_get_credit_cost_non_retouch_unchanged() -> None:
    assert get_credit_cost("background_swap", "standard", {}) == COST_BG_SWAP


@pytest.mark.asyncio
@patch("app.api.ai_tools_routers.jobs.download_image", new_callable=AsyncMock)
@patch("app.api.ai_tools_routers.jobs.classify_subject_for_product_scene")
async def test_preflight_product_scene_payload_blocks_human(
    mock_classify,
    mock_download,
) -> None:
    mock_download.return_value = b"bytes"
    mock_classify.return_value = {
        "subject_type": "human",
        "confidence": 0.99,
        "reason": "Terdeteksi wajah manusia pada gambar.",
        "face_count": 1,
        "person_count": 1,
    }

    reason = await _preflight_product_scene_payload(
        {"image_url": "https://example.com/person.jpg"}
    )

    assert reason is not None
    assert "hanya untuk foto produk" in reason.lower()


@pytest.mark.asyncio
@patch("app.api.ai_tools_routers.jobs.download_image", new_callable=AsyncMock)
@patch("app.api.ai_tools_routers.jobs.classify_subject_for_product_scene")
async def test_preflight_product_scene_payload_allows_product(
    mock_classify,
    mock_download,
) -> None:
    mock_download.return_value = b"bytes"
    mock_classify.return_value = {
        "subject_type": "product",
        "confidence": 0.8,
        "reason": "Tidak terdeteksi subjek manusia dominan.",
        "face_count": 0,
        "person_count": 0,
    }

    reason = await _preflight_product_scene_payload(
        {"image_url": "https://example.com/product.jpg"}
    )

    assert reason is None
