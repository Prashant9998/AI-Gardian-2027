from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.database import get_db
from models.schema import SecurityEvent
from core.api_key_auth import get_api_key

router = APIRouter(prefix="/api/v1/reporting", tags=["Reporting SOC Dashboard"])

@router.get("/events")
def get_recent_events(
    limit: int = 50,
    site_id: int = Depends(get_api_key),
    db: Session = Depends(get_db)
):
    """Live event feed for the SOC Dashboard."""
    events = db.query(SecurityEvent).filter(
        SecurityEvent.site_id == site_id
    ).order_by(SecurityEvent.timestamp.desc()).limit(limit).all()
    
    return [
        {
            "id": e.id,
            "timestamp": e.timestamp,
            "source_ip": e.source_ip,
            "endpoint": e.endpoint,
            "severity": e.severity,
            "action": e.action_taken,
            "score": e.final_score
        } for e in events
    ]

@router.get("/trends")
def get_severity_trends(
    site_id: int = Depends(get_api_key),
    db: Session = Depends(get_db)
):
    """
    Aggregation for trend charts. 
    Returns count of events per severity.
    """
    counts = db.query(
        SecurityEvent.severity, 
        func.count(SecurityEvent.id)
    ).filter(
        SecurityEvent.site_id == site_id
    ).group_by(SecurityEvent.severity).all()
    
    # Initialize all to 0
    results = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for severity, count in counts:
        if severity in results:
            results[severity] = count
            
    return results

@router.get("/geo")
def get_geo_data(
    site_id: int = Depends(get_api_key),
    db: Session = Depends(get_db)
):
    """
    Geographic origin data. Groups by source_ip. 
    The React UI (or a future GeoIP service) maps these to coordinates.
    """
    counts = db.query(
        SecurityEvent.source_ip, 
        func.count(SecurityEvent.id)
    ).filter(
        SecurityEvent.site_id == site_id,
        SecurityEvent.severity.in_(["HIGH", "CRITICAL"])
    ).group_by(SecurityEvent.source_ip).limit(100).all()
    
    return [
        {"ip": ip, "threat_count": count} for ip, count in counts
    ]
