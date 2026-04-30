"""Redis-backed model cooldown helpers for synchronous LLM routing."""

from __future__ import annotations

import logging

import redis

from app.core.redis import redis_sync_client

logger = logging.getLogger(__name__)

_COOLDOWN_KEY_PREFIX = "llm:cooldown:"
_CONCURRENCY_KEY_PREFIX = "llm:concurrent:"


class ModelConcurrencyLimitError(Exception):
    """Raised when a model has reached the configured soft concurrency ceiling."""

    def __init__(self, model_id: str):
        self.model_id = model_id
        super().__init__(f"Model concurrency limit reached: {model_id}")


def _cooldown_key(model_id: str) -> str:
    return f"{_COOLDOWN_KEY_PREFIX}{model_id}"


def _concurrency_key(model_id: str) -> str:
    return f"{_CONCURRENCY_KEY_PREFIX}{model_id}"


def mark_model_cooldown(model_id: str, seconds: int) -> None:
    ttl_seconds = max(1, int(seconds))
    if not redis_sync_client:
        return

    try:
        redis_sync_client.set(_cooldown_key(model_id), "1", ex=ttl_seconds)
    except redis.RedisError as exc:
        logger.warning("Failed to mark model cooldown for %s: %s", model_id, exc)


def get_model_cooldown_remaining(model_id: str) -> int:
    if not redis_sync_client:
        return 0

    try:
        ttl = redis_sync_client.ttl(_cooldown_key(model_id))
    except redis.RedisError as exc:
        logger.warning("Failed to read model cooldown for %s: %s", model_id, exc)
        return 0

    if ttl is None or ttl <= 0:
        return 0
    return int(ttl)


def is_model_in_cooldown(model_id: str) -> bool:
    return get_model_cooldown_remaining(model_id) > 0


def acquire_model_slot(model_id: str, max_concurrent: int) -> bool:
    if not redis_sync_client or max_concurrent <= 0:
        return True

    key = _concurrency_key(model_id)
    try:
        current = redis_sync_client.incr(key)
        redis_sync_client.expire(key, 120)
    except redis.RedisError as exc:
        logger.warning("Failed to acquire model slot for %s: %s", model_id, exc)
        return True

    if current <= max_concurrent:
        return True

    try:
        redis_sync_client.decr(key)
    except redis.RedisError as exc:
        logger.warning("Failed to rollback model slot for %s: %s", model_id, exc)
    return False


def release_model_slot(model_id: str) -> None:
    if not redis_sync_client:
        return

    key = _concurrency_key(model_id)
    try:
        remaining = redis_sync_client.decr(key)
        if remaining <= 0:
            redis_sync_client.delete(key)
    except redis.RedisError as exc:
        logger.warning("Failed to release model slot for %s: %s", model_id, exc)