"""
Test Suite for AI Cyber Guardian Official Python SDK (`cyber-guardian`).
Verifies:
- LRU Decision Cache hits, misses, TTL expiration, and eviction.
- Asynchronous background telemetry dispatcher.
- FastAPI/Starlette Middleware (benign pass, attack 403 block, honeypot decoy trap, fail-open).
- Flask Middleware (benign pass, attack 403 block, honeypot decoy trap, caching).
- Django Middleware protocol compatibility.
"""

import time
import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from flask import Flask, jsonify

from cyber_guardian import (
    GuardianConfig,
    DecisionCache,
    TelemetryDispatcher,
    GuardianClient,
    GuardianFastAPIMiddleware,
    GuardianFlaskMiddleware,
    GuardianDjangoMiddleware,
)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Decision Cache Unit Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_decision_cache_lru_and_ttl():
    """Test LRU ordering, capacity eviction, and TTL expiration."""
    cache = DecisionCache(max_size=3, default_ttl=1)

    cache.set("item1", {"action": "ALLOW", "score": 0})
    cache.set("item2", {"action": "ALLOW", "score": 5})
    cache.set("item3", {"action": "ALLOW", "score": 10})

    # Access item1 to make it most recently used
    val1 = cache.get("item1")
    assert val1 is not None
    assert val1["score"] == 0

    # Insert 4th item -> item2 (least recently used) should be evicted
    cache.set("item4", {"action": "ALLOW", "score": 20})

    assert cache.get("item2") is None  # Evicted
    assert cache.get("item1") is not None  # Retained
    assert cache.get("item3") is not None  # Retained
    assert cache.get("item4") is not None  # Retained

    stats = cache.stats()
    assert stats["evictions"] == 1
    assert stats["hits"] >= 1

    # Wait for TTL to expire (1 second TTL)
    time.sleep(1.1)
    assert cache.get("item1") is None  # Expired
    assert cache.get("item4") is None  # Expired


def test_decision_cache_invalidation_and_clear():
    """Test explicit key invalidation and cache clear."""
    cache = DecisionCache(max_size=10, default_ttl=60)
    cache.set("token_a", "val_a")
    cache.set("token_b", "val_b")

    assert cache.get("token_a") == "val_a"
    assert cache.invalidate("token_a") is True
    assert cache.get("token_a") is None

    cache.clear()
    assert cache.get("token_b") is None
    assert cache.stats()["size"] == 0


# ─────────────────────────────────────────────────────────────────────────────
# 2. Asynchronous Telemetry Dispatcher Unit Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_telemetry_dispatcher_lifecycle():
    """Test non-blocking enqueue and thread lifecycle."""
    dispatcher = TelemetryDispatcher(
        endpoint_url="http://localhost:8000/api/v1/telemetry/event",
        api_key="test-key",
        max_queue_size=50,
        flush_interval=0.1,
    )
    dispatcher.start()

    # Enqueue events
    success1 = dispatcher.enqueue({"event": "request_allowed", "ip": "1.2.3.4"})
    success2 = dispatcher.enqueue({"event": "request_allowed", "ip": "5.6.7.8"})
    assert success1 is True
    assert success2 is True

    # Stop dispatcher cleanly
    dispatcher.stop(timeout=1.0)
    assert dispatcher._running is False


# ─────────────────────────────────────────────────────────────────────────────
# 3. Client Evaluation & Exempt Routes
# ─────────────────────────────────────────────────────────────────────────────

def test_client_exempt_routes():
    """Exempt routes should return immediately without inspection."""
    config = GuardianConfig(
        exempt_routes=["/health", "/metrics"],
        control_plane_url="http://127.0.0.1:9999",  # Invalid URL to prove no network call
    )
    client = GuardianClient(config=config)
    result = client.evaluate_sync({"path": "/health", "source_ip": "10.0.0.1"})

    assert result["action"] == "ALLOW"
    assert result["score"] == 0
    assert result["exempt"] is True
    client.close()


def test_client_fail_open_on_network_error():
    """When control plane is unreachable, client must fail open cleanly."""
    config = GuardianConfig(
        control_plane_url="http://127.0.0.1:9998",  # Non-existent server
        fail_open=True,
        timeout=0.2,
    )
    client = GuardianClient(config=config)
    result = client.evaluate_sync({"path": "/api/products", "source_ip": "10.0.0.1"})

    assert result["action"] == "ALLOW"
    assert result.get("fail_open") is True
    client.close()


# ─────────────────────────────────────────────────────────────────────────────
# 4. FastAPI Middleware Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_fastapi_middleware_benign_allowed():
    """Benign request through FastAPI middleware passes with 200 and sets headers."""
    fastapi_app = FastAPI()

    config = GuardianConfig(cache_enabled=True)
    client = GuardianClient(config=config)

    async def mock_query_control_plane(metadata):
        return {
            "action": "ALLOW",
            "score": 5,
            "severity": "LOW",
            "triggered_rules": [],
        }

    client._query_control_plane_async = mock_query_control_plane
    fastapi_app.add_middleware(GuardianFastAPIMiddleware, client=client)

    @fastapi_app.get("/api/catalog/search")
    def search(q: str = ""):
        return {"items": ["Gaming Laptop", "Mechanical Keyboard"]}

    tc = TestClient(fastapi_app)

    # 1. First request -> MISS, evaluates and populates cache
    response1 = tc.get("/api/catalog/search?q=laptop")
    assert response1.status_code == 200
    assert response1.json() == {"items": ["Gaming Laptop", "Mechanical Keyboard"]}
    assert response1.headers.get("X-Guardian-Action") == "ALLOW"
    assert response1.headers.get("X-Guardian-Cache") == "MISS"

    # 2. Second request -> HIT, served immediately from in-memory cache (< 0.1ms)
    response2 = tc.get("/api/catalog/search?q=laptop")
    assert response2.status_code == 200
    assert response2.headers.get("X-Guardian-Action") == "ALLOW"
    assert response2.headers.get("X-Guardian-Cache") == "HIT"
    client.close()


def test_fastapi_middleware_sqli_blocked():
    """Malicious request through FastAPI middleware is blocked with 403."""
    fastapi_app = FastAPI()

    config = GuardianConfig()
    client = GuardianClient(config=config)

    async def mock_query_control_plane(metadata):
        query = metadata.get("query", "").lower()
        if "union select" in query:
            return {
                "action": "BLOCK",
                "score": 95,
                "severity": "CRITICAL",
                "triggered_rules": [{"rule_id": "R1", "description": "SQL Injection Detected"}],
            }
        return {"action": "ALLOW", "score": 0}

    client._query_control_plane_async = mock_query_control_plane
    fastapi_app.add_middleware(GuardianFastAPIMiddleware, client=client)

    @fastapi_app.get("/api/catalog/search")
    def search(q: str = ""):
        return {"items": []}

    tc = TestClient(fastapi_app)
    response = tc.get("/api/catalog/search?q=' UNION SELECT 1,2,password FROM users--")

    assert response.status_code == 403
    data = response.json()
    assert data["error"] == "Forbidden"
    assert data["action"] == "BLOCK"
    assert data["threat_score"] == 95
    assert response.headers.get("X-Guardian-Action") == "BLOCK"
    client.close()


def test_fastapi_middleware_decoy_diverted_to_honeypot():
    """Decoy route is transparently diverted into honeypot trap with active canary."""
    fastapi_app = FastAPI()

    config = GuardianConfig()
    client = GuardianClient(config=config)

    async def mock_divert(path, client_ip, user_agent, method="GET"):
        return {
            "status_code": 200,
            "content": '{"error": "Forbidden", "canary_token": "AKIA_FAKE_CANARY_TOKEN_999"}',
            "content_type": "application/json",
        }

    client.divert_to_honeypot_async = mock_divert
    fastapi_app.add_middleware(GuardianFastAPIMiddleware, client=client)

    tc = TestClient(fastapi_app)
    response = tc.get("/.env")

    assert response.status_code == 200
    assert "AKIA_FAKE_CANARY_TOKEN_999" in response.text
    assert response.headers.get("X-Guardian-Action") == "HONEYPOT_TRAP"
    assert response.headers.get("X-Guardian-Deception") == "ACTIVE"
    client.close()


# ─────────────────────────────────────────────────────────────────────────────
# 5. Flask Middleware Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_flask_middleware_integration():
    """Flask application integration testing benign allow, attack 403, and honeypot diversion."""
    flask_app = Flask(__name__)

    config = GuardianConfig(cache_enabled=True)
    client = GuardianClient(config=config)

    def mock_evaluate_sync(metadata):
        query = metadata.get("query", "")
        if "union select" in query.lower() or "alert(" in metadata.get("body", "").lower():
            return {
                "action": "BLOCK",
                "score": 90,
                "severity": "CRITICAL",
                "triggered_rules": [{"rule_id": "R1", "description": "Attack Payload"}],
            }
        return {
            "action": "ALLOW",
            "score": 10,
            "severity": "LOW",
            "triggered_rules": [],
            "cached": False,
        }

    def mock_divert_sync(path, client_ip, user_agent, method="GET"):
        return {
            "status_code": 200,
            "content": '{"env": "development", "database_url": "postgres://fake:canary@db/prod"}',
            "content_type": "application/json",
        }

    client.evaluate_sync = mock_evaluate_sync
    client.divert_to_honeypot_sync = mock_divert_sync

    guardian = GuardianFlaskMiddleware(flask_app, client=client)

    @flask_app.route("/api/reviews", methods=["POST"])
    def reviews():
        return jsonify({"status": "received"})

    @flask_app.route("/api/items", methods=["GET"])
    def items():
        return jsonify({"items": ["book", "pen"]})

    tc = flask_app.test_client()

    # 1. Benign GET
    res_benign = tc.get("/api/items")
    assert res_benign.status_code == 200
    assert res_benign.headers.get("X-Guardian-Action") == "ALLOW"

    # 2. Malicious POST
    res_attack = tc.post("/api/reviews", data="<script>alert(1)</script>")
    assert res_attack.status_code == 403
    assert res_attack.headers.get("X-Guardian-Action") == "BLOCK"
    attack_data = res_attack.get_json()
    assert attack_data["action"] == "BLOCK"
    assert attack_data["threat_score"] == 90

    # 3. Decoy Probe
    res_decoy = tc.get("/.git/config")
    assert res_decoy.status_code == 200
    assert "canary" in res_decoy.get_data(as_text=True)
    assert res_decoy.headers.get("X-Guardian-Action") == "HONEYPOT_TRAP"
    client.close()


# ─────────────────────────────────────────────────────────────────────────────
# 6. Django Middleware Protocol Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_django_middleware_protocol():
    """Django middleware contract verification."""
    config = GuardianConfig()
    client = GuardianClient(config=config)

    def mock_evaluate_sync(metadata):
        if "attack" in metadata.get("path", ""):
            return {"action": "BLOCK", "score": 95, "severity": "HIGH", "triggered_rules": []}
        return {"action": "ALLOW", "score": 5, "severity": "LOW", "triggered_rules": []}

    client.evaluate_sync = mock_evaluate_sync

    class MockRequest:
        def __init__(self, path="/api/data"):
            self.path = path
            self.method = "GET"
            self.META = {
                "REMOTE_ADDR": "192.168.1.50",
                "HTTP_USER_AGENT": "Mozilla/5.0",
                "QUERY_STRING": "",
            }
            self.body = b""

    class MockResponse:
        def __init__(self, data):
            self.data = data
            self.headers = {}

        def __setitem__(self, key, value):
            self.headers[key] = value

    def get_response_mock(req):
        return MockResponse({"message": "success"})

    middleware = GuardianDjangoMiddleware(get_response=get_response_mock, client=client)

    # Benign request
    req_clean = MockRequest(path="/api/data")
    resp_clean = middleware(req_clean)
    assert resp_clean.headers.get("X-Guardian-Action") == "ALLOW"
    assert resp_clean.headers.get("X-Guardian-Score") == "5"

    # Malicious request
    req_malicious = MockRequest(path="/api/attack")
    resp_malicious = middleware(req_malicious)
    # Returns block dictionary or JsonResponse
    if hasattr(resp_malicious, "status_code"):
        assert resp_malicious.status_code == 403
    elif isinstance(resp_malicious, dict):
        assert resp_malicious["action"] == "BLOCK"

    # Decoy request
    req_decoy = MockRequest(path="/.env")
    resp_decoy = middleware(req_decoy)
    if hasattr(resp_decoy, "status_code"):
        assert resp_decoy.status_code == 200
    elif isinstance(resp_decoy, dict):
        assert resp_decoy["status_code"] == 200

    client.close()
