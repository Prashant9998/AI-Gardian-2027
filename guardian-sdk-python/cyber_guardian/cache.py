"""
Thread-safe in-memory LRU Decision Cache with TTL for the AI Cyber Guardian SDK.
Provides sub-millisecond (< 0.1ms) lookups for clean repeat traffic.
"""

from collections import OrderedDict
import threading
import time
from typing import Any, Dict, Optional, Tuple


class DecisionCache:
    """
    LRU Cache with per-entry Time-To-Live (TTL) expiration and thread-safe locking.
    """

    def __init__(self, max_size: int = 2048, default_ttl: int = 60):
        self.max_size = max(1, max_size)
        self.default_ttl = max(1, default_ttl)
        self._cache: OrderedDict[str, Tuple[Any, float]] = OrderedDict()
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0
        self._evictions = 0

    def get(self, key: str) -> Optional[Any]:
        """
        Retrieve an entry by key if it exists and has not expired.
        Moves the accessed key to the end of the OrderedDict (most recently used).
        """
        now = time.time()
        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None

            value, expires_at = self._cache[key]
            if now > expires_at:
                # Expired
                del self._cache[key]
                self._misses += 1
                return None

            # Hit: move to most recent
            self._cache.move_to_end(key)
            self._hits += 1
            return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Store a key-value pair with expiration. Evicts the oldest entry if max_size is reached.
        """
        now = time.time()
        lifetime = ttl if ttl is not None and ttl > 0 else self.default_ttl
        expires_at = now + lifetime

        with self._lock:
            if key in self._cache:
                self._cache[key] = (value, expires_at)
                self._cache.move_to_end(key)
                return

            # Evict if full
            while len(self._cache) >= self.max_size:
                self._cache.popitem(last=False)
                self._evictions += 1

            self._cache[key] = (value, expires_at)

    def invalidate(self, key: str) -> bool:
        """
        Explicitly remove a key from the cache.
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def clear(self) -> None:
        """
        Flush all items and reset metrics.
        """
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0
            self._evictions = 0

    def stats(self) -> Dict[str, Any]:
        """
        Return performance metrics of the cache.
        """
        with self._lock:
            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "default_ttl": self.default_ttl,
                "hits": self._hits,
                "misses": self._misses,
                "evictions": self._evictions,
                "hit_ratio": (
                    round(self._hits / (self._hits + self._misses), 4)
                    if (self._hits + self._misses) > 0
                    else 0.0
                ),
            }
