import logging
import redis
import redis.asyncio as redis_async
from app.core.config import settings

logger = logging.getLogger(__name__)

# Shared redis client
redis_client = None
redis_sync_client = None
try:
    redis_client = redis_async.from_url(settings.REDIS_URL, decode_responses=True)
except Exception as e:
    logger.error(f"Failed to initialize Redis client: {e}")

try:
    redis_sync_client = redis.Redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
    )
except Exception as e:
    logger.error(f"Failed to initialize sync Redis client: {e}")
