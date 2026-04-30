"""Lightweight Redis-backed counters for LLM routing observability."""

from __future__ import annotations

import logging

import redis

from app.core.redis import redis_sync_client

logger = logging.getLogger(__name__)

_EVENT_KEY_PREFIX = "llm:metrics:event:"
_MODEL_EVENT_KEY_PREFIX = "llm:metrics:model:"
_DEFAULT_EXPIRE_SECONDS = 60 * 60 * 24 * 7


def record_llm_routing_event(event: str, model_id: str) -> None:
    if not redis_sync_client:
        return

    event_key = f"{_EVENT_KEY_PREFIX}{event}"
    model_key = f"{_MODEL_EVENT_KEY_PREFIX}{event}"

    try:
        redis_sync_client.incr(event_key)
        redis_sync_client.expire(event_key, _DEFAULT_EXPIRE_SECONDS)

        redis_sync_client.hincrby(model_key, model_id, 1)
        redis_sync_client.expire(model_key, _DEFAULT_EXPIRE_SECONDS)
    except redis.RedisError as exc:
        logger.warning(
            "Failed to record LLM routing metric (event=%s, model=%s): %s",
            event,
            model_id,
            exc,
        )


def get_llm_metrics_snapshot() -> dict:
    if not redis_sync_client:
        return {
            "available": False,
            "events": {},
            "models": {},
        }

    try:
        event_keys = list(redis_sync_client.scan_iter(f"{_EVENT_KEY_PREFIX}*"))
        model_keys = list(redis_sync_client.scan_iter(f"{_MODEL_EVENT_KEY_PREFIX}*"))
    except redis.RedisError as exc:
        logger.warning("Failed to discover LLM metrics keys: %s", exc)
        return {
            "available": False,
            "events": {},
            "models": {},
        }

    events: dict[str, int] = {}
    models: dict[str, dict[str, int]] = {}

    try:
        for key in event_keys:
            event_name = key.replace(_EVENT_KEY_PREFIX, "", 1)
            raw_value = redis_sync_client.get(key)
            events[event_name] = int(raw_value or 0)

        for key in model_keys:
            event_name = key.replace(_MODEL_EVENT_KEY_PREFIX, "", 1)
            raw_map = redis_sync_client.hgetall(key) or {}
            models[event_name] = {model_id: int(value) for model_id, value in raw_map.items()}
    except redis.RedisError as exc:
        logger.warning("Failed to read LLM metrics snapshot: %s", exc)
        return {
            "available": False,
            "events": {},
            "models": {},
        }

    return {
        "available": True,
        "events": events,
        "models": models,
    }
