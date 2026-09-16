"""
Adaptive Tarpit Delay Engine
Throttles aggressive automated bots and scanners by injecting calculated,
non-blocking delays, burning attacker thread pools and slowing recon sweeps.
"""

import asyncio
import time
from typing import Dict

# Tracks rapid requests per IP: ip -> (count, first_timestamp)
_tarpit_tracker: Dict[str, Dict[str, float]] = {}

class AdaptiveTarpit:
    """
    Calculates adaptive latency injection based on attacker aggression.
    """
    @staticmethod
    async def apply_tarpit(ip: str, aggression_score: int = 1):
        """
        Dynamically delays the response if an attacker is making burst attacks.
        Max delay is kept reasonable (e.g. 0.3s - 1.2s) to prevent exhausting server workers.
        """
        now = time.time()
        record = _tarpit_tracker.get(ip)
        
        if not record or (now - record["start_time"] > 60):
            _tarpit_tracker[ip] = {"count": 1, "start_time": now}
            delay = 0.0
        else:
            record["count"] += 1
            count = record["count"]
            # After 5 requests, progressively inject 100ms - 800ms jittered delay
            if count > 15:
                delay = min(1.2, 0.2 + (count * 0.05))
            elif count > 5:
                delay = 0.25
            else:
                delay = 0.0

        if delay > 0:
            await asyncio.sleep(delay)
        return delay

tarpit_engine = AdaptiveTarpit()
