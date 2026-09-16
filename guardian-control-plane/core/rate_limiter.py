import time
from typing import Tuple
from core.config import settings
from core.logger import app_logger
from db.redis_client import get_redis
import redis.asyncio as redis

class RateLimitExceeded(Exception):
    def __init__(self, tier: str, limit: int, window: int):
        self.tier = tier
        self.limit = limit
        self.window = window
        super().__init__(f"Rate limit exceeded: {tier} ({limit} reqs / {window}s)")

from collections import defaultdict, deque
import threading

_memory_windows = defaultdict(deque)
_memory_lock = threading.Lock()

async def check_rate_limit(site_id: int, ip: str, endpoint_type: str = "generic") -> Tuple[bool, str]:
    """
    Sliding-window rate limiter using Redis sorted sets (with local in-memory fallback).
    Implements three tiers: burst, sustained, and brute-force (login).
    """
    client = await get_redis()
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
        
    if client is None:
        # IN-MEMORY FALLBACK (Local Development & Testing)
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
        
    now = time.time()
    
    # Define tiers: (name, window_seconds, limit, is_specific_endpoint)
    tiers = [
        ("burst", settings.get("burst_window_seconds", 10), settings.get("burst_limit", 50), None),
        ("sustained", settings.get("sustained_window_seconds", 60), settings.get("sustained_limit", 150), None)
    ]
    
    # R4 Brute-force tier applies only to logins
    if endpoint_type == "login":
        tiers.append((
            "brute_force", 
            settings.get("R4_window_seconds", 120), 
            settings.get("R4_attempt_threshold", 20), 
            "login"
        ))
        
    try:
        async with client.pipeline(transaction=True) as pipe:
            for tier_name, window, limit, specific_endpoint in tiers:
                # Use a specific key for the tier to isolate limits
                key = f"rl:{site_id}:{ip}:{tier_name}"
                cutoff = now - window
                
                # ZREMRANGEBYSCORE key -inf cutoff (Remove old events)
                pipe.zremrangebyscore(key, "-inf", cutoff)
                
                # ZADD key {now: now} (Add current event)
                # Redis requires a mapping for ZADD: {member: score}. We use timestamp for both.
                pipe.zadd(key, {str(now): now})
                
                # ZCARD key (Count elements in window)
                pipe.zcard(key)
                
                # EXPIRE key window (Set expiration to clean up unused keys)
                pipe.expire(key, window)
                
            results = await pipe.execute()
            
        # Parse pipeline results
        # results contains 4 responses per tier: [removed_count, add_count, current_count, expire_result]
        for i, (tier_name, window, limit, _) in enumerate(tiers):
            current_count = results[i*4 + 2]
            
            if current_count > limit:
                # Rate limit triggered!
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
        # FAIL-OPEN BEHAVIOR (During active execution failure)
        app_logger.critical({
            "message": f"Redis execution error: {e}. Rate limiter failing OPEN.",
            "site_id": site_id,
            "ip": ip,
            "severity": "CRITICAL"
        })
        return True, "allowed"
