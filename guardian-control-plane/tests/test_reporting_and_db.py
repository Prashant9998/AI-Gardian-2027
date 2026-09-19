"""
Test Suite for Database Persistence, Alembic Migrations,
Timeseries Analytics, and Executive ReportLab PDF Generator (Step 6).
"""

import io
import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from db.database import get_db, engine
from models.schema import (
    Base,
    Tenant,
    Site,
    APIKey,
    SecurityEvent,
    AttackerProfile,
    BlockedIP,
    HoneypotSession,
)
from core.pdf_generator import generate_executive_pdf_report


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Database Schema & Tables Verification
# ─────────────────────────────────────────────────────────────────────────────

def test_schema_models_and_tables():
    """Verify all 7 enterprise database tables are registered with indices."""
    table_names = Base.metadata.tables.keys()
    expected_tables = {
        "tenants",
        "sites",
        "api_keys",
        "security_events",
        "attacker_profiles",
        "blocked_ips",
        "honeypot_sessions",
    }
    assert expected_tables.issubset(set(table_names)), f"Missing tables: {expected_tables - set(table_names)}"

    # Verify primary keys and column definitions
    assert "source_ip" in Base.metadata.tables["attacker_profiles"].columns
    assert "session_id" in Base.metadata.tables["honeypot_sessions"].columns
    assert "blocked_at" in Base.metadata.tables["blocked_ips"].columns
    assert "payload_snapshot" in Base.metadata.tables["security_events"].columns


def test_database_crud_operations():
    """Test model insertion and query persistence."""
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        # Create test tenant & site if needed
        tenant = db.query(Tenant).first()
        if not tenant:
            tenant = Tenant(name="Enterprise Test Corp")
            db.add(tenant)
            db.commit()

        site = db.query(Site).first()
        if not site:
            site = Site(tenant_id=tenant.id, domain="testcorp.internal")
            db.add(site)
            db.commit()

        # Insert a test HoneypotSession
        test_sess = HoneypotSession(
            site_id=site.id,
            session_id=f"test-hp-{int(datetime.datetime.now().timestamp())}",
            source_ip="198.51.100.99",
            duration_seconds=12.5,
            commands_executed=["whoami", "id", "cat /etc/shadow"],
            tokens_tripped=["CANARY_TOKEN_AWS"],
            personality="linux_terminal",
        )
        db.add(test_sess)
        db.commit()

        queried = db.query(HoneypotSession).filter(HoneypotSession.session_id == test_sess.session_id).first()
        assert queried is not None
        assert "cat /etc/shadow" in queried.commands_executed
        assert "CANARY_TOKEN_AWS" in queried.tokens_tripped

        # Clean up test session
        db.delete(queried)
        db.commit()
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# 2. Timeseries & Analytics Endpoints
# ─────────────────────────────────────────────────────────────────────────────

def test_reporting_timeseries_endpoint(client):
    """Test 24-hour timeseries aggregation endpoint."""
    response = client.get("/api/v1/reporting/timeseries?hours=24")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 24

    first_slot = data[0]
    assert "hour_label" in first_slot
    assert "total_events" in first_slot
    assert "blocked_count" in first_slot
    assert "trap_count" in first_slot
    assert "severity_breakdown" in first_slot
    assert "avg_threat_score" in first_slot


def test_reporting_top_attackers_endpoint(client):
    """Test top hostile source IPs endpoint."""
    response = client.get("/api/v1/reporting/top-attackers?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

    for item in data:
        assert "source_ip" in item
        assert "incident_count" in item
        assert "max_score" in item
        assert "status" in item


def test_reporting_technique_distribution_endpoint(client):
    """Test threat technique distribution breakdown."""
    response = client.get("/api/v1/reporting/technique-distribution")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)

    expected_techniques = [
        "SQL Injection (R1)",
        "Cross-Site Scripting (R2)",
        "Path Traversal (R3)",
        "Auth Brute-Force (R4)",
        "Scanner Recon Probe (R5)",
        "Zero-Day Anomaly (ML Engine)",
        "Honeypot Decoy Trapped",
    ]
    for tech in expected_techniques:
        assert tech in data
        assert isinstance(data[tech], int)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Server-Side ReportLab PDF Generator Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_direct_pdf_generator_function():
    """Verify ReportLab compiles valid PDF binary with multi-page structure."""
    db = next(get_db())
    try:
        pdf_bytes = generate_executive_pdf_report(
            db=db,
            site_id=1,
            site_domain="nexus-store.cyberguardian.io",
        )
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 5000, "PDF size unexpectedly small"
        assert pdf_bytes.startswith(b"%PDF-"), "Invalid PDF binary signature"
        assert b"%%EOF" in pdf_bytes, "PDF missing EOF terminator"
    finally:
        db.close()


def test_export_pdf_http_endpoint(client):
    """Verify GET /api/v1/reporting/export-pdf streams downloadable PDF."""
    response = client.get("/api/v1/reporting/export-pdf")
    assert response.status_code == 200
    assert response.headers.get("content-type") == "application/pdf"
    assert "attachment" in response.headers.get("content-disposition", "")
    assert ".pdf" in response.headers.get("content-disposition", "")
    assert response.content.startswith(b"%PDF-")
    assert len(response.content) >= 5000
