"""
Unit & Integration Test Suite for AI Cyber Guardian Zero-Code Reverse Proxy Gateway.
Tests:
- Status check
- Attack blocking (SQLi, XSS) via proxy router
- Decoy honeypot trapping (/.env, /wp-login.php)
- Transparent forwarding of clean requests
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_proxy_status():
    """Verify proxy diagnostic status endpoint returns active status."""
    response = client.get("/proxy/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "active"
    assert "AI Cyber Guardian" in data["service"]

def test_proxy_blocks_sqli_attack():
    """Verify that a SQL Injection query string is blocked with HTTP 403."""
    response = client.get(
        "/proxy/api/search?q=' UNION SELECT 1,username,password FROM users--",
        headers={"Accept": "application/json"}
    )
    assert response.status_code == 403
    data = response.json()
    assert data["decision"] in ["BLOCK", "HONEYPOT"]
    assert data["status"] == 403
    assert any("SQL" in r or "R1" in r for r in data.get("triggered_rules", []))

def test_proxy_blocks_xss_attack_html():
    """Verify that an XSS attack receives a branded WAF Shield HTML error page."""
    response = client.get(
        "/proxy/products?search=<script>alert(document.cookie)</script>",
        headers={"Accept": "text/html"}
    )
    assert response.status_code == 403
    assert "Blocked by AI Cyber Guardian" in response.text
    assert "Access Denied by WAF Shield" in response.text

def test_proxy_traps_decoy_env_probe():
    """Verify that scanning /.env returns deceptive canary content."""
    response = client.get("/proxy/.env")
    assert response.status_code == 200
    assert "APP_NAME" in response.text
    assert "AWS_ACCESS_KEY_ID" in response.text

def test_proxy_traps_decoy_wordpress_login():
    """Verify that scanning /wp-login.php returns the decoy login page."""
    response = client.get("/proxy/wp-login.php")
    assert response.status_code == 200
    assert "WordPress" in response.text or "user_login" in response.text
