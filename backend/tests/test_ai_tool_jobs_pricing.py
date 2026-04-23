from app.api.ai_tools_routers.jobs import (
    _is_advanced_relight_payload,
    _is_retouch_advanced_relight_requested,
    get_credit_cost,
)
from app.core.credit_costs import COST_BG_SWAP, COST_RETOUCH, COST_RETOUCH_ADVANCED


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
