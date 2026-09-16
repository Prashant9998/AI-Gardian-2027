import pytest
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.rules import RuleEngine
from core.ml_engine import fusion_engine
from core.decision_engine import decision_engine
from core.ip_filter import ip_filter

@pytest.fixture
def rule_engine():
    return RuleEngine(config=None)

def test_ip_filter_allowlist():
    ip_filter.load_rules(allowlist=["192.168.1.0/24"], blocklist=["10.0.0.0/8"])
    assert ip_filter.evaluate("192.168.1.50") == "ALLOW"
    assert ip_filter.evaluate("10.0.0.5") == "BLOCK"
    assert ip_filter.evaluate("8.8.8.8") is None

def test_rule_sqli_double_url_decode(rule_engine):
    # Test double URL decoding evasion
    # %2527 is %27 URL encoded -> double decoded it's '
    payload = {
        "source_ip": "127.0.0.1",
        "path": "/api",
        "query": "id=1%2527%20UNION%20SELECT%20user--",
        "method": "GET"
    }
    result = rule_engine.evaluate(payload)
    rule_names = [r["rule"] for r in result.triggered_rules]
    assert "R1_SQLI" in rule_names

def test_rule_command_injection(rule_engine):
    payload = {
        "source_ip": "127.0.0.1",
        "path": "/api",
        "query": "cmd=;ls -la",
        "method": "GET"
    }
    result = rule_engine.evaluate(payload)
    rule_names = [r["rule"] for r in result.triggered_rules]
    assert "R3_PATH_TRAVERSAL" in rule_names # We added it to R3 regexes

def test_brute_force_override(rule_engine):
    # Setup brute force hits
    payload = {"source_ip": "1.1.1.1", "endpoint_type": "login"}
    for _ in range(20):
        result = rule_engine.evaluate(payload)
        
    assert result.is_critical_override == True
    assert result.severity.value == "CRITICAL"

def test_threat_fusion_engine():
    payload = {"path": "/normal/url", "query": "id=1"}
    final_score = fusion_engine.fuse(
        rule_score=0.0,
        is_critical_override=False,
        request=payload
    )
    # Score should be low, probably mostly just ML noise
    assert 0 <= final_score < 30

def test_decision_engine():
    assert decision_engine.map_severity_to_action("LOW") == "ALLOW"
    assert decision_engine.map_severity_to_action("MEDIUM") == "ALERT"
    assert decision_engine.map_severity_to_action("HIGH") == "BLOCK"
    assert decision_engine.map_severity_to_action("CRITICAL") == "HONEYPOT"

def test_false_positive_rate(rule_engine):
    """
    Validate that normal payloads have a very low false positive rate (target <= 5%).
    """
    normal_payloads = [
        {"path": "/home", "query": "sort=desc"},
        {"path": "/about", "query": ""},
        {"path": "/contact", "body": '{"name": "john"}'},
        {"path": "/products/123", "query": "q=shoes"},
        {"path": "/api/users", "method": "GET"}
    ]
    
    false_positives = 0
    for p in normal_payloads:
        res = rule_engine.evaluate(p)
        if res.severity.value != "LOW":
            false_positives += 1
            
    fp_rate = (false_positives / len(normal_payloads)) * 100
    assert fp_rate <= 5.0, f"False positive rate {fp_rate}% exceeds 5% target."
