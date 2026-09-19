"""
Flask extension and middleware for AI Cyber Guardian.
Provides seamless 3-line zero-trust web defense for Flask applications.
"""

from typing import Optional
import urllib.parse
from .client import GuardianClient
from .config import GuardianConfig


class GuardianFlaskMiddleware:
    """
    Flask extension that hooks into before_request and after_request lifecycle stages
    to inspect traffic, divert deception lures, and block malicious requests.
    """

    def __init__(
        self,
        app=None,
        config: Optional[GuardianConfig] = None,
        client: Optional[GuardianClient] = None,
        **kwargs,
    ):
        if client is not None:
            self.client = client
        elif config is not None:
            self.client = GuardianClient(config=config)
        else:
            self.client = GuardianClient(**kwargs)

        self.config = self.client.config

        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        """
        Register hooks on the Flask application instance.
        """
        try:
            from flask import request, g, jsonify, Response
        except ImportError:
            raise ImportError(
                "Flask is not installed. Install it with: pip install cyber-guardian[flask]"
            )

        @app.before_request
        def _guardian_before_request():
            path = request.path
            method = request.method

            # Extract client IP
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                client_ip = forwarded.split(",")[0].strip()
            else:
                client_ip = request.remote_addr or "127.0.0.1"

            if client_ip.startswith("::ffff:"):
                client_ip = client_ip.replace("::ffff:", "")

            user_agent = request.headers.get("User-Agent", "Unknown")

            # 1. Intercept Deception Lures
            if self.client.is_decoy(path):
                decoy_res = self.client.divert_to_honeypot_sync(
                    path=path,
                    client_ip=client_ip,
                    user_agent=user_agent,
                    method=method,
                )
                return Response(
                    decoy_res["content"],
                    status=decoy_res["status_code"],
                    mimetype=decoy_res["content_type"],
                    headers={
                        "X-Guardian-Action": "HONEYPOT_TRAP",
                        "X-Guardian-Deception": "ACTIVE",
                    },
                )

            # 2. Extract Body Snippet
            body_snippet = ""
            if request.data:
                try:
                    body_snippet = request.data[:2048].decode("utf-8", errors="replace")
                except Exception:
                    pass

            # 3. Build Telemetry Metadata
            raw_query = request.query_string.decode("utf-8", errors="replace")
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
            g._guardian_decision = decision

            # 5. Handle Action: BLOCK
            if decision.get("action") == "BLOCK":
                resp = jsonify({
                    "error": "Forbidden",
                    "blocked_by": "AI Cyber Guardian",
                    "action": "BLOCK",
                    "severity": decision.get("severity", "HIGH"),
                    "threat_score": decision.get("score", 100),
                    "triggered_rules": decision.get("triggered_rules", []),
                    "message": self.config.shield_message,
                })
                resp.status_code = self.config.block_status_code
                resp.headers["X-Guardian-Action"] = "BLOCK"
                resp.headers["X-Guardian-Score"] = str(decision.get("score", 100))
                return resp

            return None

        @app.after_request
        def _guardian_after_request(response):
            decision = getattr(g, "_guardian_decision", None)
            if decision:
                response.headers["X-Guardian-Action"] = decision.get("action", "ALLOW")
                response.headers["X-Guardian-Score"] = str(decision.get("score", 0))
                response.headers["X-Guardian-Cache"] = "HIT" if decision.get("cached") else "MISS"
            return response
