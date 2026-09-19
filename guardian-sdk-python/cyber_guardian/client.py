"""
Core client implementation for AI Cyber Guardian Python SDK.
Orchestrates request metadata evaluation, local decision caching, and honeypot diversion.
"""

import hashlib
import logging
from typing import Any, Dict, Optional
import httpx

from .config import GuardianConfig
from .cache import DecisionCache
from .telemetry import TelemetryDispatcher

logger = logging.getLogger("cyber_guardian.client")


class GuardianClient:
    """
    Main client for interacting with the AI Cyber Guardian Control Plane.
    """

    def __init__(self, config: Optional[GuardianConfig] = None, **kwargs):
        if config is None:
            self.config = GuardianConfig(**kwargs)
        else:
            self.config = config

        self.cache = DecisionCache(
            max_size=self.config.cache_max_size,
            default_ttl=self.config.cache_ttl,
        )

        self._sync_client = httpx.Client(
            timeout=self.config.timeout,
            headers={"X-API-Key": self.config.api_key},
        )
        self._async_client = httpx.AsyncClient(
            timeout=self.config.timeout,
            headers={"X-API-Key": self.config.api_key},
        )

        self.telemetry = None
        if self.config.async_telemetry:
            self.telemetry = TelemetryDispatcher(
                endpoint_url=self.config.telemetry_url,
                api_key=self.config.api_key,
                client=self._sync_client,
            )
            self.telemetry.start()

    def _get_cache_key(self, metadata: Dict[str, Any]) -> str:
        """
        Generate a deterministic cache key based on source IP and path.
        """
        ip = metadata.get("source_ip", "127.0.0.1")
        path = metadata.get("path", "/")
        query = metadata.get("query", "")
        # Include query hash if present to differentiate searches
        q_hash = hashlib.md5(query.encode("utf-8")).hexdigest()[:8] if query else ""
        return f"{ip}:{path}:{q_hash}"

    def is_decoy(self, path: str) -> bool:
        """Check if path is a deception honeypot lure."""
        return self.config.is_decoy(path)

    def is_exempt(self, path: str) -> bool:
        """Check if path is exempted from evaluation."""
        return self.config.is_exempt(path)

    # ─────────────────────────────────────────────────────────────
    # Synchronous Evaluation & Trap Diversion
    # ─────────────────────────────────────────────────────────────

    def evaluate_sync(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Synchronously evaluate request metadata.
        Returns a decision dictionary: {"action": "ALLOW"|"BLOCK", "score": int, ...}
        """
        path = metadata.get("path", "/")
        if self.is_exempt(path):
            return {
                "action": "ALLOW",
                "score": 0,
                "severity": "LOW",
                "triggered_rules": [],
                "cached": False,
                "exempt": True,
            }

        cache_key = self._get_cache_key(metadata)
        if self.config.cache_enabled:
            cached = self.cache.get(cache_key)
            if cached and cached.get("action") == "ALLOW":
                cached_res = dict(cached)
                cached_res["cached"] = True
                return cached_res

    def _query_control_plane_sync(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Send synchronous inspection request to Guardian Control Plane."""
        resp = self._sync_client.post(
            self.config.evaluate_url,
            json=metadata,
        )
        if resp.status_code == 200:
            return resp.json()
        logger.warning("Guardian Control Plane returned status %s", resp.status_code)
        if self.config.fail_open:
            return {"action": "ALLOW", "score": 0, "fail_open": True}
        return {"action": "BLOCK", "score": 100, "status_code": resp.status_code}

    def evaluate_sync(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Synchronously evaluate request metadata.
        Returns a decision dictionary: {"action": "ALLOW"|"BLOCK", "score": int, ...}
        """
        path = metadata.get("path", "/")
        if self.is_exempt(path):
            return {
                "action": "ALLOW",
                "score": 0,
                "severity": "LOW",
                "triggered_rules": [],
                "cached": False,
                "exempt": True,
            }

        cache_key = self._get_cache_key(metadata)
        if self.config.cache_enabled:
            cached = self.cache.get(cache_key)
            if cached and cached.get("action") == "ALLOW":
                cached_res = dict(cached)
                cached_res["cached"] = True
                return cached_res

        # Query Control Plane
        try:
            data = self._query_control_plane_sync(metadata)
            action = data.get("action", "ALLOW")
            score = data.get("score", 0)

            # Cache clean responses
            if self.config.cache_enabled and action == "ALLOW" and score < 30 and not data.get("fail_open"):
                self.cache.set(cache_key, {
                    "action": action,
                    "score": score,
                    "severity": data.get("severity", "LOW"),
                    "triggered_rules": data.get("triggered_rules", []),
                })

            data["cached"] = False
            return data

        except Exception as exc:
            logger.warning("Guardian evaluation error: %s", exc)
            if self.config.fail_open:
                return {"action": "ALLOW", "score": 0, "fail_open": True, "error": str(exc)}
            raise

    def divert_to_honeypot_sync(
        self,
        path: str,
        client_ip: str,
        user_agent: str,
        method: str = "GET",
    ) -> Dict[str, Any]:
        """
        Synchronously divert an attacker probe to the Guardian Honeypot.
        """
        try:
            headers = {
                "X-API-Key": self.config.api_key,
                "X-Target-Path": path,
                "Content-Type": "application/json",
            }
            payload = {
                "ip": client_ip,
                "path": path,
                "user_agent": user_agent,
                "method": method,
            }
            resp = self._sync_client.post(
                self.config.honeypot_trap_url,
                headers=headers,
                json=payload,
            )
            content_type = resp.headers.get("content-type", "application/json")
            return {
                "status_code": 200,
                "content": resp.text,
                "content_type": content_type,
            }
        except Exception as exc:
            logger.warning("Honeypot diversion failure: %s", exc)
            # Default decoy fallback
            return {
                "status_code": 200,
                "content": '{"status": "trapped", "canary": "CANARY_TOKEN_ACTIVATED"}',
                "content_type": "application/json",
            }

    # ─────────────────────────────────────────────────────────────
    # Asynchronous Evaluation & Trap Diversion
    # ─────────────────────────────────────────────────────────────

    async def evaluate_async(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Asynchronously evaluate request metadata.
        """
        path = metadata.get("path", "/")
        if self.is_exempt(path):
            return {
                "action": "ALLOW",
                "score": 0,
                "severity": "LOW",
                "triggered_rules": [],
                "cached": False,
                "exempt": True,
            }

        cache_key = self._get_cache_key(metadata)
        if self.config.cache_enabled:
            cached = self.cache.get(cache_key)
            if cached and cached.get("action") == "ALLOW":
                cached_res = dict(cached)
                cached_res["cached"] = True
                return cached_res

    async def _query_control_plane_async(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Send asynchronous inspection request to Guardian Control Plane."""
        resp = await self._async_client.post(
            self.config.evaluate_url,
            json=metadata,
        )
        if resp.status_code == 200:
            return resp.json()
        logger.warning("Guardian Control Plane returned status %s", resp.status_code)
        if self.config.fail_open:
            return {"action": "ALLOW", "score": 0, "fail_open": True}
        return {"action": "BLOCK", "score": 100, "status_code": resp.status_code}

    async def evaluate_async(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Asynchronously evaluate request metadata.
        """
        path = metadata.get("path", "/")
        if self.is_exempt(path):
            return {
                "action": "ALLOW",
                "score": 0,
                "severity": "LOW",
                "triggered_rules": [],
                "cached": False,
                "exempt": True,
            }

        cache_key = self._get_cache_key(metadata)
        if self.config.cache_enabled:
            cached = self.cache.get(cache_key)
            if cached and cached.get("action") == "ALLOW":
                cached_res = dict(cached)
                cached_res["cached"] = True
                return cached_res

        try:
            data = await self._query_control_plane_async(metadata)
            action = data.get("action", "ALLOW")
            score = data.get("score", 0)

            if self.config.cache_enabled and action == "ALLOW" and score < 30 and not data.get("fail_open"):
                self.cache.set(cache_key, {
                    "action": action,
                    "score": score,
                    "severity": data.get("severity", "LOW"),
                    "triggered_rules": data.get("triggered_rules", []),
                })

            data["cached"] = False
            return data

        except Exception as exc:
            logger.warning("Guardian evaluation error (async): %s", exc)
            if self.config.fail_open:
                return {"action": "ALLOW", "score": 0, "fail_open": True, "error": str(exc)}
            raise

    async def divert_to_honeypot_async(
        self,
        path: str,
        client_ip: str,
        user_agent: str,
        method: str = "GET",
    ) -> Dict[str, Any]:
        """
        Asynchronously divert an attacker probe to the Guardian Honeypot.
        """
        try:
            headers = {
                "X-API-Key": self.config.api_key,
                "X-Target-Path": path,
                "Content-Type": "application/json",
            }
            payload = {
                "ip": client_ip,
                "path": path,
                "user_agent": user_agent,
                "method": method,
            }
            resp = await self._async_client.post(
                self.config.honeypot_trap_url,
                headers=headers,
                json=payload,
            )
            content_type = resp.headers.get("content-type", "application/json")
            return {
                "status_code": 200,
                "content": resp.text,
                "content_type": content_type,
            }
        except Exception as exc:
            logger.warning("Honeypot diversion failure (async): %s", exc)
            return {
                "status_code": 200,
                "content": '{"status": "trapped", "canary": "CANARY_TOKEN_ACTIVATED"}',
                "content_type": "application/json",
            }

    def close(self) -> None:
        """Close clients and stop workers."""
        if self.telemetry:
            self.telemetry.stop()
        self._sync_client.close()
