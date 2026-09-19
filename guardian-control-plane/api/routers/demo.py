"""
1-Click Interactive Attack Demo Harness Router
Coordinates multi-stage Red Team vs. Blue Team demonstration scenario:
- Stage A (0-5s): Reconnaissance Scans (sqlmap, nikto)
- Stage B (5-12s): Credential Brute-Force (15 rapid failed attempts -> Rate Limit & IP Ban)
- Stage C (12-20s): High-Severity SQL Injection Exploit
- Stage D (20-30s): Deception Honeypot VFS Shell & Active Canary Honeytoken Trips
Broadcasts real-time DEMO_STAGE_UPDATE and THREAT_EVENT messages over WebSocket.
"""

import asyncio
import datetime
import logging
import os
import sys
import time
import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, BackgroundTasks, Query

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.database import SessionLocal
from models.schema import SecurityEvent
from api.routers.ws import broadcast_threat_event
from honeypot.canary import canary_engine

logger = logging.getLogger("guardian.demo")

router = APIRouter(prefix="/api/v1/demo", tags=["Interactive Attack Demo Harness"])

class DemoScenarioState:
    def __init__(self):
        self.is_running: bool = False
        self.active_stage: str = "IDLE"
        self.stage_num: int = 0
        self.total_stages: int = 4
        self.start_time: Optional[float] = None
        self.last_run: Optional[str] = None
        self.cancel_requested: bool = False

demo_state = DemoScenarioState()

def _record_db_event(site_id: int, source_ip: str, endpoint: str, method: str,
                     rule_score: float, ml_score: float, final_score: float,
                     severity: str, action: str, triggered_rules: list, payload: str):
    """Safely logs threat event to SQLite/PostgreSQL."""
    if not SessionLocal:
        return
    db = SessionLocal()
    try:
        ev = SecurityEvent(
            site_id=site_id,
            source_ip=source_ip,
            endpoint=endpoint,
            method=method,
            rule_score=rule_score,
            ml_score=ml_score,
            final_score=final_score,
            severity=severity,
            action_taken=action,
            triggered_rules=triggered_rules,
            payload_snapshot=payload[:500]
        )
        db.add(ev)
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to record demo event in DB: {e}")
    finally:
        db.close()


async def _run_demo_lifecycle(duration_scale: float = 1.0):
    """Executes the 30-second 4-stage demo lifecycle."""
    demo_state.is_running = True
    demo_state.cancel_requested = False
    demo_state.start_time = time.time()
    
    scale = max(0.01, min(5.0, duration_scale))
    
    try:
        # STAGE A (0-5s): RECONNAISSANCE SCANS
        if demo_state.cancel_requested:
            return
        demo_state.stage_num = 1
        demo_state.active_stage = "STAGE_A_RECON"
        
        broadcast_threat_event({
            "event_type": "DEMO_STAGE_UPDATE",
            "stage": "A",
            "stage_num": 1,
            "total_stages": 4,
            "stage_name": "Reconnaissance Probing",
            "target": "sqlmap / nikto automated scanners",
            "focus_tab": "feed",
            "duration": 5.0 * scale,
            "description": "Automated security scanners probing web endpoints for parameter vulnerabilities."
        })
        
        await asyncio.sleep(1.2 * scale)
        
        evt_a1 = {
            "event_type": "THREAT_EVENT",
            "id": f"evt-demo-{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "time": datetime.datetime.now().strftime("%H:%M:%S"),
            "ip": "185.220.101.42",
            "country": "🇷🇺 Russia",
            "countryName": "Russia",
            "city": "St. Petersburg",
            "isp": "Tor Exit Node",
            "rule_id": "R5_SCANNER",
            "attack_type": "R5_SCANNER",
            "type": "Scanner",
            "score": 72.0,
            "level": "HIGH",
            "severity": "HIGH",
            "path": "/api/catalog/search?q=test_fuzz",
            "method": "GET",
            "payload": "User-Agent: sqlmap/1.7.8#dev (https://sqlmap.org)",
            "status": "Blocked by WAF",
            "action": "BLOCK",
            "triggered_rules": ["R5_SCANNER"]
        }
        broadcast_threat_event(evt_a1)
        _record_db_event(1, evt_a1["ip"], evt_a1["path"], evt_a1["method"], 8.0, 68.0, 72.0, "HIGH", "BLOCK", ["R5_SCANNER"], evt_a1["payload"])
        
        await asyncio.sleep(2.0 * scale)
        
        evt_a2 = {
            "event_type": "THREAT_EVENT",
            "id": f"evt-demo-{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "time": datetime.datetime.now().strftime("%H:%M:%S"),
            "ip": "185.220.101.42",
            "country": "🇷🇺 Russia",
            "countryName": "Russia",
            "city": "St. Petersburg",
            "isp": "Tor Exit Node",
            "rule_id": "R5_SCANNER",
            "attack_type": "R5_SCANNER",
            "type": "Scanner",
            "score": 75.0,
            "level": "HIGH",
            "severity": "HIGH",
            "path": "/admin/config.php",
            "method": "GET",
            "payload": "User-Agent: Mozilla/5.00 (Nikto/2.1.6) (cirt.net)",
            "status": "Blocked by WAF",
            "action": "BLOCK",
            "triggered_rules": ["R5_SCANNER"]
        }
        broadcast_threat_event(evt_a2)
        _record_db_event(1, evt_a2["ip"], evt_a2["path"], evt_a2["method"], 8.0, 70.0, 75.0, "HIGH", "BLOCK", ["R5_SCANNER"], evt_a2["payload"])
        
        await asyncio.sleep(1.8 * scale)

        # STAGE B (5-12s): CREDENTIAL BRUTE-FORCE
        if demo_state.cancel_requested:
            return
        demo_state.stage_num = 2
        demo_state.active_stage = "STAGE_B_BRUTE_FORCE"
        
        broadcast_threat_event({
            "event_type": "DEMO_STAGE_UPDATE",
            "stage": "B",
            "stage_num": 2,
            "total_stages": 4,
            "stage_name": "Credential Brute-Force",
            "target": "POST /api/auth/login (15 rapid failed attempts)",
            "focus_tab": "blocked",
            "duration": 7.0 * scale,
            "description": "Rapid dictionary attack attempting administrative login; triggers Rule R4 sliding window rate limiting."
        })
        
        brute_ip = "194.26.29.112"
        for i in range(1, 16):
            if demo_state.cancel_requested:
                return
            await asyncio.sleep(0.35 * scale)
            is_tripped = (i >= 10)
            score = 92.0 if is_tripped else 45.0 + (i * 3.0)
            severity = "CRITICAL" if is_tripped else "MEDIUM"
            action = "BLOCK" if is_tripped else "ALERT"
            status = "Blocked by WAF (IP Banned)" if is_tripped else "Monitored"
            
            evt_b = {
                "event_type": "THREAT_EVENT",
                "id": f"evt-demo-bf-{i}-{uuid.uuid4().hex[:6]}",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "time": datetime.datetime.now().strftime("%H:%M:%S"),
                "ip": brute_ip,
                "country": "🇳🇱 Netherlands",
                "countryName": "Netherlands",
                "city": "Amsterdam",
                "isp": "Serverius Holding B.V.",
                "rule_id": "R4_BRUTE_FORCE" if is_tripped else "R4_RATE_LIMIT",
                "attack_type": "R4_BRUTE_FORCE" if is_tripped else "R4_RATE_LIMIT",
                "type": "BruteForce",
                "score": score,
                "level": severity,
                "severity": severity,
                "path": "/api/auth/login",
                "method": "POST",
                "payload": f"admin:wordlist_pass_{i:03d} (burst attempt #{i}/15)",
                "status": status,
                "action": action,
                "triggered_rules": ["R4_BRUTE_FORCE", "R4_RATE_LIMIT"] if is_tripped else ["R4_RATE_LIMIT"]
            }
            broadcast_threat_event(evt_b)
            if i in [1, 5, 10, 15]:
                _record_db_event(1, brute_ip, "/api/auth/login", "POST", 15.0 if is_tripped else 5.0, 80.0, score, severity, action, evt_b["triggered_rules"], evt_b["payload"])
        
        await asyncio.sleep(1.5 * scale)

        # STAGE C (12-20s): SQL INJECTION EXPLOIT
        if demo_state.cancel_requested:
            return
        demo_state.stage_num = 3
        demo_state.active_stage = "STAGE_C_SQLI"
        
        broadcast_threat_event({
            "event_type": "DEMO_STAGE_UPDATE",
            "stage": "C",
            "stage_num": 3,
            "total_stages": 4,
            "stage_name": "SQL Injection Exploit",
            "target": "1' UNION SELECT 1,2,password_hash FROM users--",
            "focus_tab": "analytics",
            "duration": 8.0 * scale,
            "description": "Exploit payload attempting to extract hashed administrator passwords from the backend database."
        })
        
        await asyncio.sleep(2.0 * scale)
        
        sqli_ip = "103.251.167.20"
        evt_c1 = {
            "event_type": "THREAT_EVENT",
            "id": f"evt-demo-sqli-{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "time": datetime.datetime.now().strftime("%H:%M:%S"),
            "ip": sqli_ip,
            "country": "🇨🇳 China",
            "countryName": "China",
            "city": "Shenzhen",
            "isp": "China Unicom",
            "rule_id": "R1_SQLI",
            "attack_type": "R1_SQLI",
            "type": "SQLi",
            "score": 88.5,
            "level": "HIGH",
            "severity": "HIGH",
            "path": "/api/catalog/search",
            "method": "GET",
            "payload": "1' UNION SELECT 1,2,password_hash FROM users--",
            "status": "Blocked by WAF",
            "action": "BLOCK",
            "triggered_rules": ["R1_SQLI", "R6_ANOMALOUS_STRUCTURE"]
        }
        broadcast_threat_event(evt_c1)
        _record_db_event(1, sqli_ip, evt_c1["path"], "GET", 10.0, 95.0, 88.5, "HIGH", "BLOCK", ["R1_SQLI", "R6_ANOMALOUS_STRUCTURE"], evt_c1["payload"])
        
        await asyncio.sleep(3.0 * scale)
        
        evt_c2 = {
            "event_type": "THREAT_EVENT",
            "id": f"evt-demo-sqli2-{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "time": datetime.datetime.now().strftime("%H:%M:%S"),
            "ip": sqli_ip,
            "country": "🇨🇳 China",
            "countryName": "China",
            "city": "Shenzhen",
            "isp": "China Unicom",
            "rule_id": "R1_SQLI",
            "attack_type": "R1_SQLI",
            "type": "SQLi",
            "score": 94.0,
            "level": "CRITICAL",
            "severity": "CRITICAL",
            "path": "/api/reviews",
            "method": "POST",
            "payload": "comment=1%2527%2520OR%25201%253D1%2523",
            "status": "Blocked by WAF",
            "action": "BLOCK",
            "triggered_rules": ["R1_SQLI", "R6_ANOMALOUS_STRUCTURE"]
        }
        broadcast_threat_event(evt_c2)
        _record_db_event(1, sqli_ip, evt_c2["path"], "POST", 10.0, 98.0, 94.0, "CRITICAL", "BLOCK", ["R1_SQLI"], evt_c2["payload"])
        
        await asyncio.sleep(3.0 * scale)

        # STAGE D (20-30s): DECEPTION HONEYPOT & CANARY TOKEN TRAP
        if demo_state.cancel_requested:
            return
        demo_state.stage_num = 4
        demo_state.active_stage = "STAGE_D_HONEYPOT"
        
        broadcast_threat_event({
            "event_type": "DEMO_STAGE_UPDATE",
            "stage": "D",
            "stage_num": 4,
            "total_stages": 4,
            "stage_name": "Honeypot VFS & Canary Trap",
            "target": "Virtual Linux Shell: cat /etc/shadow & Decoy .env",
            "focus_tab": "honeypot",
            "duration": 10.0 * scale,
            "description": "Attacker trapped in virtual Linux filesystem sandbox; executing reconnaissance commands and exfiltrating Canary Tokens."
        })
        
        hp_ip = "45.33.32.156"
        canary_key = canary_engine.generate_aws_key("Demo Scenario Attacker Trap")
        
        await asyncio.sleep(1.8 * scale)
        
        evt_d1 = {
            "event_type": "THREAT_EVENT",
            "id": f"evt-demo-hp1-{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "time": datetime.datetime.now().strftime("%H:%M:%S"),
            "ip": hp_ip,
            "country": "🎭 Honeypot Decoy",
            "countryName": "Sandbox VFS",
            "city": "Deception Node",
            "isp": "Virtual Honeynet",
            "rule_id": "HONEYPOT_RECON_ENV",
            "attack_type": "HONEYPOT_RECON_ENV",
            "type": "Honeypot",
            "score": 96.0,
            "level": "CRITICAL",
            "severity": "CRITICAL",
            "path": "/.env",
            "method": "GET",
            "payload": f"Exfiltrated Canary AWS Key: {canary_key['aws_access_key_id']}",
            "status": "Trapped in Honeypot",
            "action": "HONEYPOT",
            "triggered_rules": ["HONEYPOT_RECON_ENV", "CANARY_TOKEN_TRIP"]
        }
        broadcast_threat_event(evt_d1)
        _record_db_event(1, hp_ip, "/.env", "GET", 15.0, 95.0, 96.0, "CRITICAL", "HONEYPOT", ["HONEYPOT_RECON_ENV"], evt_d1["payload"])
        
        await asyncio.sleep(2.5 * scale)
        
        evt_d2 = {
            "event_type": "THREAT_EVENT",
            "id": f"evt-demo-hp2-{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "time": datetime.datetime.now().strftime("%H:%M:%S"),
            "ip": hp_ip,
            "country": "🎭 Honeypot Decoy",
            "countryName": "Sandbox VFS",
            "city": "Virtual Shell",
            "isp": "Virtual Honeynet",
            "rule_id": "HONEYPOT_BASH_VFS",
            "attack_type": "HONEYPOT_BASH_VFS",
            "type": "Honeypot",
            "score": 98.0,
            "level": "CRITICAL",
            "severity": "CRITICAL",
            "path": "/api/v1/honeypot/trap",
            "method": "POST",
            "payload": "bash$ uname -a && id && cat /etc/shadow",
            "status": "Trapped in Honeypot",
            "action": "HONEYPOT",
            "triggered_rules": ["HONEYPOT_BASH_VFS", "RCE_PROBE"]
        }
        broadcast_threat_event(evt_d2)
        _record_db_event(1, hp_ip, "/api/v1/honeypot/trap", "POST", 15.0, 98.0, 98.0, "CRITICAL", "HONEYPOT", ["HONEYPOT_BASH_VFS"], evt_d2["payload"])
        
        await asyncio.sleep(2.5 * scale)
        
        evt_d3 = {
            "event_type": "THREAT_EVENT",
            "id": f"evt-demo-hp3-{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "time": datetime.datetime.now().strftime("%H:%M:%S"),
            "ip": hp_ip,
            "country": "🚨 CANARY ALARM",
            "countryName": "Forensic Alert",
            "city": "Canary Trigger",
            "isp": "AWS GuardDuty",
            "rule_id": "CANARY_TOKEN_TRIPPED",
            "attack_type": "CANARY_TOKEN_TRIPPED",
            "type": "CanaryTrip",
            "score": 100.0,
            "level": "CRITICAL",
            "severity": "CRITICAL",
            "path": "/etc/shadow",
            "method": "GET",
            "payload": f"Canary Honeytoken {canary_key['aws_access_key_id']} active reconnaissance verified!",
            "status": "Trapped in Honeypot (Forensic Evidence Logged)",
            "action": "HONEYPOT",
            "triggered_rules": ["CANARY_TOKEN_TRIPPED", "STIX_INTEL_EXPORTED"]
        }
        broadcast_threat_event(evt_d3)
        _record_db_event(1, hp_ip, "/etc/shadow", "GET", 15.0, 100.0, 100.0, "CRITICAL", "HONEYPOT", ["CANARY_TOKEN_TRIPPED"], evt_d3["payload"])
        
        await asyncio.sleep(2.0 * scale)

        # COMPLETION
        demo_state.active_stage = "COMPLETE"
        demo_state.last_run = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        broadcast_threat_event({
            "event_type": "DEMO_STAGE_UPDATE",
            "stage": "COMPLETE",
            "stage_num": 4,
            "total_stages": 4,
            "stage_name": "Demo Scenario Completed",
            "target": "Full Red Team Lifecycle Mitigated",
            "focus_tab": "overview",
            "duration": 0,
            "description": "All 4 threat vectors successfully detected, blocked with 403, and diverted to enterprise deception with forensic evidence."
        })
        
    except Exception as err:
        logger.error(f"Error in demo lifecycle: {err}")
    finally:
        demo_state.is_running = False


@router.post("/run-scenario")
async def run_scenario(
    background_tasks: BackgroundTasks,
    duration_scale: float = Query(1.0, description="Speed scaling factor (e.g. 0.1 for rapid test, 1.0 for standard 30s)")
):
    """
    Triggers the 1-Click Interactive Attack Demo Harness.
    Executes the 4-stage Red Team vs Blue Team attack sequence across 30 seconds.
    Broadcasts stage updates and real-time threat events to all WebSocket connected SOC operators.
    """
    if demo_state.is_running:
        return {
            "status": "already_running",
            "message": "Demo scenario is already actively executing.",
            "active_stage": demo_state.active_stage,
            "stage_num": demo_state.stage_num
        }
    
    background_tasks.add_task(_run_demo_lifecycle, duration_scale)
    
    return {
        "status": "started",
        "message": "Interactive 4-stage attack demo scenario launched.",
        "duration_seconds": 30.0 * max(0.01, min(5.0, duration_scale)),
        "stages": [
            {"stage": "A", "name": "Reconnaissance Scan", "duration_sec": 5.0 * duration_scale, "focus": "feed"},
            {"stage": "B", "name": "Credential Brute-Force", "duration_sec": 7.0 * duration_scale, "focus": "blocked"},
            {"stage": "C", "name": "SQL Injection Exploit", "duration_sec": 8.0 * duration_scale, "focus": "analytics"},
            {"stage": "D", "name": "Honeypot VFS & Canary Trap", "duration_sec": 10.0 * duration_scale, "focus": "honeypot"}
        ]
    }


@router.get("/status")
async def get_demo_status():
    """Returns the current execution status of the attack demo scenario."""
    elapsed = 0.0
    if demo_state.is_running and demo_state.start_time:
        elapsed = round(time.time() - demo_state.start_time, 2)
        
    return {
        "is_running": demo_state.is_running,
        "active_stage": demo_state.active_stage,
        "stage_num": demo_state.stage_num,
        "total_stages": demo_state.total_stages,
        "elapsed_seconds": elapsed,
        "last_run": demo_state.last_run
    }


@router.post("/stop")
async def stop_demo_scenario():
    """Cancels the currently running demo scenario."""
    if not demo_state.is_running:
        return {"status": "not_running", "message": "No demo scenario is currently running."}
        
    demo_state.cancel_requested = True
    demo_state.is_running = False
    demo_state.active_stage = "CANCELLED"
    
    broadcast_threat_event({
        "event_type": "DEMO_STAGE_UPDATE",
        "stage": "CANCELLED",
        "stage_num": demo_state.stage_num,
        "total_stages": 4,
        "stage_name": "Demo Cancelled",
        "focus_tab": "overview",
        "duration": 0,
        "description": "User cancelled attack demo scenario."
    })
    
    return {"status": "stopped", "message": "Demo scenario cancelled."}