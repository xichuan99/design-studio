from app.core.exceptions import AppException, NotFoundError, ValidationError, InsufficientCreditsError, UnauthorizedError, ForbiddenError, ConflictError, InternalServerError
from app.schemas.error import ERROR_RESPONSES
import time
import redis.asyncio as redis
from fastapi import Depends
from app.core.config import settings
from app.api.deps import get_current_user
from app.models.user import User

# Shared redis client for rate limiting
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


async def rate_limit_dependency(current_user: User = Depends(get_current_user)):
    """
    Limits generation endpoint to 10 requests per minute per user.
    """
    limit = 10
    key = f"rate_limit:generate:{current_user.id}"
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
            raise AppException(status_code=429, detail="Too many design requests. Please wait a minute before generating again.",
            )
    except redis.RedisError as e:
        # If redis fails, fail open instead of breaking the app
        print(f"Redis rate limit error: {e}")
        pass

    return current_user
