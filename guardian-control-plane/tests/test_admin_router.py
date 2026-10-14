"""
Unit and integration tests for the Platform Super-Administrative Router.
Verifies cross-tenant listing, provisioning, global blacklisting, system telemetry,
and administrative audit trail endpoints.
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_admin_stats():
    """Verify global platform admin stats return valid telemetry."""
    response = client.get("/api/v1/admin/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "summary" in data
    assert data["summary"]["total_tenants"] >= 1
    assert data["summary"]["total_protected_sites"] >= 1
    assert "engine_health" in data
    assert data["engine_health"]["redis_sliding_limiter"] == "ONLINE"


def test_admin_tenants_flow():
    """Verify tenant listing and new tenant onboarding flow."""
    # 1. List existing tenants
    res_list = client.get("/api/v1/admin/tenants")
    assert res_list.status_code == 200
    tenants = res_list.json()
    assert isinstance(tenants, list)
    assert len(tenants) >= 1

    # 2. Provision new tenant
    new_tenant_payload = {
        "name": "SecOps Cloud Enterprise",
        "domain": "guard.secops-cloud.io",
        "tier": "Enterprise",
        "honeypot_enabled": True
    }
    res_create = client.post("/api/v1/admin/tenants", json=new_tenant_payload)
    assert res_create.status_code == 201
    created = res_create.json()
    assert created["status"] == "success"
    assert created["tenant"]["name"] == "SecOps Cloud Enterprise"
    assert created["tenant"]["raw_api_key"].startswith("guardian-live-")

    # 3. Toggle status
    res_patch = client.patch(
        f"/api/v1/admin/tenants/{created['tenant']['id']}/status",
        json={"is_active": False}
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["is_active"] is False


def test_admin_global_blacklist_flow():
    """Verify global blacklist retrieval, IP addition, and IP unblocking."""
    # 1. Get current blacklist
    res = client.get("/api/v1/admin/global-blacklist")
    assert res.status_code == 200
    blacklist = res.json()
    assert isinstance(blacklist, list)
    assert len(blacklist) >= 1

    # 2. Add an IP to global blacklist
    test_ip = "198.51.100.99"
    add_payload = {
        "ip": test_ip,
        "reason": "Coordinated botnet probe detected across 4 tenants",
        "duration": "24 Hours"
    }
    res_add = client.post("/api/v1/admin/global-blacklist", json=add_payload)
    assert res_add.status_code == 201
    assert res_add.json()["status"] == "success"

    # 3. Verify IP exists in blacklist
    res_after = client.get("/api/v1/admin/global-blacklist")
    ips = [item["ip"] for item in res_after.json()]
    assert test_ip in ips

    # 4. Remove IP from global blacklist
    res_del = client.delete(f"/api/v1/admin/global-blacklist/{test_ip}")
    assert res_del.status_code == 200
    assert res_del.json()["removed"] is True


def test_admin_audit_logs():
    """Verify administrative audit logs return formatted events."""
    res = client.get("/api/v1/admin/audit-logs")
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)
    assert len(logs) >= 1
    assert "actor" in logs[0]
    assert "action" in logs[0]


def test_admin_system_health():
    """Verify cluster nodes and infrastructure monitoring endpoint."""
    res = client.get("/api/v1/admin/system-health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert "active_nodes" in data
    assert len(data["active_nodes"]) >= 4
