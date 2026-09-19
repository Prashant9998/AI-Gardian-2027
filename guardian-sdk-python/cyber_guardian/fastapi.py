"""
FastAPI & Starlette middleware for AI Cyber Guardian.
Provides seamless 3-line zero-trust web application protection.
"""

from typing import Optional
import urllib.parse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from .client import GuardianClient
from .config import GuardianConfig


class GuardianFastAPIMiddleware(BaseHTTPMiddleware):
    """
    Starlette / FastAPI Middleware that intercepts all incoming requests,
    evaluates threat telemetry with sub-millisecond local caching, diverts
    decoy probes to the honeypot, and blocks malicious attacks.
    """

    def __init__(
        self,
        app,
        config: Optional[GuardianConfig] = None,
        client: Optional[GuardianClient] = None,
        **kwargs,
    ):
        super().__init__(app)
        if client is not None:
            self.client = client
        elif config is not None:
            self.client = GuardianClient(config=config)
        else:
            self.client = GuardianClient(**kwargs)

        self.config = self.client.config

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method

        # Extract Client IP (respecting reverse-proxy headers)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        elif request.client:
            client_ip = request.client.host
        else:
            client_ip = "127.0.0.1"

        if client_ip.startswith("::ffff:"):
            client_ip = client_ip.replace("::ffff:", "")

        user_agent = request.headers.get("user-agent", "Unknown")

        # 1. Intercept Deception Lures (Divert to Honeypot)
        if self.client.is_decoy(path):
            decoy_res = await self.client.divert_to_honeypot_async(
                path=path,
                client_ip=client_ip,
                user_agent=user_agent,
                method=method,
            )
            return Response(
                content=decoy_res["content"],
                status_code=decoy_res["status_code"],
                media_type=decoy_res["content_type"],
                headers={
                    "X-Guardian-Action": "HONEYPOT_TRAP",
                    "X-Guardian-Deception": "ACTIVE",
                },
            )

        # 2. Extract Body Snippet while preserving ASGI stream for downstream handlers
        body_snippet = ""
        if method in ("POST", "PUT", "PATCH", "DELETE"):
            try:
                body_bytes = await request.body()
                if body_bytes:
                    body_snippet = body_bytes[:2048].decode("utf-8", errors="replace")

                # Restore the receive channel so subsequent middleware and route handlers can read body
                async def receive():
                    return {"type": "http.request", "body": body_bytes, "more_body": False}

                request = Request(request.scope, receive=receive)
            except Exception:
                pass

        # 3. Build Telemetry Metadata
        raw_query = str(request.url.query)
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

        # 4. Evaluate Request via Guardian Client (Cache + Control Plane)
        decision = await self.client.evaluate_async(metadata)

        # 5. Handle Action: BLOCK
        if decision.get("action") == "BLOCK":
            return JSONResponse(
                status_code=self.config.block_status_code,
                content={
                    "error": "Forbidden",
                    "blocked_by": "AI Cyber Guardian",
                    "action": "BLOCK",
                    "severity": decision.get("severity", "HIGH"),
                    "threat_score": decision.get("score", 100),
                    "triggered_rules": decision.get("triggered_rules", []),
                    "message": self.config.shield_message,
                },
                headers={
                    "X-Guardian-Action": "BLOCK",
                    "X-Guardian-Score": str(decision.get("score", 100)),
                },
            )

        # 6. Proceed Down the App Pipeline
        response = await call_next(request)

        # 7. Attach Security & Audit Telemetry Headers
        response.headers["X-Guardian-Action"] = decision.get("action", "ALLOW")
        response.headers["X-Guardian-Score"] = str(decision.get("score", 0))
        response.headers["X-Guardian-Cache"] = "HIT" if decision.get("cached") else "MISS"

        return response
