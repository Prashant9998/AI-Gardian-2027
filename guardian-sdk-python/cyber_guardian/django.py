"""
Django middleware for AI Cyber Guardian.
Provides standard Django middleware integration for zero-trust protection.
"""

from typing import Optional
import urllib.parse
from .client import GuardianClient
from .config import GuardianConfig

try:
    from django.http import HttpResponse, JsonResponse
    from django.utils.deprecation import MiddlewareMixin
    DJANGO_AVAILABLE = True
except ImportError:
    # Standalone mock base class if Django is not installed in the environment
    DJANGO_AVAILABLE = False
    MiddlewareMixin = object
    HttpResponse = None
    JsonResponse = None


class GuardianDjangoMiddleware(MiddlewareMixin):
    """
    Django middleware conforming to Django's standard middleware signature:
    MIDDLEWARE = [
        ...
        'cyber_guardian.django.GuardianDjangoMiddleware',
    ]
    """

    def __init__(
        self,
        get_response=None,
        config: Optional[GuardianConfig] = None,
        client: Optional[GuardianClient] = None,
        **kwargs,
    ):
        self.get_response = get_response
        if client is not None:
            self.client = client
        elif config is not None:
            self.client = GuardianClient(config=config)
        else:
            self.client = GuardianClient(**kwargs)

        self.config = self.client.config

    def __call__(self, request):
        path = getattr(request, "path", "/")
        method = getattr(request, "method", "GET")

        # Extract Client IP
        meta = getattr(request, "META", {})
        forwarded = meta.get("HTTP_X_FORWARDED_FOR")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = meta.get("REMOTE_ADDR", "127.0.0.1")

        if client_ip.startswith("::ffff:"):
            client_ip = client_ip.replace("::ffff:", "")

        user_agent = meta.get("HTTP_USER_AGENT", "Unknown")

        # 1. Intercept Deception Lures
        if self.client.is_decoy(path):
            decoy_res = self.client.divert_to_honeypot_sync(
                path=path,
                client_ip=client_ip,
                user_agent=user_agent,
                method=method,
            )
            if DJANGO_AVAILABLE:
                resp = HttpResponse(
                    decoy_res["content"],
                    content_type=decoy_res["content_type"],
                    status=decoy_res["status_code"],
                )
                resp["X-Guardian-Action"] = "HONEYPOT_TRAP"
                resp["X-Guardian-Deception"] = "ACTIVE"
                return resp
            else:
                return {
                    "status_code": decoy_res["status_code"],
                    "content": decoy_res["content"],
                    "content_type": decoy_res["content_type"],
                }

        # 2. Extract Body Snippet
        body_snippet = ""
        try:
            raw_body = getattr(request, "body", b"")
            if raw_body:
                body_snippet = raw_body[:2048].decode("utf-8", errors="replace")
        except Exception:
            pass

        # 3. Build Telemetry Metadata
        raw_query = meta.get("QUERY_STRING", "")
        unquoted_query = urllib.parse.unquote_plus(raw_query) if raw_query else ""

        metadata = {
            "source_ip": client_ip,
            "method": method,
            "path": path,
            "query": unquoted_query,
            "headers": {"User-Agent": user_agent},
            "endpoint_type": "login" if any(k in path.lower() for k in ("login", "auth")) else "generic",
            "body": body_snippet,
        }

        # 4. Synchronously evaluate
        decision = self.client.evaluate_sync(metadata)

        # 5. Handle Action: BLOCK
        if decision.get("action") == "BLOCK":
            block_content = {
                "error": "Forbidden",
                "blocked_by": "AI Cyber Guardian",
                "action": "BLOCK",
                "severity": decision.get("severity", "HIGH"),
                "threat_score": decision.get("score", 100),
                "triggered_rules": decision.get("triggered_rules", []),
                "message": self.config.shield_message,
            }
            if DJANGO_AVAILABLE and JsonResponse:
                resp = JsonResponse(block_content, status=self.config.block_status_code)
                resp["X-Guardian-Action"] = "BLOCK"
                resp["X-Guardian-Score"] = str(decision.get("score", 100))
                return resp
            else:
                return {
                    "status_code": self.config.block_status_code,
                    "content": block_content,
                    "action": "BLOCK",
                }

        # 6. Proceed to view
        if self.get_response:
            response = self.get_response(request)
            if hasattr(response, "__setitem__"):
                response["X-Guardian-Action"] = decision.get("action", "ALLOW")
                response["X-Guardian-Score"] = str(decision.get("score", 0))
                response["X-Guardian-Cache"] = "HIT" if decision.get("cached") else "MISS"
            return response

        return decision
