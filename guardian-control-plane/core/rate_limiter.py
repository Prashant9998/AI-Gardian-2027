import time
from typing import Tuple
from core.config import settings
from core.logger import app_logger
from db.redis_client import get_redis
import redis.asyncio as redis
from collections import defaultdict, deque
import threading

class RateLimitExceeded(Exception):
    def __init__(self, tier: str, limit: int, window: int):
        self.tier = tier
        self.limit = limit
        self.window = window
        super().__init__(f"Rate limit exceeded: {tier} ({limit} reqs / {window}s)")

_memory_windows = defaultdict(deque)
_memory_lock = threading.Lock()
_redis_unavailable_until: float = 0.0

def _check_in_memory(site_id: int, ip: str, tiers: list, now: float) -> Tuple[bool, str]:
    with _memory_lock:
        for tier_name, window, limit in tiers:
            key = f"rl:{site_id}:{ip}:{tier_name}"
            dq = _memory_windows[key]
            cutoff = now - window
            while dq and dq[0] < cutoff:
                dq.popleft()
            dq.append(now)
            if len(dq) > limit:
                app_logger.warning({
                    "message": "In-memory rate limit triggered",
                    "tier": tier_name,
                    "site_id": site_id,
                    "ip": ip,
                    "count": len(dq),
                    "limit": limit
                })
                return False, tier_name
    return True, "allowed"

async def check_rate_limit(site_id: int, ip: str, endpoint_type: str = "generic") -> Tuple[bool, str]:
    """
    Sliding-window rate limiter using Redis sorted sets (with thread-safe in-memory fallback).
    Implements three tiers: burst, sustained, and brute-force (login).
    """
    global _redis_unavailable_until
    now = time.time()
    
    # Define tiers: (name, window_seconds, limit)
    tiers = [
        ("burst", settings.get("burst_window_seconds", 10), settings.get("burst_limit", 50)),
        ("sustained", settings.get("sustained_window_seconds", 60), settings.get("sustained_limit", 150))
    ]
    
    if endpoint_type == "login":
        tiers.append((
            "brute_force", 
            settings.get("R4_window_seconds", 120), 
            settings.get("R4_attempt_threshold", 20)
        ))
        
    client = await get_redis()
    if client is None or now < _redis_unavailable_until:
        return _check_in_memory(site_id, ip, tiers, now)
        
    try:
        async with client.pipeline(transaction=True) as pipe:
            for tier_name, window, limit in tiers:
                key = f"rl:{site_id}:{ip}:{tier_name}"
                cutoff = now - window
                pipe.zremrangebyscore(key, "-inf", cutoff)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, window)
                
            results = await pipe.execute()
            
        for i, (tier_name, window, limit) in enumerate(tiers):
            current_count = results[i*4 + 2]
            
            if current_count > limit:
                app_logger.warning({
                    "message": "Rate limit triggered",
                    "tier": tier_name,
                    "site_id": site_id,
                    "ip": ip,
                    "count": current_count,
                    "limit": limit
                })
                return False, tier_name
                
        return True, "allowed"
        
    except redis.RedisError as e:
        _redis_unavailable_until = now + 15.0
        app_logger.warning(f"Redis unavailable ({e}). Falling back to thread-safe in-memory rate limiter.")
        return _check_in_memory(site_id, ip, tiers, now)
