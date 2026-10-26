"""
AI Cyber Guardian — Zero-Code Reverse Proxy Gateway Router.
Allows website owners to protect any web application without installing SDKs or modifying code.
Intercepts incoming HTTP requests, performs AI Threat Fusion & Rate Limiting,
blocks attacks with HTTP 403, traps zero-days in honeypots, and transparently
forwards clean traffic to the upstream target website.
"""

import os
import sys
import uuid
import datetime
import httpx
from typing import Optional
from fastapi import APIRouter, Request, Response, BackgroundTasks, Depends
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse, StreamingResponse
from sqlalchemy.orm import Session

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.database import get_db
from core.config import settings
from core.ip_filter import ip_filter
from core.rate_limiter import check_rate_limit
from core.rules import RuleEngine
from core.ml_engine import fusion_engine
from core.decision_engine import decision_engine
from core.logger import app_logger
from api.routers.ws import broadcast_threat_event
from api.routers.ingestion import log_security_event
from honeypot.tarpit import tarpit_engine
from honeypot.surfaces import (
    get_decoy_env_file,
    get_decoy_git_config,
    get_decoy_wordpress_login,
    get_decoy_actuator_env
)

router = APIRouter(prefix="/proxy", tags=["Zero-Code Reverse Proxy Gateway"])

rule_engine = RuleEngine(config=None)

DEFAULT_UPSTREAM = os.getenv("UPSTREAM_TARGET_URL", "http://target-app:3001")

HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length"
}

def generate_waf_block_html(score: float, severity: str, rule: str, ip: str, path: str) -> str:
    """Generates a professional, branded AI Cyber Guardian WAF Block page."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 Forbidden — Blocked by AI Cyber Guardian</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            background: radial-gradient(circle at 50% 20%, #111827 0%, #030712 100%);
            color: #f3f4f6;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }}
        .card {{
            background: rgba(17, 24, 39, 0.85);
            border: 1px solid rgba(239, 68, 68, 0.35);
            box-shadow: 0 0 50px rgba(239, 68, 68, 0.15), 0 20px 40px rgba(0, 0, 0, 0.6);
            border-radius: 16px;
            max-width: 620px;
            width: 100%;
            padding: 40px;
            backdrop-filter: blur(12px);
            text-align: center;
        }}
        .icon-wrap {{
            width: 80px;
            height: 80px;
            background: rgba(239, 68, 68, 0.15);
            border: 2px solid #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
        }}
        .icon-wrap svg {{
            width: 44px;
            height: 44px;
            stroke: #ef4444;
            fill: none;
            stroke-width: 2;
        }}
        h1 {{
            font-size: 26px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
        }}
        .subtitle {{
            color: #9ca3af;
            font-size: 14px;
            margin-bottom: 28px;
        }}
        .badge {{
            display: inline-block;
            background: #ef4444;
            color: #ffffff;
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 1px;
            padding: 4px 12px;
            border-radius: 9999px;
            text-transform: uppercase;
            margin-bottom: 24px;
        }}
        .details-grid {{
            background: rgba(3, 7, 18, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            padding: 20px;
            text-align: left;
            margin-bottom: 24px;
            font-size: 13px;
        }}
        .row {{
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }}
        .row:last-child {{ border-bottom: none; }}
        .label {{ color: #9ca3af; }}
        .value {{ color: #e5e7eb; font-weight: 600; font-family: monospace; }}
        .footer {{
            color: #6b7280;
            font-size: 12px;
            line-height: 1.5;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-wrap">
            <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        </div>
        <div class="badge">{severity} THREAT DETECTED</div>
        <h1>Access Denied by WAF Shield</h1>
        <p class="subtitle">Your request was flagged and blocked by autonomous AI threat analysis.</p>

        <div class="details-grid">
            <div class="row">
                <span class="label">Client IP Address:</span>
                <span class="value">{ip}</span>
            </div>
            <div class="row">
                <span class="label">Requested Path:</span>
                <span class="value">{path}</span>
            </div>
            <div class="row">
                <span class="label">Threat Score:</span>
                <span class="value" style="color: #ef4444;">{score}/100</span>
            </div>
            <div class="row">
                <span class="label">Triggered Policy:</span>
                <span class="value">{rule}</span>
            </div>
            <div class="row">
                <span class="label">Defense Layer:</span>
                <span class="value">AI Cyber Guardian Threat Fusion Engine</span>
            </div>
        </div>

        <p class="footer">
            Protected autonomously by AI Cyber Guardian &bull; Incident telemetry has been dispatched to the Security Operations Center (SOC).
        </p>
    </div>
</body>
</html>"""


@router.get("/status")
async def proxy_status():
    """Diagnostic health endpoint for the reverse proxy gateway."""
    return {
        "status": "active",
        "service": "AI Cyber Guardian Zero-Code Reverse Proxy Gateway",
        "configured_upstream": DEFAULT_UPSTREAM,
        "features": [
            "AI Threat Fusion (Rules + ML)",
            "Automatic Rate Limiting",
            "Real-Time SOC WebSocket Streaming",
            "Autonomous Honeypot Deception",
            "Zero Code Application Protection"
        ]
    }


@router.api_route("/{target_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
async def reverse_proxy_handler(
    target_path: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Transparent Reverse Proxy Gateway Handler:
    1. Intercepts incoming requests destined for the target website.
    2. Runs Ingress Filters + Rule Engine + ML Anomaly Detection.
    3. Blocks attacks with HTTP 403 or traps them in deception honeypots.
    4. Forwards clean traffic to the upstream target website and streams the response back.
    """
    path_with_slash = "/" + target_path if not target_path.startswith("/") else target_path
    
    # ── 1. Determine Upstream Website URL ──────────────────────────────────
    # Check custom header first (allows dynamically proxying multiple sites),
    # then query parameter, then environment default.
    upstream_base = request.headers.get("x-guardian-upstream-url")
    if not upstream_base:
        upstream_base = request.query_params.get("__guardian_upstream")
    if not upstream_base:
        upstream_base = DEFAULT_UPSTREAM
    
    upstream_base = upstream_base.rstrip("/")

    # ── 2. Extract Client IP & Request Metadata ────────────────────────────
    client_ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or (request.client.host if request.client else "127.0.0.1")
    )
    if "::ffff:" in client_ip:
        client_ip = client_ip.replace("::ffff:", "")
    if client_ip in ["testclient", "localhost"]:
        client_ip = "127.0.0.1"

    # Read raw body safely
    try:
        raw_body_bytes = await request.body()
        body_text = raw_body_bytes.decode("utf-8", errors="replace")
    except Exception:
        raw_body_bytes = b""
        body_text = ""

    body_snippet = body_text[:2048] if len(body_text) > 2048 else body_text
    query_str = str(request.url.query) if request.url.query else ""
    user_agent = request.headers.get("user-agent", "Unknown")

    payload = {
        "source_ip": client_ip,
        "method": request.method,
        "path": path_with_slash,
        "query": query_str,
        "headers": {
            "User-Agent": user_agent
        },
        "endpoint_type": "login" if ("login" in path_with_slash.lower() or "auth" in path_with_slash.lower()) else "generic",
        "body": body_snippet
    }

    site_id = 1  # Default master site ID for reverse proxy

    # ── 3. High-Value Decoy Lures (Direct Honeypot Trap) ───────────────────
    if path_with_slash in ["/.env", "/.git/config", "/wp-login.php", "/actuator/env", "/phpmyadmin"]:
        app_logger.warning(f"Decoy Honeytoken trap hit at {path_with_slash} by {client_ip}")
        await tarpit_engine.apply_tarpit(client_ip)

        decoy_event = {
            "event_type": "THREAT_EVENT",
            "id": f"evt-decoy-{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "time": datetime.datetime.now().strftime("%H:%M:%S"),
            "ip": client_ip,
            "country": "🌐 External Host",
            "countryName": "External",
            "city": "Edge Decoy",
            "isp": "Attacker Scanner",
            "rule_id": "DECEPTION_HONEYPOT",
            "attack_type": "DecoyProbe",
            "type": "Honeypot",
            "score": 95.0,
            "level": "CRITICAL",
            "severity": "CRITICAL",
            "path": path_with_slash,
            "method": request.method,
            "payload": f"Scanned known honeypot lure: {path_with_slash}",
            "status": "Trapped in Honeypot",
            "action": "HONEYPOT",
            "triggered_rules": ["DECEPTION_HONEYPOT_LURE"]
        }
        background_tasks.add_task(broadcast_threat_event, decoy_event)
        background_tasks.add_task(
            log_security_event,
            db, site_id, payload, 90.0, 95.0, 95.0, "CRITICAL", "HONEYPOT", ["DECEPTION_HONEYPOT_LURE"]
        )

        if path_with_slash == "/.env":
            return PlainTextResponse(get_decoy_env_file(), media_type="text/plain")
        elif path_with_slash == "/.git/config":
            return PlainTextResponse(get_decoy_git_config(), media_type="text/plain")
        elif path_with_slash == "/wp-login.php":
            return HTMLResponse(get_decoy_wordpress_login(), status_code=200)
        elif path_with_slash == "/actuator/env":
            return JSONResponse(get_decoy_actuator_env(), status_code=200)

    # ── 4. Stage 1: Ingress Filters (IP & Rate Limiting) ───────────────────
    ip_action = ip_filter.evaluate(client_ip)
    if ip_action == "BLOCK":
        return HTMLResponse(
            generate_waf_block_html(100.0, "CRITICAL", "IP_BLOCKLIST", client_ip, path_with_slash),
            status_code=403
        )

    if ip_action != "ALLOW":
        is_allowed, rl_tier = await check_rate_limit(site_id, client_ip, endpoint_type=payload["endpoint_type"])
        if not is_allowed:
            rl_event = {
                "event_type": "THREAT_EVENT",
                "id": f"evt-rl-{uuid.uuid4().hex[:8]}",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "time": datetime.datetime.now().strftime("%H:%M:%S"),
                "ip": client_ip,
                "country": "🌐 External Host",
                "countryName": "External",
                "city": "Cloud Edge",
                "isp": "Client Network",
                "rule_id": "R4_RATE_LIMIT",
                "attack_type": "R4_RATE_LIMIT",
                "type": "BruteForce",
                "score": 80.0,
                "level": "HIGH",
                "severity": "HIGH",
                "path": path_with_slash,
                "method": request.method,
                "payload": f"Rate limit exceeded ({rl_tier})",
                "status": "Blocked by WAF",
                "action": "BLOCK",
                "triggered_rules": ["R4_RATE_LIMIT"]
            }
            background_tasks.add_task(broadcast_threat_event, rl_event)
            return HTMLResponse(
                generate_waf_block_html(80.0, "HIGH", f"RATE_LIMIT_EXCEEDED ({rl_tier})", client_ip, path_with_slash),
                status_code=429
            )

    # ── 5. Stage 2 & 3: Deep AI Threat Fusion & Decision Engine ────────────
    rule_result = rule_engine.evaluate(payload)
    final_score = fusion_engine.fuse(
        rule_score=rule_result.total_score,
        is_critical_override=rule_result.is_critical_override,
        request=payload
    )
    ml_score_raw = fusion_engine.ml_engine.evaluate(payload)

    severity = decision_engine.evaluate_score(final_score)
    if rule_result.is_critical_override:
        severity = "CRITICAL"
    action = decision_engine.map_severity_to_action(severity)

    triggered_rule_names = [r["rule"] for r in rule_result.triggered_rules]
    primary_rule = triggered_rule_names[0] if triggered_rule_names else ("R4_BRUTE_FORCE" if rule_result.is_critical_override else ("ML_ANOMALY" if final_score >= 30 else "CLEAN_TRAFFIC"))

    # ── 6. Handle Malicious Traffic (BLOCK or HONEYPOT) ─────────────────────
    if action in ["BLOCK", "HONEYPOT"]:
        threat_event = {
            "event_type": "THREAT_EVENT",
            "id": f"evt-{uuid.uuid4().hex[:10]}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "time": datetime.datetime.now().strftime("%H:%M:%S"),
            "ip": client_ip,
            "country": "🌐 External Host",
            "countryName": "External",
            "city": "Cloud Edge",
            "isp": "Client Network",
            "rule_id": primary_rule,
            "attack_type": primary_rule,
            "type": primary_rule.split("_")[-1].capitalize() if "_" in primary_rule else "Threat",
            "score": round(float(final_score), 1),
            "level": severity,
            "severity": severity,
            "path": path_with_slash,
            "method": request.method,
            "payload": str(payload.get("query") or payload.get("body") or payload.get("headers", ""))[:250],
            "status": "Blocked by WAF" if action == "BLOCK" else "Trapped in Honeypot",
            "action": action,
            "triggered_rules": triggered_rule_names
        }
        background_tasks.add_task(broadcast_threat_event, threat_event)
        background_tasks.add_task(
            log_security_event,
            db, site_id, payload, rule_result.total_score, ml_score_raw, final_score, severity, action, triggered_rule_names
        )

        accept_header = request.headers.get("accept", "")
        if "application/json" in accept_header or request.headers.get("content-type") == "application/json":
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Access Denied by AI Cyber Guardian",
                    "status": 403,
                    "decision": action,
                    "severity": severity,
                    "threat_score": final_score,
                    "triggered_rules": triggered_rule_names,
                    "ip": client_ip,
                    "path": path_with_slash
                }
            )

        return HTMLResponse(
            generate_waf_block_html(final_score, severity, primary_rule, client_ip, path_with_slash),
            status_code=403
        )

    # ── 7. Handle Monitored Clean Traffic (ALLOW or ALERT) ─────────────────
    if action == "ALERT":
        alert_event = {
            "event_type": "THREAT_EVENT",
            "id": f"evt-alert-{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "time": datetime.datetime.now().strftime("%H:%M:%S"),
            "ip": client_ip,
            "country": "🌐 External Host",
            "countryName": "External",
            "city": "Cloud Edge",
            "isp": "Client Network",
            "rule_id": primary_rule,
            "attack_type": primary_rule,
            "type": "Suspicious",
            "score": round(float(final_score), 1),
            "level": severity,
            "severity": severity,
            "path": path_with_slash,
            "method": request.method,
            "payload": str(payload.get("query") or payload.get("body", ""))[:250],
            "status": "Monitored",
            "action": "ALERT",
            "triggered_rules": triggered_rule_names
        }
        background_tasks.add_task(broadcast_threat_event, alert_event)

    # Log to PostgreSQL
    background_tasks.add_task(
        log_security_event,
        db, site_id, payload, rule_result.total_score, ml_score_raw, final_score, severity, action, triggered_rule_names
    )

    # ── 8. Forward Clean Traffic to Upstream Website ───────────────────────
    target_full_url = f"{upstream_base}{path_with_slash}"
    if query_str:
        target_full_url = f"{target_full_url}?{query_str}"

    forward_headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in HOP_BY_HOP_HEADERS and not k.lower().startswith("x-guardian-")
    }
    forward_headers["x-forwarded-for"] = client_ip
    forward_headers["x-guardian-inspected"] = "true"
    forward_headers["x-guardian-score"] = str(round(float(final_score), 1))

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=False) as client:
            upstream_response = await client.request(
                method=request.method,
                url=target_full_url,
                headers=forward_headers,
                content=raw_body_bytes
            )

            # Strip upstream hop-by-hop response headers
            response_headers = {
                k: v for k, v in upstream_response.headers.items()
                if k.lower() not in HOP_BY_HOP_HEADERS
            }
            response_headers["x-protected-by"] = "AI Cyber Guardian"

            return Response(
                content=upstream_response.content,
                status_code=upstream_response.status_code,
                headers=response_headers,
                media_type=upstream_response.headers.get("content-type")
            )

    except httpx.RequestError as exc:
        app_logger.error(f"Reverse proxy upstream failure ({target_full_url}): {exc}")
        return JSONResponse(
            status_code=502,
            content={
                "error": "Bad Gateway — Upstream Service Unavailable",
                "message": f"AI Cyber Guardian could not connect to upstream website at: {upstream_base}",
                "detail": str(exc),
                "inspected_by": "AI Cyber Guardian Reverse Proxy Gateway"
            }
        )
