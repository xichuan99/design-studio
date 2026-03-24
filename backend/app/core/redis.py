import logging
import redis.asyncio as redis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Shared redis client
redis_client = None
try:
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
except Exception as e:
    logger.error(f"Failed to initialize Redis client: {e}")
