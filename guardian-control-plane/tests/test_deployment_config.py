"""
Test Suite for Cloud Deployment, Edge Reverse Proxy, Docker Orchestration,
and CI/CD Pipeline Configurations (Step 7).
"""

import os
import yaml
import pytest


REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ─────────────────────────────────────────────────────────────────────────────
# 1. Caddy Edge Proxy & Automated TLS Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_caddyfile_syntax_and_routing():
    """Verify Caddyfile defines automated TLS, security headers, and reverse proxies."""
    caddyfile_path = os.path.join(REPO_ROOT, "Caddyfile")
    assert os.path.exists(caddyfile_path), "Caddyfile does not exist"

    with open(caddyfile_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Verify Security Headers
    assert "Strict-Transport-Security" in content
    assert "X-Content-Type-Options" in content
    assert "X-Frame-Options" in content
    assert "Referrer-Policy" in content

    # Verify Reverse Proxies & WebSocket routing
    assert "/api/v1/ws/*" in content, "Missing WebSocket stream route"
    assert "backend:8000" in content, "Missing backend reverse proxy"
    assert "frontend:80" in content, "Missing frontend reverse proxy"
    assert "target-app:3001" in content, "Missing target app reverse proxy"


# ─────────────────────────────────────────────────────────────────────────────
# 2. Nginx WebSocket Upgrade Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_nginx_websocket_configuration():
    """Verify Nginx configuration includes WebSocket upgrade directives."""
    nginx_path = os.path.join(REPO_ROOT, "cyberprep-app", "nginx.conf")
    assert os.path.exists(nginx_path), "cyberprep-app/nginx.conf does not exist"

    with open(nginx_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "location /api/v1/ws/" in content
    assert "proxy_http_version 1.1;" in content
    assert "proxy_set_header Upgrade $http_upgrade;" in content
    assert 'proxy_set_header Connection "upgrade";' in content


# ─────────────────────────────────────────────────────────────────────────────
# 3. Docker Compose Orchestration Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_docker_compose_structure_and_services():
    """Verify docker-compose.yml defines the full 6-service ecosystem with healthchecks."""
    compose_path = os.path.join(REPO_ROOT, "docker-compose.yml")
    assert os.path.exists(compose_path), "docker-compose.yml does not exist"

    with open(compose_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    assert "services" in config, "docker-compose.yml missing 'services'"
    services = config["services"]

    expected_services = {"postgres", "redis", "backend", "target-app", "frontend", "caddy"}
    assert expected_services.issubset(set(services.keys())), f"Missing services: {expected_services - set(services.keys())}"

    # Verify healthchecks
    assert "healthcheck" in services["postgres"]
    assert "healthcheck" in services["redis"]
    assert "healthcheck" in services["backend"]

    # Verify dependency chain
    assert "postgres" in services["backend"]["depends_on"]
    assert "redis" in services["backend"]["depends_on"]
    assert "backend" in services["target-app"]["depends_on"]
    assert "backend" in services["frontend"]["depends_on"]


# ─────────────────────────────────────────────────────────────────────────────
# 4. GitHub Actions CI/CD Pipeline Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_github_actions_workflow_ci():
    """Verify .github/workflows/ci.yml triggers on pushes and tests backend, SDK, frontend."""
    ci_path = os.path.join(REPO_ROOT, ".github", "workflows", "ci.yml")
    assert os.path.exists(ci_path), ".github/workflows/ci.yml does not exist"

    with open(ci_path, "r", encoding="utf-8") as f:
        workflow = yaml.safe_load(f)

    # Verify triggers
    triggers = workflow.get("on") or workflow.get(True) or {}
    assert "push" in triggers or "pull_request" in triggers

    # Verify jobs
    jobs = workflow.get("jobs", {})
    expected_jobs = {"backend-tests", "sdk-packaging", "frontend-build", "docker-validation"}
    assert expected_jobs.issubset(set(jobs.keys())), f"Missing CI jobs: {expected_jobs - set(jobs.keys())}"


# ─────────────────────────────────────────────────────────────────────────────
# 5. Linux Cloud Deployment Script Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_deploy_script_syntax_and_steps():
    """Verify deploy.sh contains standard Linux bash defensive flags and provisioning steps."""
    deploy_path = os.path.join(REPO_ROOT, "deploy.sh")
    assert os.path.exists(deploy_path), "deploy.sh does not exist"

    with open(deploy_path, "r", encoding="utf-8") as f:
        script = f.read()

    assert "#!/usr/bin/env bash" in script
    assert "set -euo pipefail" in script
    assert "docker compose up" in script
    assert "ufw allow" in script
    assert "GUARDIAN_DOMAIN" in script
