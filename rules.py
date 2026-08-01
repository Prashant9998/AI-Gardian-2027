"""
rules.py - Rule-Based Threat Detection Engine (Stage 1)
AI Cyber Guardian - Security Processing Module

Purpose:
  First stage of the two-stage detection pipeline.
  Checks incoming HTTP requests against known attack signatures (R1-R6)
  BEFORE requests pass to the ML stage (Isolation Forest + Random Forest).

Features & Optimizations:
  - Precompiled regex patterns for zero per-request compilation overhead.
  - Automatic URL decoding & input normalization (prevents double-URL evasion).
  - Thread-safe sliding window rate limiter for brute-force tracking with auto-eviction.
  - Hot-reloadable threshold configuration from thresholds.json with safe defaults.
"""

import json
import logging
import re
import threading
import time
import urllib.parse
from collections import defaultdict, deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

# Setup logger for the RuleEngine
logger = logging.getLogger("RuleEngine")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class Severity(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class DetectionResult:
    """
    Structured result returned after evaluating one request.
    This gets passed downstream to the ML stage and SOC dashboard.
    """
    triggered_rules: List[dict] = field(default_factory=list)
    total_score: float = 0.0
    severity: Severity = Severity.LOW
    is_critical_override: bool = False
    metadata: dict = field(default_factory=dict)


class ThresholdConfig:
    """
    Loads rule weights + severity thresholds from thresholds.json.
    Protected by threading.Lock() for dynamic hot-reloading in production.
    """

    DEFAULT_CONFIG = {
        "R1_weight": 8.0,
        "R2_weight": 7.0,
        "R3_weight": 6.0,
        "R4_weight": 5.0,
        "R5_weight": 4.0,
        "R6_weight": 2.0,
        "R4_window_seconds": 120,
        "R4_attempt_threshold": 20,
        "R6_max_query_len": 2048,
        "threshold_medium": 5.0,
        "threshold_high": 10.0,
        "threshold_critical": 15.0,
    }

    def __init__(self, path: str = "thresholds.json"):
        self.path = path
        self._lock = threading.Lock()
        self._config = dict(self.DEFAULT_CONFIG)
        self.reload()

    def reload(self):
        """Re-reads thresholds.json from disk with fallback to defaults."""
        with self._lock:
            try:
                with open(self.path, "r", encoding="utf-8") as f:
                    file_config = json.load(f)
                    self._config.update(file_config)
                logger.info("Successfully loaded thresholds from %s", self.path)
            except (FileNotFoundError, json.JSONDecodeError) as err:
                logger.warning(
                    "Could not load '%s' (%s). Using fallback default thresholds.",
                    self.path, err
                )

    def get(self, key: str, default: Any = None) -> Any:
        """Thread-safe config accessor."""
        with self._lock:
            return self._config.get(key, default)


class SlidingWindowCounter:
    """
    Thread-safe sliding time-window counter with periodic stale key cleanup.
    Prevents memory leaks when tracking millions of transient source IPs.
    """

    def __init__(self, window_seconds: int = 120, cleanup_interval: int = 300):
        self.window_seconds = window_seconds
        self.cleanup_interval = cleanup_interval
        self.last_cleanup = time.time()
        self._lock = threading.Lock()
        self._events = defaultdict(deque)

    def add_event(self, key: str, ts: Optional[float] = None) -> int:
        ts = ts or time.time()
        with self._lock:
            self._periodic_cleanup(ts)
            dq = self._events[key]
            dq.append(ts)
            self._evict(dq, ts)
            return len(dq)

    def count(self, key: str, ts: Optional[float] = None) -> int:
        ts = ts or time.time()
        with self._lock:
            dq = self._events[key]
            self._evict(dq, ts)
            return len(dq)

    def _evict(self, dq: deque, now: float):
        cutoff = now - self.window_seconds
        while dq and dq[0] < cutoff:
            dq.popleft()

    def _periodic_cleanup(self, now: float):
        """Removes stale keys to prevent memory leaks."""
        if now - self.last_cleanup > self.cleanup_interval:
            cutoff = now - self.window_seconds
            stale_keys = [
                k for k, dq in self._events.items()
                if not dq or dq[-1] < cutoff
            ]
            for k in stale_keys:
                del self._events[k]
            self.last_cleanup = now


class RuleEngine:
    """
    Core rule-based detection engine.
    Runs R1-R6 against each incoming request and produces a DetectionResult.
    """

    def __init__(self, config: ThresholdConfig):
        self.config = config
        self.brute_force_window = SlidingWindowCounter(
            window_seconds=config.get("R4_window_seconds", 120)
        )
        self._compile_patterns()

    def _compile_patterns(self):
        """Precompile regex signatures at engine startup for maximum throughput."""

        # --- R1: SQL Injection signatures ---
        self.sqli_patterns = [re.compile(p, re.IGNORECASE) for p in [
            r"(\%27|\'|\-\-|\%23|#)\s*(union|select|insert|update|delete|drop|alter)",
            r"((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))",
            r"\b(union\s+all\s+select|select\s+.*\s+from|insert\s+into|delete\s+from)\b",
            r"\bor\b\s+[\'\"]?\d+[\'\"]?\s*=\s*[\'\"]?\d+[\'\"]?",
            r"\b(exec|execute)\s*\(\s*s_(sys|xp_)",
            r"\bwaitfor\s+delay\b|\bsleep\(\d+\)",
        ]]

        # --- R2: XSS signatures ---
        self.xss_patterns = [re.compile(p, re.IGNORECASE) for p in [
            r"<\s*script[^>]*>",
            r"javascript\s*:",
            r"on(error|load|click|mouseover|submit)\s*=",
            r"<\s*img[^>]+src[^>]*=",
            r"<\s*iframe[^>]*>",
        ]]

        # --- R3: Path Traversal signatures ---
        self.path_traversal_patterns = [re.compile(p, re.IGNORECASE) for p in [
            r"\.\./",
            r"\.\.\\",
            r"%2e%2e%2f|%2e%2e/",
            r"/etc/(passwd|shadow|hosts)",
            r"c:\\windows\\(system32|win\.ini)",
            r"boot\.ini",
        ]]

        # --- R5: Known attack tool / scanner User-Agents ---
        self.scanner_signatures = [
            "sqlmap", "nikto", "acunetix", "nmap", "gobuster", "wpscan", "burpsuite", "dirbuster"
        ]

    def _normalize(self, text: str) -> str:
        """Applies multi-pass URL decoding to normalize incoming payload text."""
        if not text:
            return ""
        decoded_once = urllib.parse.unquote(text)
        decoded_twice = urllib.parse.unquote(decoded_once)
        return decoded_twice

    def _get_payload(self, request: dict) -> str:
        """Combines request components safely into one string for scanning."""
        path = str(request.get("path", ""))
        query = str(request.get("query", ""))
        body = request.get("body", "")

        if isinstance(body, (dict, list)):
            body = json.dumps(body)
        else:
            body = str(body)

        raw_combined = f"{path} {query} {body}"
        return self._normalize(raw_combined)

    # ================================================================
    # R1: SQL Injection Detection
    # ================================================================
    def r1_sqli(self, request: dict) -> Optional[dict]:
        payload = self._get_payload(request)
        hits = [p.pattern for p in self.sqli_patterns if p.search(payload)]
        if hits:
            return {
                "rule": "R1_SQLI",
                "score": self.config.get("R1_weight", 8.0),
                "detail": {"matched_patterns": len(hits)}
            }
        return None

    # ================================================================
    # R2: Cross-Site Scripting (XSS) Detection
    # ================================================================
    def r2_xss(self, request: dict) -> Optional[dict]:
        payload = self._get_payload(request)
        hits = [p.pattern for p in self.xss_patterns if p.search(payload)]
        if hits:
            return {
                "rule": "R2_XSS",
                "score": self.config.get("R2_weight", 7.0),
                "detail": {"matched_patterns": len(hits)}
            }
        return None

    # ================================================================
    # R3: Path Traversal Detection
    # ================================================================
    def r3_path_traversal(self, request: dict) -> Optional[dict]:
        target = self._normalize(str(request.get("path", "")) + " " + str(request.get("query", "")))
        hits = [p.pattern for p in self.path_traversal_patterns if p.search(target)]
        if hits:
            return {
                "rule": "R3_PATH_TRAVERSAL",
                "score": self.config.get("R3_weight", 6.0),
                "detail": {"matched_patterns": len(hits)}
            }
        return None

    # ================================================================
    # R4: Brute Force Detection (Rate-based with hard override)
    # ================================================================
    def r4_brute_force(self, request: dict) -> Optional[dict]:
        if request.get("endpoint_type") != "login":
            return None

        ip = request.get("source_ip", "unknown")
        count = self.brute_force_window.add_event(ip)
        threshold = self.config.get("R4_attempt_threshold", 20)

        result = {
            "rule": "R4_BRUTE_FORCE",
            "score": self.config.get("R4_weight", 5.0),
            "detail": {"attempts_in_window": count}
        }

        if count >= threshold:
            result["force_critical"] = True

        return result if count >= threshold else None

    # ================================================================
    # R5: Web Scanner / Tool Fingerprint Detection
    # ================================================================
    def r5_scanner(self, request: dict) -> Optional[dict]:
        user_agent = request.get("user_agent", "").lower()
        hits = [sig for sig in self.scanner_signatures if sig in user_agent]
        if hits:
            return {
                "rule": "R5_SCANNER",
                "score": self.config.get("R5_weight", 4.0),
                "detail": {"signatures": hits}
            }
        return None

    # ================================================================
    # R6: Anomalous Request Structure
    # ================================================================
    def r6_anomalous_structure(self, request: dict) -> Optional[dict]:
        anomalies = []
        if request.get("method") not in ("GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"):
            anomalies.append("unusual_method")

        if len(str(request.get("query", ""))) > self.config.get("R6_max_query_len", 2048):
            anomalies.append("oversized_query")

        if not request.get("user_agent"):
            anomalies.append("missing_user_agent")

        if anomalies:
            return {
                "rule": "R6_ANOMALOUS_STRUCTURE",
                "score": self.config.get("R6_weight", 2.0),
                "detail": {"anomalies": anomalies}
            }
        return None

    # ================================================================
    # Orchestration: Run all rules and calculate final score
    # ================================================================
    def evaluate(self, request: dict) -> DetectionResult:
        rule_fns = [
            self.r1_sqli, self.r2_xss, self.r3_path_traversal,
            self.r4_brute_force, self.r5_scanner, self.r6_anomalous_structure,
        ]

        result = DetectionResult()
        force_critical = False

        for fn in rule_fns:
            hit = fn(request)
            if hit:
                result.triggered_rules.append(hit)
                result.total_score += hit["score"]
                if hit.get("force_critical"):
                    force_critical = True

        result.severity = self._score_to_severity(result.total_score)

        if force_critical:
            result.severity = Severity.CRITICAL
            result.is_critical_override = True

        return result

    def _score_to_severity(self, score: float) -> Severity:
        if score >= self.config.get("threshold_critical", 15):
            return Severity.CRITICAL
        elif score >= self.config.get("threshold_high", 10):
            return Severity.HIGH
        elif score >= self.config.get("threshold_medium", 5):
            return Severity.MEDIUM
        return Severity.LOW


# ------------------------------------------------------------------
# Test Verification Execution
# ------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("AI Cyber Guardian - Stage 1 Rule Engine Test")
    print("=" * 60)

    config = ThresholdConfig("thresholds.json")
    engine = RuleEngine(config)

    # Sample Request 1: Malicious SQLi Request
    sqli_request = {
        "source_ip": "192.168.1.10",
        "method": "GET",
        "path": "/product",
        "query": "id=1%27%20UNION%20SELECT%20username,password%20FROM%20users--",
        "body": "",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "endpoint_type": "product",
    }

    res1 = engine.evaluate(sqli_request)
    print(f"\n[Test 1 - SQLi Request]")
    print(f"Severity: {res1.severity.value}")
    print(f"Total Score: {res1.total_score}")
    print(f"Triggered Rules: {[r['rule'] for r in res1.triggered_rules]}")

    # Sample Request 2: Scanner / Attack Tool (sqlmap)
    scanner_request = {
        "source_ip": "45.33.32.156",
        "method": "GET",
        "path": "/login",
        "query": "user=admin",
        "body": "",
        "user_agent": "sqlmap/1.5.11#stable (http://sqlmap.org)",
        "endpoint_type": "login",
    }

    res2 = engine.evaluate(scanner_request)
    print(f"\n[Test 2 - Scanner Tool]")
    print(f"Severity: {res2.severity.value}")
    print(f"Total Score: {res2.total_score}")
    print(f"Triggered Rules: {[r['rule'] for r in res2.triggered_rules]}")
