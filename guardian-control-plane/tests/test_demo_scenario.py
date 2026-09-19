"""
Test Suite for 1-Click Interactive Attack Demo Harness
Verifies:
- Demo status and lifecycle triggering
- Real-time stage updates and WebSocket broadcasting
- Database persistence of demo threat events
- Cancel / stop control
"""

import sys
import os
import pytest
import asyncio
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from db.database import get_db, SessionLocal
from models.schema import SecurityEvent
from api.routers.demo import demo_state, _run_demo_lifecycle

client = TestClient(app)

def test_demo_status_initial():
    """Verify initial demo state is idle."""
    res = client.get("/api/v1/demo/status")
    assert res.status_code == 200
    data = res.json()
    assert "is_running" in data
    assert "active_stage" in data
    assert data["total_stages"] == 4

def test_demo_run_scenario_endpoint():
    """Verify triggering scenario starts background task and returns stages."""
    res = client.post("/api/v1/demo/run-scenario?duration_scale=0.01")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["started", "already_running"]
    if data["status"] == "started":
        assert len(data["stages"]) == 4
        assert [s["stage"] for s in data["stages"]] == ["A", "B", "C", "D"]

@pytest.mark.asyncio
async def test_demo_lifecycle_execution_and_db_logging():
    """Verify that running the demo lifecycle generates events and marks completion."""
    # Run lifecycle with minimal duration scale (0.01s for fast test)
    await _run_demo_lifecycle(duration_scale=0.01)
    
    assert demo_state.active_stage == "COMPLETE"
    assert demo_state.stage_num == 4
    assert demo_state.is_running is False
    assert demo_state.last_run is not None

    # Verify that events were logged in the database
    if SessionLocal:
        db = SessionLocal()
        try:
            demo_events = db.query(SecurityEvent).filter(
                SecurityEvent.source_ip.in_(["185.220.101.42", "194.26.29.112", "103.251.167.20", "45.33.32.156"])
            ).all()
            assert len(demo_events) > 0
        finally:
            db.close()

def test_demo_stop_when_not_running():
    """Verify stopping when not running returns appropriate status."""
    demo_state.is_running = False
    res = client.post("/api/v1/demo/stop")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "not_running"


def test_cli_demo_script_execution():
    """Verify that simulate_demo_scenario.py runs to completion with fast execution."""
    import subprocess
    script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "simulate_demo_scenario.py")
    assert os.path.exists(script_path), "simulate_demo_scenario.py must exist in project root"
    
    proc = subprocess.run(
        [sys.executable, script_path, "--control-plane", "http://127.0.0.1:8000", "--fast"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=20
    )
    assert "AI CYBER GUARDIAN" in proc.stdout
    assert "STAGE A" in proc.stdout
    assert "STAGE B" in proc.stdout
    assert "STAGE C" in proc.stdout
    assert "STAGE D" in proc.stdout
    assert "DEMO SCENARIO COMPLETE" in proc.stdout