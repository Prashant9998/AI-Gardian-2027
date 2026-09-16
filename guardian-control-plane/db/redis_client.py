import redis.asyncio as redis
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings
from core.logger import app_logger

try:
    redis_pool = redis.ConnectionPool.from_url(
        settings.redis_url, 
        decode_responses=True,
        socket_connect_timeout=0.05,
        socket_timeout=0.05
    )
    redis_client = redis.Redis(connection_pool=redis_pool)
except Exception as e:
    app_logger.error(f"Failed to initialize Redis client: {e}")
    redis_client = None

async def get_redis():
    return redis_client
