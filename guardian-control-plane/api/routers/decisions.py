from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
import json

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.database import get_db
from models.schema import SecurityEvent
from core.api_key_auth import get_api_key
from core.logger import app_logger

router = APIRouter(prefix="/api/v1/decisions", tags=["Decisions & Honeypot"])

@router.post("/honeypot")
async def honeypot_trap(
    request: Request,
    site_id: int = Depends(get_api_key),
    db: Session = Depends(get_db)
):
    """
    Deception endpoint for CRITICAL severity attackers.
    The SDK forwards the full raw payload here. We log it and return 200 OK.
    """
    try:
        raw_body = await request.body()
        payload = raw_body.decode("utf-8", errors="replace")
        
        # Log the full payload into a security event or dedicated honeypot table
        event = SecurityEvent(
            site_id=site_id,
            source_ip=request.client.host,
            endpoint=request.url.path,
            method=request.method,
            severity="CRITICAL",
            action_taken="HONEYPOT_FULL_CAPTURE",
            payload_snapshot=payload
        )
        db.add(event)
        db.commit()
        
        app_logger.warning({
            "message": "Honeypot Trap Activated",
            "site_id": site_id,
            "ip": request.client.host
        })
        
    except Exception as e:
        app_logger.error(f"Honeypot Trap error: {e}")

    # Always deceive the attacker with a generic success response
    return {"status": "success", "message": "Operation completed successfully."}
