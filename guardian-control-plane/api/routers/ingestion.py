import asyncio
from fastapi import APIRouter, Depends, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.database import get_db
from models.schema import SecurityEvent
from core.api_key_auth import get_api_key
from core.rate_limiter import check_rate_limit
from core.ip_filter import ip_filter
from core.rules import RuleEngine
from core.ml_engine import fusion_engine
from core.decision_engine import decision_engine
from core.logger import app_logger
from api.routers.ws import broadcast_threat_event
import datetime
import uuid

router = APIRouter(prefix="/api/v1/ingestion", tags=["Ingestion"])

# Instantiate the legacy rule engine wrapper
# (We pass None to use the centralized settings module internally)
rule_engine = RuleEngine(config=None)

def log_security_event(
    db: Session, 
    site_id: int, 
    payload: dict, 
    rule_score: float, 
    ml_score: float, 
    final_score: float, 
    severity: str, 
    action: str, 
    triggered_rules: list
):
    """Saves the event to PostgreSQL asynchronously via BackgroundTasks."""
    try:
        event = SecurityEvent(
            site_id=site_id,
            source_ip=payload.get("source_ip"),
            endpoint=payload.get("path"),
            method=payload.get("method"),
            rule_score=rule_score,
            ml_score=ml_score,
            final_score=final_score,
            severity=severity,
            action_taken=action,
            triggered_rules=triggered_rules,
            payload_snapshot=str(payload)[:500] # Save metadata snapshot
        )
        db.add(event)
        db.commit()
    except Exception as e:
        app_logger.error(f"Failed to log SecurityEvent to DB: {e}")


@router.post("/evaluate")
async def evaluate_request(
    request: Request,
    background_tasks: BackgroundTasks,
    site_id: int = Depends(get_api_key),
    db: Session = Depends(get_db)
):
    """
    The main decision endpoint called by the Guardian SDK.
    Takes request metadata (headers, IP, path, query) and returns an action.
    """
    payload = await request.json()
    source_ip = payload.get("source_ip", "0.0.0.0")
    
    # -------------------------------------------------------------
    # Stage 1: Ingress Filters (The Shield)
    # -------------------------------------------------------------
    
    # 1. IP Blocklist/Allowlist check (Fast Path)
    ip_action = ip_filter.evaluate(source_ip)
    if ip_action == "ALLOW":
        return {"action": "ALLOW", "reason": "ip_allowlist"}
    elif ip_action == "BLOCK":
        return {"action": "BLOCK", "reason": "ip_blocklist"}
        
    # 2. Rate Limiting Check (Redis-backed)
    is_allowed, rl_tier = await check_rate_limit(site_id, source_ip, endpoint_type=payload.get("endpoint_type", "generic"))
    if not is_allowed:
        rl_event = {
            "event_type": "THREAT_EVENT",
            "id": f"evt-rl-{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "time": datetime.datetime.now().strftime("%H:%M:%S"),
            "ip": source_ip,
            "country": "🌐 External Host",
            "countryName": "External",
            "city": "Cloud Edge",
            "isp": "Client Network",
            "rule_id": "R4_RATE_LIMIT",
            "attack_type": "R4_RATE_LIMIT",
            "type": "BruteForce",
            "score": 78.0,
            "level": "HIGH",
            "severity": "HIGH",
            "path": payload.get("path", "/"),
            "method": payload.get("method", "POST"),
            "payload": f"Rate limit burst exceeded on {payload.get('endpoint_type', 'generic')} endpoint ({rl_tier})",
            "status": "Blocked by WAF",
            "action": "BLOCK",
            "triggered_rules": ["R4_RATE_LIMIT"]
        }
        background_tasks.add_task(broadcast_threat_event, rl_event)
        return {"action": "BLOCK", "reason": f"rate_limit_exceeded:{rl_tier}"}

    # -------------------------------------------------------------
    # Stage 2: Deep Analysis (Rules & AI)
    # -------------------------------------------------------------
    
    # Run deterministic rules
    rule_result = rule_engine.evaluate(payload)
    
    # Run ML and fuse scores
    final_score = fusion_engine.fuse(
        rule_score=rule_result.total_score,
        is_critical_override=rule_result.is_critical_override,
        request=payload
    )
    
    # We still want to log the ML partial score for the SOC dashboard
    ml_score_raw = fusion_engine.ml_engine.evaluate(payload)

    # -------------------------------------------------------------
    # Stage 3: Decision Engine
    # -------------------------------------------------------------
    
    severity = decision_engine.evaluate_score(final_score)
    
    # R4 brute force hard override forces CRITICAL
    if rule_result.is_critical_override:
        severity = "CRITICAL"
        
    action = decision_engine.map_severity_to_action(severity)

    triggered_rule_names = [r["rule"] for r in rule_result.triggered_rules]
    primary_rule = triggered_rule_names[0] if triggered_rule_names else ("R4_BRUTE_FORCE" if rule_result.is_critical_override else ("ML_ANOMALY" if final_score >= 30 else "CLEAN_TRAFFIC"))
    status_text = "Trapped in Honeypot" if action == "HONEYPOT" else ("Blocked by WAF" if action == "BLOCK" else "Monitored")

    rule_to_type = {
        "R1_SQLI": "SQLi",
        "R2_XSS": "XSS",
        "R3_PATH_TRAVERSAL": "PathTraversal",
        "R4_RATE_LIMIT": "BruteForce",
        "R4_BRUTE_FORCE": "BruteForce",
        "R5_SCANNER": "Scanner",
        "R6_OVERSIZED": "Anomaly"
    }
    short_type = rule_to_type.get(primary_rule, primary_rule)

    # Construct real-time WebSocket threat event for SOC dashboard
    threat_event = {
        "event_type": "THREAT_EVENT",
        "id": f"evt-{uuid.uuid4().hex[:10]}",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "time": datetime.datetime.now().strftime("%H:%M:%S"),
        "ip": source_ip,
        "country": payload.get("country", "🌐 External Host"),
        "countryName": payload.get("country_name", "External"),
        "city": payload.get("city", "Cloud Edge"),
        "isp": payload.get("isp", "Client Network"),
        "rule_id": primary_rule,
        "attack_type": primary_rule,
        "type": short_type,
        "score": round(float(final_score), 1),
        "level": severity,
        "severity": severity,
        "path": payload.get("path", "/"),
        "method": payload.get("method", "GET"),
        "payload": str(payload.get("query") or payload.get("body") or payload.get("headers", ""))[:250],
        "status": status_text,
        "action": action,
        "triggered_rules": triggered_rule_names
    }

    # Broadcast to active WebSockets in real time (< 100ms)
    background_tasks.add_task(broadcast_threat_event, threat_event)
    
    # Trigger webhook asynchronously if severity is MEDIUM/HIGH
    background_tasks.add_task(
        decision_engine.trigger_alert, 
        site_id, source_ip, severity, final_score, str(payload)
    )
    
    # Log to PostgreSQL asynchronously
    background_tasks.add_task(
        log_security_event,
        db, site_id, payload, rule_result.total_score, ml_score_raw, final_score, severity, action, triggered_rule_names
    )

    return {
        "action": action,
        "severity": severity,
        "score": final_score,
        "triggered_rules": triggered_rule_names
    }
