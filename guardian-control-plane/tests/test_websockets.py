import pytest
import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from api.routers.ws import broadcast_threat_event, manager

client = TestClient(app)

def test_websocket_connection_and_handshake():
    """Verify WebSocket client can connect and receive handshake & pong."""
    with client.websocket_connect("/api/v1/ws/threats") as websocket:
        data = websocket.receive_text()
        msg = json.loads(data)
        assert msg["type"] == "CONNECTION_ESTABLISHED"
        assert "client_count" in msg

        # Send ping, expect PONG
        websocket.send_text("ping")
        pong = websocket.receive_text()
        pong_msg = json.loads(pong)
        assert pong_msg["type"] == "PONG"


def test_websocket_broadcast_direct():
    """Verify broadcast_threat_event delivers payload to active WebSocket connections."""
    with client.websocket_connect("/api/v1/ws/threats") as websocket:
        # Read handshake
        websocket.receive_text()

        test_event = {
            "event_type": "THREAT_EVENT",
            "id": "evt-test-12345",
            "score": 92.5,
            "severity": "CRITICAL",
            "action": "HONEYPOT",
            "type": "SQLi",
            "payload": "' UNION SELECT * FROM users--"
        }
        broadcast_threat_event(test_event)

        received_text = websocket.receive_text()
        received_event = json.loads(received_text)
        assert received_event["event_type"] == "THREAT_EVENT"
        assert received_event["id"] == "evt-test-12345"
        assert received_event["severity"] == "CRITICAL"
        assert received_event["score"] == 92.5


def test_ingestion_eval_broadcasts_to_websocket():
    """Verify that calling evaluate endpoint broadcasts the threat event over WebSocket."""
    with client.websocket_connect("/api/v1/ws/threats") as websocket:
        # Read handshake
        websocket.receive_text()

        # Send an attack payload to /evaluate
        response = client.post(
            "/api/v1/ingestion/evaluate",
            json={
                "source_ip": "198.51.100.42",
                "path": "/api/users",
                "method": "POST",
                "query": "id=1' UNION SELECT 1,2,3--",
                "headers": {"User-Agent": "sqlmap/1.7"}
            },
            headers={"X-API-Key": "guardian-prod-demo-key-2026"}
        )
        assert response.status_code == 200
        res_json = response.json()
        assert res_json["action"] in ["BLOCK", "HONEYPOT"]

        # WebSocket should immediately receive the threat broadcast
        event_raw = websocket.receive_text()
        event = json.loads(event_raw)
        assert event["event_type"] == "THREAT_EVENT"
        assert event["ip"] == "198.51.100.42"
        assert event["type"] in ["SQLi", "R1_SQLI"]
        assert event["score"] > 30


def test_honeypot_trap_broadcasts_to_websocket():
    """Verify that hitting a decoy endpoint broadcasts a CRITICAL honeypot event."""
    with client.websocket_connect("/api/v1/ws/threats") as websocket:
        # Read handshake
        websocket.receive_text()

        response = client.get("/api/v1/honeypot/.env")
        assert response.status_code == 200

        event_raw = websocket.receive_text()
        event = json.loads(event_raw)
        assert event["event_type"] == "THREAT_EVENT"
        assert event["severity"] == "CRITICAL"
        assert event["status"] == "Trapped in Honeypot"
