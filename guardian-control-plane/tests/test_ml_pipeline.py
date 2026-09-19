"""
Machine Learning Pipeline Test Suite
Validates feature extraction, Joblib model loading speed (< 500ms),
F1-score benchmarks (>= 92%), and False Positive Rate (<= 4.5%).
"""

import os
import sys
import json
import time
import pytest
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.ml_engine import MLEngine, fusion_engine
from ml.features import AdvancedFeatureExtractor

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml", "models")

@pytest.fixture
def ml_engine():
    engine = MLEngine()
    engine.load_models()
    return engine

def test_feature_extraction_pipeline():
    """Verify feature extractor extracts 12 numeric + TF-IDF n-grams without NaN."""
    extractor = AdvancedFeatureExtractor()
    extractor.fit_vectorizer(["GET /index.html", "POST /api/login user=admin"])

    sample_req = {
        "path": "/products/search",
        "query": "category=electronics&sort=asc",
        "body": '{"item_id": 123}',
        "method": "POST",
        "headers": {"User-Agent": "Mozilla/5.0"}
    }

    vec = extractor.transform(sample_req)
    assert isinstance(vec, np.ndarray)
    assert len(vec) == 16 + 64 # 80 dimensions (16 numeric + 64 TF-IDF)
    assert not np.isnan(vec).any()
    assert not np.isinf(vec).any()

def test_model_loading_speed(ml_engine):
    """Verify serialized Joblib models load into memory in < 500ms."""
    start_time = time.time()
    loaded = ml_engine.load_models(force=True)
    duration_ms = (time.time() - start_time) * 1000.0

    assert loaded is True
    assert duration_ms < 500.0, f"Model loading took {duration_ms:.2f}ms, exceeding 500ms target."

def test_metadata_benchmark_criteria():
    """Verify serialized model metadata confirms F1 >= 92% and FPR <= 4.5%."""
    meta_path = os.path.join(MODELS_DIR, "metadata.json")
    assert os.path.exists(meta_path), "Model metadata.json must exist."

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["f1_score"] >= 0.92, f"F1-Score {meta['f1_score']} is below 0.92."
    assert meta["false_positive_rate"] <= 4.5, f"FPR {meta['false_positive_rate']}% exceeds 4.5% threshold."
    assert meta["accuracy"] >= 0.95

def test_clean_request_low_threat_score(ml_engine):
    """Verify clean legitimate HTTP requests receive low ML threat scores."""
    clean_requests = [
        {"path": "/products", "query": "page=2&sort=asc", "method": "GET"},
        {"path": "/about", "query": "", "method": "GET"},
        {"path": "/api/v1/cart", "body": '{"quantity": 1, "id": 55}', "method": "POST"},
        {"path": "/contact", "body": '{"name": "Alice", "message": "Hello!"}', "method": "POST"}
    ]

    for req in clean_requests:
        score = ml_engine.evaluate(req)
        category = ml_engine.predict_category(req)
        assert score < 35.0, f"Clean request {req['path']} flagged with high score {score}."
        assert category == "NORMAL"

def test_attack_detection_high_threat_score(ml_engine):
    """Verify attack payloads receive high ML threat scores and correct classification."""
    # 1. SQL Injection
    sqli_req = {
        "path": "/products/search",
        "query": "q=' UNION SELECT 1,2,password_hash FROM users--",
        "method": "GET"
    }
    sqli_score = ml_engine.evaluate(sqli_req)
    assert sqli_score >= 65.0
    assert ml_engine.predict_category(sqli_req) == "SQLI"

    # 2. XSS Attack
    xss_req = {
        "path": "/comments/new",
        "body": '{"comment": "<script>alert(document.cookie)</script>"}',
        "method": "POST"
    }
    xss_score = ml_engine.evaluate(xss_req)
    assert xss_score >= 65.0
    assert ml_engine.predict_category(xss_req) == "XSS"

    # 3. Path Traversal
    lfi_req = {
        "path": "/view",
        "query": "file=../../../../etc/passwd",
        "method": "GET"
    }
    lfi_score = ml_engine.evaluate(lfi_req)
    assert lfi_score >= 65.0
    assert ml_engine.predict_category(lfi_req) == "PATH_TRAVERSAL"

    # 4. Command Injection
    rce_req = {
        "path": "/api/ping",
        "query": "host=127.0.0.1; whoami",
        "method": "GET"
    }
    rce_score = ml_engine.evaluate(rce_req)
    assert rce_score >= 65.0
    assert ml_engine.predict_category(rce_req) == "RCE"

def test_threat_fusion_engine_blending():
    """Verify ThreatFusionEngine blends rule and ML scores properly."""
    clean_req = {"path": "/home", "query": ""}
    fused_clean = fusion_engine.fuse(rule_score=0.0, is_critical_override=False, request=clean_req)
    assert 0.0 <= fused_clean < 30.0

    attack_req = {"path": "/search", "query": "q=' UNION SELECT * FROM users--"}
    fused_attack = fusion_engine.fuse(rule_score=8.0, is_critical_override=False, request=attack_req)
    assert fused_attack >= 75.0
