"""Rate limiting dependencies for API endpoints.

Two tiers:
- rate_limit_actions  (alias: rate_limit_dependency) — heavy AI/generation endpoints, 10 req/min
- rate_limit_reads    — lightweight GET endpoints (gallery listing, etc.), 60 req/min
"""

import logging
import time

import redis.asyncio as redis
from fastapi import Depends

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.exceptions import AppException
from app.models.user import User

logger = logging.getLogger(__name__)

# Shared redis client for rate limiting
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


async def _check_rate_limit(key: str, limit: int) -> None:
    """Sliding-window rate limiter using a Redis sorted set.

    Raises HTTP 429 if the caller has exceeded *limit* requests in the last 60 s.
    Fails open (no exception) if Redis is unavailable, to avoid breaking the app.
    """
    current_time = int(time.time())
    window_start = current_time - 60

    try:
        async with redis_client.pipeline(transaction=True) as pipe:
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            pipe.zadd(key, {str(current_time): current_time})
            pipe.expire(key, 60)
            results = await pipe.execute()

        request_count = results[1]
        if request_count >= limit:
            raise AppException(
                status_code=429,
                detail="Too many requests. Please wait a moment before trying again.",
            )
    except AppException:
        raise
    except redis.RedisError as e:
        # Fail open — don't block users when Redis is unavailable
        logger.warning("Redis rate limit error: %s", e)


async def rate_limit_actions(current_user: User = Depends(get_current_user)) -> User:
    """Rate limiter for heavy AI / generation endpoints.

    Limit: 10 requests per minute per user.
    Use on: POST /tools/*, POST /generate, POST /copywriting, etc.
    """
    await _check_rate_limit(f"rate_limit:action:{current_user.id}", limit=10)
    return current_user


async def rate_limit_reads(current_user: User = Depends(get_current_user)) -> User:
    """Rate limiter for lightweight read / GET endpoints.

    Limit: 60 requests per minute per user.
    Use on: GET /tools/my-results, GET /designs/media, etc.
    """
    await _check_rate_limit(f"rate_limit:read:{current_user.id}", limit=60)
    return current_user


# ---------------------------------------------------------------------------
# Backward-compatible alias — existing imports keep working without changes
# ---------------------------------------------------------------------------
rate_limit_dependency = rate_limit_actions
