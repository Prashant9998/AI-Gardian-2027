"""
Tests for ML Ops & Retraining Router (/api/v1/ml).
Verifies model status retrieval, benchmark metadata, and on-demand retraining.
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_ml_status_endpoint():
    response = client.get("/api/v1/ml/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "dual_engine" in data
    assert "anomaly_detector" in data["dual_engine"]
    assert "threat_classifier" in data["dual_engine"]
    assert "benchmark" in data
    assert "accuracy" in data["benchmark"]

def test_ml_retrain_endpoint():
    response = client.post("/api/v1/ml/retrain")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "metrics" in data
    assert data["metrics"]["accuracy"] >= 0.90
    assert data["metrics"]["f1_score"] >= 0.90
