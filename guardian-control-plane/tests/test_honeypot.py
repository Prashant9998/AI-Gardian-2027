"""
Unit and Integration Test Suite for Module 6: Enterprise Honeypot & Deception Subsystem
"""

import pytest
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from honeypot.engine import DeceptionEngine
from honeypot.profiler import AttackerProfiler
from honeypot.vfs import vfs_manager
from honeypot.canary import canary_engine
from honeypot.stix_export import stix_exporter
from db.database import SessionLocal, engine
from models.honeypot_schema import Base, HoneypotAttackerProfile

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

def test_deception_engine_sqli_with_canaries():
    payload = {"path": "/users", "query": "id=1 UNION SELECT null,username,password FROM users--", "body": ""}
    deception_type, data, category = DeceptionEngine.generate_response(payload, "sess_1", "185.220.101.47")
    
    assert deception_type == "FAKE_SQL_RESULT"
    assert category == "SQLI"
    assert "data" in data
    # Verify active canary tokens are embedded in fake DB response
    assert any("api_token" in row or "db_url" in row for row in data["data"])

def test_stateful_virtual_filesystem_shell():
    """Verify that an attacker session in the virtual Linux shell maintains state."""
    session_id = "test_attacker_session_101"
    ip = "45.33.32.156"
    shell = vfs_manager.get_or_create_session(session_id, ip)
    
    # 1. Check initial working directory
    assert shell.execute("pwd") == "/var/www/html"
    
    # 2. Change directory and verify state persistence
    shell.execute("cd /etc")
    assert shell.execute("pwd") == "/etc"
    
    # 3. Read system file
    passwd_out = shell.execute("cat passwd")
    assert "root:x:0:0" in passwd_out
    assert "www-data" in passwd_out
    
    # 4. Create new file and read it back
    shell.execute("echo 'pwned_canary_flag' > exploit.txt")
    exploit_content = shell.execute("cat exploit.txt")
    assert "pwned_canary_flag" in exploit_content
    
    # 5. Check process table
    ps_out = shell.execute("ps aux")
    assert "nginx" in ps_out
    assert "postgres" in ps_out

def test_canary_token_generation_and_tripping():
    """Verify honeytokens are trackable and raise an immediate alert when replayed."""
    aws_creds = canary_engine.generate_aws_key("Unit Test Vault")
    access_key = aws_creds["aws_access_key_id"]
    
    # Simulate attacker replaying the stolen access key
    stolen_replay = f"GET /api/v1/data HTTP/1.1\nAuthorization: AWS {access_key}:Signature123"
    trip_alert = canary_engine.inspect_and_check(stolen_replay, "198.51.100.99")
    
    assert trip_alert is not None
    assert trip_alert["token"] == access_key
    assert trip_alert["severity"] == "CRITICAL"
    assert trip_alert["attacker_ip"] == "198.51.100.99"

def test_multi_personality_attack_surfaces():
    """Test traps for /.env, /.git/config, /wp-login.php, /actuator/env."""
    # 1. /.env trap
    env_res = client.get("/api/v1/honeypot/.env")
    assert env_res.status_code == 200
    assert "AWS_ACCESS_KEY_ID=AKIA" in env_res.text
    assert "DATABASE_URL" in env_res.text
    
    # 2. /.git/config trap
    git_res = client.get("/api/v1/honeypot/.git/config")
    assert git_res.status_code == 200
    assert "repositoryformatversion = 0" in git_res.text
    
    # 3. /wp-login.php trap (GET and POST)
    wp_res = client.get("/api/v1/honeypot/wp-login.php")
    assert wp_res.status_code == 200
    assert "WordPress" in wp_res.text
    
    wp_post = client.post("/api/v1/honeypot/wp-login.php", data={"log": "admin", "pwd": "Password123!"})
    assert wp_post.status_code == 200
    
    # 4. /actuator/env trap
    act_res = client.get("/api/v1/honeypot/actuator/env")
    assert act_res.status_code == 200
    assert "activeProfiles" in act_res.json()

def test_stix_threat_intelligence_export():
    """Test exporting attacker profiles to STIX 2.1 bundle."""
    export_res = client.get("/api/v1/honeypot/export/stix")
    assert export_res.status_code == 200
    bundle = export_res.json()
    assert bundle["type"] == "bundle"
    assert "objects" in bundle
    assert any(obj.get("type") == "identity" for obj in bundle["objects"])

def test_honeypot_canary_dashboard_endpoint():
    """Test the Canary management status API."""
    canaries_res = client.get("/api/v1/honeypot/canaries")
    assert canaries_res.status_code == 200
    data = canaries_res.json()
    assert "active_canaries_count" in data
    assert data["active_canaries_count"] > 0
