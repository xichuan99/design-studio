from unittest.mock import MagicMock, call, patch

from app.services.llm_rate_guard import (
    acquire_model_slot,
    get_model_cooldown_remaining,
    mark_model_cooldown,
    release_model_slot,
)


def test_mark_model_cooldown_sets_ttl():
    redis_client = MagicMock()

    with patch("app.services.llm_rate_guard.redis_sync_client", redis_client):
        mark_model_cooldown("openrouter/deepseek/deepseek-v4-flash", 42)

    redis_client.set.assert_called_once_with(
        "llm:cooldown:openrouter/deepseek/deepseek-v4-flash",
        "1",
        ex=42,
    )


def test_get_model_cooldown_remaining_returns_zero_when_missing():
    redis_client = MagicMock()
    redis_client.ttl.return_value = -2

    with patch("app.services.llm_rate_guard.redis_sync_client", redis_client):
        remaining = get_model_cooldown_remaining("gemini-2.0-flash")

    assert remaining == 0


def test_acquire_model_slot_rolls_back_when_limit_exceeded():
    redis_client = MagicMock()
    redis_client.incr.return_value = 6

    with patch("app.services.llm_rate_guard.redis_sync_client", redis_client):
        acquired = acquire_model_slot("gemini-2.0-flash", max_concurrent=5)

    assert acquired is False
    redis_client.incr.assert_called_once_with("llm:concurrent:gemini-2.0-flash")
    redis_client.expire.assert_called_once_with("llm:concurrent:gemini-2.0-flash", 120)
    redis_client.decr.assert_called_once_with("llm:concurrent:gemini-2.0-flash")


def test_release_model_slot_deletes_key_when_counter_hits_zero():
    redis_client = MagicMock()
    redis_client.decr.return_value = 0

    with patch("app.services.llm_rate_guard.redis_sync_client", redis_client):
        release_model_slot("gemini-2.0-flash")

    redis_client.decr.assert_called_once_with("llm:concurrent:gemini-2.0-flash")
    redis_client.delete.assert_called_once_with("llm:concurrent:gemini-2.0-flash")