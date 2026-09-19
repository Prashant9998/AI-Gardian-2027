"""
Professional Honeypot & Deception API Router
Full-featured enterprise deception surface supporting:
- Stateful Virtual Bash Shell & VFS
- High-Value Decoy Attack Surfaces (/.env, /.git, /wp-login.php, /actuator/env)
- Active Canary Honeytoken Tracking
- Adaptive Tarpit Delay Injection
- STIX 2.1 Threat Intelligence Export for SIEM Integration
"""

from fastapi import APIRouter, Depends, Request, BackgroundTasks, Response
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from sqlalchemy.orm import Session
import os
import sys
import json
import uuid

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.database import get_db
from models.honeypot_schema import HoneypotAttackerProfile, HoneypotInteractionLog
from honeypot.engine import DeceptionEngine
from honeypot.profiler import AttackerProfiler
from honeypot.canary import canary_engine
from honeypot.tarpit import tarpit_engine
from honeypot.stix_export import stix_exporter
from honeypot.surfaces import (
    get_decoy_env_file,
    get_decoy_git_config,
    get_decoy_wordpress_login,
    get_decoy_actuator_env
)
from core.api_key_auth import get_api_key
from core.logger import app_logger
from api.routers.ws import broadcast_threat_event
import datetime

router = APIRouter(prefix="/api/v1/honeypot", tags=["Professional Honeypot & Deception"])

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "honeypot", "templates")

@router.post("/trap")
async def honeypot_trap(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Main stateful deception trap endpoint.
    Called when a request is categorized as CRITICAL or forwarded by the SDK.
    Employs adaptive tarpitting, stateful virtual filesystem execution, and forensic logging.
    """
    try:
        raw_body = await request.body()
        body_text = raw_body.decode("utf-8", errors="replace")
    except Exception:
        body_text = ""

    source_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "127.0.0.1")
    user_agent = request.headers.get("user-agent", "Unknown")
    session_id = request.headers.get("x-session-id", str(uuid.uuid4())[:8])
    headers_dict = dict(request.headers)

    # 1. Adaptive Tarpit Throttling (Slowing down aggressive crawlers/bots)
    await tarpit_engine.apply_tarpit(source_ip)

    target_path = request.headers.get("x-target-path", request.url.path)
    payload_summary = {
        "path": target_path,
        "query": str(request.query_params),
        "body": body_text,
        "method": request.method,
        "endpoint_type": "login" if "login" in target_path.lower() else "generic"
    }

    # 2. Generate context-aware stateful deception
    deception_type, deception_data, attack_category = DeceptionEngine.generate_response(
        payload=payload_summary,
        session_id=session_id,
        ip=source_ip
    )

    # 3. Extract credentials if attempted in body
    extracted_creds = None
    if "user" in body_text.lower() or "pass" in body_text.lower():
        try:
            parsed_json = json.loads(body_text)
            extracted_creds = {k: v for k, v in parsed_json.items() if any(c in k.lower() for c in ["user", "pass", "admin", "token", "key"])}
        except Exception:
            extracted_creds = {"raw_credential_attempt": body_text[:120]}

    # 4. Asynchronously record attacker profile & interaction log in DB
    def log_honeypot_interaction():
        try:
            # Update persistent attacker profile
            AttackerProfiler.record_attacker_intelligence(
                db=db,
                ip=source_ip,
                user_agent=user_agent,
                headers=headers_dict,
                attack_category=attack_category,
                credentials=extracted_creds
            )

            # Append immutable interaction log
            log_entry = HoneypotInteractionLog(
                session_id=session_id,
                ip_address=source_ip,
                endpoint=request.url.path,
                method=request.method,
                attack_category=attack_category,
                raw_payload=body_text[:1000],
                headers_snapshot=headers_dict,
                deception_type=deception_type,
                response_status=200,
                response_preview=json.dumps(deception_data)[:500] if isinstance(deception_data, dict) else str(deception_data)[:500],
                extracted_credentials=extracted_creds
            )
            db.add(log_entry)
            db.commit()
            
            app_logger.warning({
                "message": "Attacker Trapped in Enterprise Honeypot",
                "ip": source_ip,
                "category": attack_category,
                "deception_type": deception_type
            })
        except Exception as e:
            app_logger.error(f"Honeypot async logging error: {e}")

    background_tasks.add_task(log_honeypot_interaction)

    hp_event = {
        "event_type": "THREAT_EVENT",
        "id": f"evt-hp-{uuid.uuid4().hex[:10]}",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "time": datetime.datetime.now().strftime("%H:%M:%S"),
        "ip": source_ip,
        "country": "🎭 Honeypot Sandbox",
        "countryName": "Sandbox VFS",
        "city": "Deception Node",
        "isp": "Virtual Honeynet",
        "rule_id": f"HONEYPOT_{attack_category}",
        "attack_type": f"HONEYPOT_{attack_category}",
        "type": attack_category,
        "score": 98.0,
        "level": "CRITICAL",
        "severity": "CRITICAL",
        "path": request.url.path,
        "method": request.method,
        "payload": (body_text[:250] if body_text else f"Deception engagement on {request.url.path}"),
        "status": "Trapped in Honeypot",
        "action": "HONEYPOT",
        "triggered_rules": [f"HONEYPOT_{deception_type}"]
    }
    background_tasks.add_task(broadcast_threat_event, hp_event)

    # 5. Return context-appropriate deception (Always HTTP 200 OK - FR-44)
    if deception_type == "FAKE_BASH_SHELL":
        return PlainTextResponse(deception_data.get("stdout", ""), status_code=200)
    elif deception_type == "FAKE_LFI_FILE":
        return PlainTextResponse(deception_data.get("file_content", ""), status_code=200)
    elif deception_type == "DECOY_ENV_FILE":
        return PlainTextResponse(deception_data, status_code=200)
    elif deception_type == "DECOY_GIT_CONFIG":
        return PlainTextResponse(deception_data, status_code=200)
    elif deception_type == "DECOY_WORDPRESS":
        return HTMLResponse(deception_data, status_code=200)
    else:
        return JSONResponse(deception_data, status_code=200)


def _broadcast_honeypot_event(background_tasks: BackgroundTasks, source_ip: str, path: str, method: str, category: str, payload_desc: str):
    event = {
        "event_type": "THREAT_EVENT",
        "id": f"evt-hp-{uuid.uuid4().hex[:10]}",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "time": datetime.datetime.now().strftime("%H:%M:%S"),
        "ip": source_ip,
        "country": "🎭 Honeypot Decoy",
        "countryName": "Sandbox VFS",
        "city": "Deception Node",
        "isp": "Virtual Honeynet",
        "rule_id": f"HONEYPOT_{category}",
        "attack_type": f"HONEYPOT_{category}",
        "type": category,
        "score": 96.0,
        "level": "CRITICAL",
        "severity": "CRITICAL",
        "path": path,
        "method": method,
        "payload": payload_desc[:250],
        "status": "Trapped in Honeypot",
        "action": "HONEYPOT",
        "triggered_rules": [f"HONEYPOT_{category}"]
    }
    background_tasks.add_task(broadcast_threat_event, event)

# ── MULTI-PERSONALITY ATTACK SURFACE TRAPS ───────────────────────────────────

@router.get("/.env")
async def trap_env_file(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Decoy exposed .env file containing live Canary Tokens."""
    source_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "127.0.0.1")
    user_agent = request.headers.get("user-agent", "Unknown")
    
    background_tasks.add_task(
        AttackerProfiler.record_attacker_intelligence,
        db, source_ip, user_agent, dict(request.headers), "RECON_ENV_EXPOSURE"
    )
    _broadcast_honeypot_event(background_tasks, source_ip, "/.env", "GET", "RECON_ENV_EXPOSURE", "Attempted extraction of decoy .env secrets with Canary AWS keys")
    return PlainTextResponse(get_decoy_env_file(), status_code=200)


@router.get("/.git/config")
async def trap_git_config(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Decoy exposed .git/config file."""
    source_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "127.0.0.1")
    user_agent = request.headers.get("user-agent", "Unknown")
    
    background_tasks.add_task(
        AttackerProfiler.record_attacker_intelligence,
        db, source_ip, user_agent, dict(request.headers), "RECON_GIT_EXPOSURE"
    )
    _broadcast_honeypot_event(background_tasks, source_ip, "/.git/config", "GET", "RECON_GIT_EXPOSURE", "Attempted extraction of decoy .git repository metadata")
    return PlainTextResponse(get_decoy_git_config(), status_code=200)


@router.get("/wp-login.php", response_class=HTMLResponse)
@router.post("/wp-login.php")
async def trap_wordpress_login(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Decoy WordPress login interface with credential harvesting."""
    source_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "127.0.0.1")
    user_agent = request.headers.get("user-agent", "Unknown")
    
    if request.method == "POST":
        form_data = await request.form()
        creds = {"username": form_data.get("log", ""), "password": form_data.get("pwd", "")}
        background_tasks.add_task(
            AttackerProfiler.record_attacker_intelligence,
            db, source_ip, user_agent, dict(request.headers), "BRUTE_FORCE_WORDPRESS", creds
        )
        _broadcast_honeypot_event(background_tasks, source_ip, "/wp-login.php", "POST", "BRUTE_FORCE_WORDPRESS", f"WordPress credential attack: {creds}")
        return HTMLResponse(get_decoy_wordpress_login(), status_code=200)
    
    _broadcast_honeypot_event(background_tasks, source_ip, "/wp-login.php", "GET", "RECON_WORDPRESS", "Probing WordPress login decoy portal")
    return HTMLResponse(get_decoy_wordpress_login(), status_code=200)


@router.get("/actuator/env")
async def trap_spring_actuator(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Decoy Spring Boot Actuator endpoint with masked honeytokens."""
    source_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "127.0.0.1")
    user_agent = request.headers.get("user-agent", "Unknown")
    
    background_tasks.add_task(
        AttackerProfiler.record_attacker_intelligence,
        db, source_ip, user_agent, dict(request.headers), "RECON_SPRING_ACTUATOR"
    )
    _broadcast_honeypot_event(background_tasks, source_ip, "/actuator/env", "GET", "RECON_SPRING_ACTUATOR", "Attempted reconnaissance of Spring Boot Actuator environment")
    return JSONResponse(get_decoy_actuator_env(), status_code=200)


@router.get("/admin-portal", response_class=HTMLResponse)
async def serve_fake_admin_portal():
    """Renders the convincing fake Admin Console web page."""
    html_path = os.path.join(TEMPLATES_DIR, "fake_admin.html")
    if os.path.exists(html_path):
        with open(html_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    return HTMLResponse("<h2>Enterprise Internal Portal (Offline)</h2>", status_code=200)


# ── SOC INTELLIGENCE & CANARY MANAGEMENT ─────────────────────────────────────

@router.get("/canaries")
def get_active_canaries():
    """Returns active canary honeytokens and alerts for any tripped canaries."""
    return {
        "active_canaries_count": len(canary_engine.get_all_canaries()),
        "tripped_canaries_count": len(canary_engine.get_tripped_canaries()),
        "tripped_alerts": canary_engine.get_tripped_canaries(),
        "registered_canaries": canary_engine.get_all_canaries()
    }


@router.get("/export/stix")
def export_stix_threat_intel(db: Session = Depends(get_db)):
    """Exports captured attacker IOCs into official STIX 2.1 Threat Intel Bundle."""
    profiles = db.query(HoneypotAttackerProfile).all()
    bundle = stix_exporter.export_bundle(profiles)
    return JSONResponse(content=bundle, media_type="application/json")


@router.get("/attackers")
def get_attacker_profiles(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """SOC Analyst Feed: Returns persistent attacker intelligence profiles."""
    profiles = db.query(HoneypotAttackerProfile).order_by(
        HoneypotAttackerProfile.last_seen.desc()
    ).limit(limit).all()

    return [
        {
            "id": p.id,
            "ip_address": p.ip_address,
            "country": p.country,
            "city": p.city,
            "isp": p.isp,
            "threat_level": p.threat_level,
            "mitre_tactics": p.mitre_tactics,
            "tool_fingerprint": p.tool_fingerprint,
            "interaction_count": p.interaction_count,
            "captured_credentials": p.captured_credentials,
            "triggered_honeytokens": p.triggered_honeytokens,
            "first_seen": p.first_seen.isoformat() if p.first_seen else None,
            "last_seen": p.last_seen.isoformat() if p.last_seen else None
        }
        for p in profiles
    ]


@router.get("/sessions")
def get_interaction_sessions(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """SOC Forensic Replay Feed: Returns chronologically ordered attacker interactions."""
    logs = db.query(HoneypotInteractionLog).order_by(
        HoneypotInteractionLog.timestamp.desc()
    ).limit(limit).all()

    return [
        {
            "id": l.id,
            "session_id": l.session_id,
            "ip_address": l.ip_address,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "endpoint": l.endpoint,
            "method": l.method,
            "attack_category": l.attack_category,
            "deception_type": l.deception_type,
            "raw_payload": l.raw_payload,
            "extracted_credentials": l.extracted_credentials,
            "response_status": l.response_status,
            "response_preview": l.response_preview
        }
        for l in logs
    ]
