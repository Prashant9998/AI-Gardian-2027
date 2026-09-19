"""
Reporting & SOC Analytics API Router.
Provides timeseries aggregations, attacker attribution summaries,
and executive PDF report generation.
"""

from fastapi import APIRouter, Depends, Query, Response, Security
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
import datetime

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.database import get_db
from models.schema import SecurityEvent, Site, APIKey
from core.api_key_auth import hash_api_key
from core.pdf_generator import generate_executive_pdf_report

router = APIRouter(prefix="/api/v1/reporting", tags=["Reporting SOC Dashboard"])
api_key_header_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)


def resolve_site_id(
    header_key: Optional[str] = Security(api_key_header_scheme),
    query_key: Optional[str] = Query(None, alias="api_key"),
    db: Session = Depends(get_db),
) -> int:
    """
    Authenticate site ID from X-API-Key header or query parameter,
    defaulting gracefully to site 1 for evaluation demonstrations.
    """
    raw_key = header_key or query_key
    if not raw_key:
        return 1

    hashed = hash_api_key(raw_key)
    db_key = db.query(APIKey).filter(APIKey.key_hash == hashed, APIKey.is_active == True).first()
    return db_key.site_id if db_key else 1


@router.get("/events")
def get_recent_events(
    limit: int = 50,
    site_id: int = Depends(resolve_site_id),
    db: Session = Depends(get_db),
):
    """Live event feed for the SOC Dashboard."""
    events = (
        db.query(SecurityEvent)
        .filter(SecurityEvent.site_id == site_id)
        .order_by(SecurityEvent.timestamp.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": e.id,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "source_ip": e.source_ip,
            "endpoint": e.endpoint,
            "severity": e.severity,
            "action": e.action_taken,
            "score": e.final_score,
            "triggered_rules": e.triggered_rules or [],
        }
        for e in events
    ]


@router.get("/trends")
def get_severity_trends(
    site_id: int = Depends(resolve_site_id),
    db: Session = Depends(get_db),
):
    """
    Aggregation for trend charts. Returns count of events per severity.
    """
    counts = (
        db.query(SecurityEvent.severity, func.count(SecurityEvent.id))
        .filter(SecurityEvent.site_id == site_id)
        .group_by(SecurityEvent.severity)
        .all()
    )

    results = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for severity, count in counts:
        if severity in results:
            results[severity] = count

    return results


@router.get("/geo")
def get_geo_data(
    site_id: int = Depends(resolve_site_id),
    db: Session = Depends(get_db),
):
    """
    Geographic origin data. Groups by source_ip.
    """
    counts = (
        db.query(SecurityEvent.source_ip, func.count(SecurityEvent.id))
        .filter(
            SecurityEvent.site_id == site_id,
            SecurityEvent.severity.in_(["HIGH", "CRITICAL"]),
        )
        .group_by(SecurityEvent.source_ip)
        .limit(100)
        .all()
    )

    return [{"ip": ip, "threat_count": count} for ip, count in counts]


@router.get("/timeseries")
def get_timeseries_aggregation(
    hours: int = Query(24, ge=1, le=168),
    site_id: int = Depends(resolve_site_id),
    db: Session = Depends(get_db),
):
    """
    Aggregates hourly attack volume, severity distribution, and blocked counts
    over the requested lookback window.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    start_time = now - datetime.timedelta(hours=hours)

    events = (
        db.query(SecurityEvent)
        .filter(SecurityEvent.site_id == site_id, SecurityEvent.timestamp >= start_time)
        .order_by(SecurityEvent.timestamp.asc())
        .all()
    )

    # Initialize hourly slots
    buckets: Dict[str, Dict[str, Any]] = {}
    for h in range(hours):
        slot_time = start_time + datetime.timedelta(hours=h)
        slot_key = slot_time.strftime("%Y-%m-%dT%H:00:00Z")
        buckets[slot_key] = {
            "timestamp": slot_key,
            "hour_label": slot_time.strftime("%H:00"),
            "total_events": 0,
            "blocked_count": 0,
            "trap_count": 0,
            "severity_breakdown": {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0},
            "scores": [],
        }

    for e in events:
        if e.timestamp:
            ts = e.timestamp
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=datetime.timezone.utc)
            slot_key = ts.strftime("%Y-%m-%dT%H:00:00Z")
            if slot_key in buckets:
                b = buckets[slot_key]
                b["total_events"] += 1
                if e.action_taken == "BLOCK":
                    b["blocked_count"] += 1
                elif e.action_taken in ("HONEYPOT", "HONEYPOT_TRAP"):
                    b["trap_count"] += 1

                sev = e.severity or "LOW"
                if sev in b["severity_breakdown"]:
                    b["severity_breakdown"][sev] += 1
                if e.final_score is not None:
                    b["scores"].append(e.final_score)

    # Compute average scores and clean output
    output = []
    for k, b in buckets.items():
        avg_score = round(sum(b["scores"]) / len(b["scores"]), 1) if b["scores"] else 0.0
        output.append({
            "timestamp": b["timestamp"],
            "hour_label": b["hour_label"],
            "total_events": b["total_events"],
            "blocked_count": b["blocked_count"],
            "trap_count": b["trap_count"],
            "severity_breakdown": b["severity_breakdown"],
            "avg_threat_score": avg_score,
        })

    return output


@router.get("/top-attackers")
def get_top_attackers(
    limit: int = Query(10, ge=1, le=50),
    site_id: int = Depends(resolve_site_id),
    db: Session = Depends(get_db),
):
    """
    Top hostile source IPs with threat counts, max score, and latest interaction.
    """
    ip_stats = (
        db.query(
            SecurityEvent.source_ip,
            func.count(SecurityEvent.id).label("incident_count"),
            func.max(SecurityEvent.final_score).label("max_score"),
            func.max(SecurityEvent.timestamp).label("last_seen"),
        )
        .filter(SecurityEvent.site_id == site_id)
        .group_by(SecurityEvent.source_ip)
        .order_by(func.count(SecurityEvent.id).desc())
        .limit(limit)
        .all()
    )

    results = []
    for ip, count, max_score, last_seen in ip_stats:
        status = "BANNED" if (max_score or 0) >= 60 else "MONITORED"
        results.append({
            "source_ip": ip,
            "incident_count": count,
            "max_score": round(max_score or 0.0, 1),
            "last_seen": last_seen.isoformat() if last_seen else None,
            "status": status,
        })

    return results


@router.get("/technique-distribution")
def get_technique_distribution(
    site_id: int = Depends(resolve_site_id),
    db: Session = Depends(get_db),
):
    """
    Breakdown of detected threat techniques (SQLi, XSS, Path Traversal, Brute-Force, Recon, Honeypot).
    """
    distribution = {
        "SQL Injection (R1)": 0,
        "Cross-Site Scripting (R2)": 0,
        "Path Traversal (R3)": 0,
        "Auth Brute-Force (R4)": 0,
        "Scanner Recon Probe (R5)": 0,
        "Zero-Day Anomaly (ML Engine)": 0,
        "Honeypot Decoy Trapped": 0,
    }

    events = db.query(SecurityEvent).filter(SecurityEvent.site_id == site_id).all()
    for e in events:
        if e.action_taken in ("HONEYPOT", "HONEYPOT_TRAP"):
            distribution["Honeypot Decoy Trapped"] += 1
        elif e.triggered_rules:
            for r in e.triggered_rules:
                desc = str(r)
                if "R1" in desc or "SQL" in desc:
                    distribution["SQL Injection (R1)"] += 1
                elif "R2" in desc or "XSS" in desc:
                    distribution["Cross-Site Scripting (R2)"] += 1
                elif "R3" in desc or "Traversal" in desc:
                    distribution["Path Traversal (R3)"] += 1
                elif "R4" in desc or "Rate" in desc:
                    distribution["Auth Brute-Force (R4)"] += 1
                elif "R5" in desc or "Scanner" in desc:
                    distribution["Scanner Recon Probe (R5)"] += 1
        elif e.ml_score and e.ml_score >= 0.5:
            distribution["Zero-Day Anomaly (ML Engine)"] += 1

    return distribution


@router.get("/export-pdf")
def export_pdf_report(
    site_id: int = Depends(resolve_site_id),
    db: Session = Depends(get_db),
):
    """
    Generate and stream an executive multi-page PDF threat report.
    """
    site = db.query(Site).filter(Site.id == site_id).first()
    domain = site.domain if site else "nexus-store-prod.internal"

    pdf_bytes = generate_executive_pdf_report(
        db=db,
        site_id=site_id,
        site_domain=domain,
    )

    filename = f"AI_Cyber_Guardian_Threat_Report_{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "Content-Length": str(len(pdf_bytes)),
        },
    )
