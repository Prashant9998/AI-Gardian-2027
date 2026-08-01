"""
===============================================================================
AI Cyber Guardian / Payload & Threat Processing Framework
Module: rule_base.py (Rule Engine Base Architecture)
Description: Standardized abstract base classes, datatypes, registry, and execution
             engine for security rules, payload transformers, and detection models.
===============================================================================
"""

from __future__ import annotations

import abc
import enum
import logging
import re
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Set, Union


# -----------------------------------------------------------------------------
# Logging Configuration
# -----------------------------------------------------------------------------
logger = logging.getLogger("RuleEngine")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


# -----------------------------------------------------------------------------
# Enumerations
# -----------------------------------------------------------------------------
class RuleSeverity(str, enum.Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RuleCategory(str, enum.Enum):
    INJECTION = "INJECTION"
    XSS = "XSS"
    PATH_TRAVERSAL = "PATH_TRAVERSAL"
    OBFUSCATION = "OBFUSCATION"
    ANOMALY = "ANOMALY"
    ENCODING = "ENCODING"
    CUSTOM = "CUSTOM"


class RuleStatus(str, enum.Enum):
    MATCH = "MATCH"
    NO_MATCH = "NO_MATCH"
    ERROR = "ERROR"
    SKIPPED = "SKIPPED"


class ActionType(str, enum.Enum):
    ALLOW = "ALLOW"
    FLAG = "FLAG"
    BLOCK = "BLOCK"
    TRANSFORM = "TRANSFORM"
    ALERT = "ALERT"


# -----------------------------------------------------------------------------
# Data Models
# -----------------------------------------------------------------------------
@dataclass
class RuleMatchDetail:
    """Detailed information regarding a specific rule match."""
    matched_pattern: str
    matched_value: Any
    location: Optional[str] = None
    start_pos: Optional[int] = None
    end_pos: Optional[int] = None
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RuleResult:
    """Output returned after executing a rule against a target payload or context."""
    rule_id: str
    rule_name: str
    status: RuleStatus
    confidence: float = 0.0  # Range: 0.0 to 1.0
    severity: RuleSeverity = RuleSeverity.INFO
    category: RuleCategory = RuleCategory.CUSTOM
    execution_time_ms: float = 0.0
    action: ActionType = ActionType.ALLOW
    matches: List[RuleMatchDetail] = field(default_factory=list)
    transformed_payload: Optional[Any] = None
    message: str = ""
    error: Optional[str] = None

    @property
    def is_triggered(self) -> bool:
        return self.status == RuleStatus.MATCH


@dataclass
class EvaluationContext:
    """Encapsulates input payload data and contextual metadata for evaluation."""
    payload: Any
    headers: Dict[str, str] = field(default_factory=dict)
    query_params: Dict[str, Any] = field(default_factory=dict)
    source_ip: str = "127.0.0.1"
    user_agent: str = "Unknown"
    tenant_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


# -----------------------------------------------------------------------------
# Abstract Base Rule Class
# -----------------------------------------------------------------------------
class BaseRule(abc.ABC):
    """
    Abstract Base Class for all Security, Obfuscation, and Detection Rules.
    
    Subclasses must implement:
        - `_evaluate(self, context: EvaluationContext) -> RuleResult`
    """

    def __init__(
        self,
        rule_id: Optional[str] = None,
        name: str = "Unnamed Rule",
        description: str = "",
        category: RuleCategory = RuleCategory.CUSTOM,
        severity: RuleSeverity = RuleSeverity.MEDIUM,
        tags: Optional[Set[str]] = None,
        enabled: bool = True,
        priority: int = 100,
    ) -> None:
        self.rule_id: str = rule_id or f"RULE-{uuid.uuid4().hex[:8].upper()}"
        self.name: str = name
        self.description: str = description
        self.category: RuleCategory = category
        self.severity: RuleSeverity = severity
        self.tags: Set[str] = tags or set()
        self.enabled: bool = enabled
        self.priority: int = priority

    def evaluate(self, context: EvaluationContext) -> RuleResult:
        """
        Executes rule evaluation with execution timing, safety exception handling,
        and state validation.
        """
        if not self.enabled:
            return RuleResult(
                rule_id=self.rule_id,
                rule_name=self.name,
                status=RuleStatus.SKIPPED,
                message="Rule is disabled",
            )

        start_time = time.perf_counter()
        try:
            result = self._evaluate(context)
        except Exception as exc:
            exec_time = (time.perf_counter() - start_time) * 1000.0
            logger.error("Error executing rule %s (%s): %s", self.rule_id, self.name, exc, exc_info=True)
            return RuleResult(
                rule_id=self.rule_id,
                rule_name=self.name,
                status=RuleStatus.ERROR,
                execution_time_ms=exec_time,
                error=str(exc),
                message=f"Execution error: {exc}",
            )

        exec_time = (time.perf_counter() - start_time) * 1000.0
        result.execution_time_ms = round(exec_time, 4)
        result.rule_id = self.rule_id
        result.rule_name = self.name
        result.severity = self.severity
        result.category = self.category
        return result

    @abc.abstractmethod
    def _evaluate(self, context: EvaluationContext) -> RuleResult:
        """Core rule evaluation logic to be implemented by child classes."""
        pass

    def to_dict(self) -> Dict[str, Any]:
        """Serializes rule configuration to dictionary format."""
        return {
            "rule_id": self.rule_id,
            "name": self.name,
            "description": self.description,
            "category": self.category.value,
            "severity": self.severity.value,
            "tags": list(self.tags),
            "enabled": self.enabled,
            "priority": self.priority,
        }


# -----------------------------------------------------------------------------
# Regex / Pattern Rule Base
# -----------------------------------------------------------------------------
class RegexRule(BaseRule):
    """Rule base implementation for multi-pattern Regex matching."""

    def __init__(
        self,
        patterns: List[str],
        flags: int = re.IGNORECASE,
        action: ActionType = ActionType.FLAG,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self.raw_patterns = patterns
        self.flags = flags
        self.action = action
        self.compiled_patterns: List[re.Pattern] = [
            re.compile(p, flags=flags) for p in patterns
        ]

    def _evaluate(self, context: EvaluationContext) -> RuleResult:
        payload_str = str(context.payload)
        matches: List[RuleMatchDetail] = []

        for pattern in self.compiled_patterns:
            for match in pattern.finditer(payload_str):
                matches.append(
                    RuleMatchDetail(
                        matched_pattern=pattern.pattern,
                        matched_value=match.group(0),
                        start_pos=match.start(),
                        end_pos=match.end(),
                    )
                )

        if matches:
            return RuleResult(
                rule_id=self.rule_id,
                rule_name=self.name,
                status=RuleStatus.MATCH,
                confidence=1.0 if len(matches) > 1 else 0.85,
                action=self.action,
                matches=matches,
                message=f"Matched {len(matches)} signature pattern(s).",
            )

        return RuleResult(
            rule_id=self.rule_id,
            rule_name=self.name,
            status=RuleStatus.NO_MATCH,
            message="No signature patterns matched.",
        )


# -----------------------------------------------------------------------------
# Composite / Boolean Logic Rules
# -----------------------------------------------------------------------------
class AndRuleGroup(BaseRule):
    """Evaluates multiple child rules and requires ALL rules to match."""

    def __init__(self, rules: List[BaseRule], **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.rules = rules

    def _evaluate(self, context: EvaluationContext) -> RuleResult:
        all_matches: List[RuleMatchDetail] = []
        confidences: List[float] = []

        for rule in self.rules:
            res = rule.evaluate(context)
            if not res.is_triggered:
                return RuleResult(
                    rule_id=self.rule_id,
                    rule_name=self.name,
                    status=RuleStatus.NO_MATCH,
                    message=f"Child rule '{rule.name}' failed to match.",
                )
            all_matches.extend(res.matches)
            confidences.append(res.confidence)

        avg_confidence = sum(confidences) / len(confidences) if confidences else 1.0
        return RuleResult(
            rule_id=self.rule_id,
            rule_name=self.name,
            status=RuleStatus.MATCH,
            confidence=avg_confidence,
            matches=all_matches,
            message="All composite rules satisfied.",
        )


class OrRuleGroup(BaseRule):
    """Evaluates multiple child rules and triggers if AT LEAST ONE rule matches."""

    def __init__(self, rules: List[BaseRule], **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.rules = rules

    def _evaluate(self, context: EvaluationContext) -> RuleResult:
        all_matches: List[RuleMatchDetail] = []
        confidences: List[float] = []

        for rule in self.rules:
            res = rule.evaluate(context)
            if res.is_triggered:
                all_matches.extend(res.matches)
                confidences.append(res.confidence)

        if all_matches:
            max_confidence = max(confidences) if confidences else 1.0
            return RuleResult(
                rule_id=self.rule_id,
                rule_name=self.name,
                status=RuleStatus.MATCH,
                confidence=max_confidence,
                matches=all_matches,
                message=f"Composite OR matched with {len(all_matches)} detail(s).",
            )

        return RuleResult(
            rule_id=self.rule_id,
            rule_name=self.name,
            status=RuleStatus.NO_MATCH,
            message="No child rules matched in OR group.",
        )


# -----------------------------------------------------------------------------
# Rule Base / Registry and Manager
# -----------------------------------------------------------------------------
class RuleBase:
    """
    Central Repository and Management Engine for Security Rules.
    
    Provides capabilities for:
        - Rule registration (manual or decorator-based)
        - Rule selection by category, tag, or severity
        - Full rule set execution against an evaluation context
    """

    def __init__(self) -> None:
        self._rules: Dict[str, BaseRule] = {}

    def register(self, rule: BaseRule) -> BaseRule:
        """Registers a rule instance in the rule base."""
        if rule.rule_id in self._rules:
            logger.warning("Overwriting existing rule ID: %s", rule.rule_id)
        self._rules[rule.rule_id] = rule
        logger.debug("Registered rule: %s [%s]", rule.name, rule.rule_id)
        return rule

    def register_decorator(
        self,
        rule_id: Optional[str] = None,
        name: str = "Decorated Rule",
        category: RuleCategory = RuleCategory.CUSTOM,
        severity: RuleSeverity = RuleSeverity.MEDIUM,
        tags: Optional[Set[str]] = None,
    ) -> Callable[[Callable[[EvaluationContext], RuleResult]], BaseRule]:
        """Decorator to construct and register a functional rule dynamically."""

        def decorator(func: Callable[[EvaluationContext], RuleResult]) -> BaseRule:
            class FunctionalRule(BaseRule):
                def _evaluate(self, ctx: EvaluationContext) -> RuleResult:
                    return func(ctx)

            inst = FunctionalRule(
                rule_id=rule_id,
                name=name,
                category=category,
                severity=severity,
                tags=tags,
            )
            self.register(inst)
            return inst

        return decorator

    def unregister(self, rule_id: str) -> Optional[BaseRule]:
        """Removes a rule by its ID."""
        return self._rules.pop(rule_id, None)

    def get_rule(self, rule_id: str) -> Optional[BaseRule]:
        """Retrieves a rule by its ID."""
        return self._rules.get(rule_id)

    def list_rules(
        self,
        category: Optional[RuleCategory] = None,
        tag: Optional[str] = None,
        enabled_only: bool = True,
    ) -> List[BaseRule]:
        """Lists registered rules matching specified criteria."""
        rules = list(self._rules.values())
        if enabled_only:
            rules = [r for r in rules if r.enabled]
        if category:
            rules = [r for r in rules if r.category == category]
        if tag:
            rules = [r for r in rules if tag in r.tags]
        return sorted(rules, key=lambda r: r.priority)

    def evaluate_all(
        self,
        context: EvaluationContext,
        stop_on_first_match: bool = False,
        min_severity: Optional[RuleSeverity] = None,
    ) -> List[RuleResult]:
        """
        Executes all active rules against the given evaluation context.
        """
        results: List[RuleResult] = []
        active_rules = self.list_rules(enabled_only=True)

        severity_levels = {
            RuleSeverity.INFO: 0,
            RuleSeverity.LOW: 1,
            RuleSeverity.MEDIUM: 2,
            RuleSeverity.HIGH: 3,
            RuleSeverity.CRITICAL: 4,
        }
        min_level = severity_levels.get(min_severity, 0) if min_severity else 0

        for rule in active_rules:
            if severity_levels.get(rule.severity, 0) < min_level:
                continue

            result = rule.evaluate(context)
            results.append(result)

            if stop_on_first_match and result.is_triggered:
                logger.info("Stopping evaluation early due to match on rule: %s", rule.rule_id)
                break

        return results


# -----------------------------------------------------------------------------
# Concrete Example Implementations
# -----------------------------------------------------------------------------
class SQLInjectionDetectionRule(RegexRule):
    """Built-in rule for detecting SQL Injection signature vectors."""

    DEFAULT_SQLI_PATTERNS = [
        r"(\b(UNION(\s+ALL)?|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE)\b)",
        r"(' OR '1'='1'|--|/\*|\*/|;\s*SHUTDOWN)",
        r"(\bWAITFOR\s+DELAY\b|\bSLEEP\(\d+\))",
    ]

    def __init__(self, **kwargs: Any) -> None:
        patterns = kwargs.pop("patterns", self.DEFAULT_SQLI_PATTERNS)
        super().__init__(
            patterns=patterns,
            rule_id=kwargs.pop("rule_id", "RULE-SQLI-001"),
            name=kwargs.pop("name", "SQL Injection Detection"),
            category=RuleCategory.INJECTION,
            severity=RuleSeverity.HIGH,
            tags=kwargs.pop("tags", {"owasp", "sqli", "injection"}),
            action=ActionType.BLOCK,
            **kwargs,
        )


class HighEntropyPayloadRule(BaseRule):
    """Built-in rule detecting obfuscated/encrypted payloads via Shannon Entropy."""

    def __init__(self, entropy_threshold: float = 4.5, **kwargs: Any) -> None:
        super().__init__(
            rule_id=kwargs.pop("rule_id", "RULE-ENTROPY-001"),
            name=kwargs.pop("name", "High Entropy Payload Detector"),
            category=RuleCategory.OBFUSCATION,
            severity=RuleSeverity.MEDIUM,
            tags=kwargs.pop("tags", {"obfuscation", "entropy"}),
            **kwargs,
        )
        self.entropy_threshold = entropy_threshold

    @staticmethod
    def calculate_shannon_entropy(data: str) -> float:
        import math
        if not data:
            return 0.0
        entropy = 0.0
        length = len(data)
        frequencies: Dict[str, int] = {}
        for char in data:
            frequencies[char] = frequencies.get(char, 0) + 1
        for count in frequencies.values():
            p = count / length
            entropy -= p * math.log2(p)
        return entropy

    def _evaluate(self, context: EvaluationContext) -> RuleResult:
        payload_str = str(context.payload)
        entropy = self.calculate_shannon_entropy(payload_str)

        if entropy >= self.entropy_threshold:
            return RuleResult(
                rule_id=self.rule_id,
                rule_name=self.name,
                status=RuleStatus.MATCH,
                confidence=min(1.0, (entropy - self.entropy_threshold) / 2.0 + 0.7),
                action=ActionType.FLAG,
                matches=[
                    RuleMatchDetail(
                        matched_pattern=f"Entropy >= {self.entropy_threshold}",
                        matched_value=f"EntropyScore: {round(entropy, 3)}",
                    )
                ],
                message=f"Payload entropy {round(entropy, 3)} exceeded threshold {self.entropy_threshold}.",
            )

        return RuleResult(
            rule_id=self.rule_id,
            rule_name=self.name,
            status=RuleStatus.NO_MATCH,
            message=f"Entropy {round(entropy, 3)} is within normal limits.",
        )


# -----------------------------------------------------------------------------
# Module Verification / Example Usage
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("AI Cyber Guardian - Rule Engine (base.py / rule_base.py) Test")
    print("=" * 60)

    # 1. Initialize RuleBase Manager
    registry = RuleBase()

    # 2. Register Rules
    registry.register(SQLInjectionDetectionRule())
    registry.register(HighEntropyPayloadRule(entropy_threshold=4.2))

    # 3. Test Payloads
    test_context_sqli = EvaluationContext(
        payload="SELECT * FROM users WHERE username = 'admin' UNION SELECT 1,2,3--",
        source_ip="192.168.1.100",
    )

    test_context_obfuscated = EvaluationContext(
        payload="aWYoISF3aW5kb3cpIHsgZXZhbChhdG9iKCJhV1pvSUNFd0lIdnBaR3QzYVdSa2IzY3BJSHNnSUZSNVFXVnVJRzE1SUdGd0lFaGxJRzkxSUhKbGRIVnliaUJoYm5RZ2FXNW1iM0p0WVhScGIyNGdhVzVuYm1SbGJpQnVaWFJsY2lCbGVDQmxjM0JsWTJocGJRPT0iKSk7IH0=",
        source_ip="10.0.0.50",
    )

    # 4. Evaluate Payloads
    print("\n--- Testing SQL Injection Payload ---")
    results_1 = registry.evaluate_all(test_context_sqli)
    for r in results_1:
        print(f"[{r.status.value}] {r.rule_name} (Severity: {r.severity.value}, Time: {r.execution_time_ms}ms)")
        if r.is_triggered:
            print(f"   Message: {r.message}")
            for m in r.matches:
                print(f"   Match Detail: {m.matched_value}")

    print("\n--- Testing Obfuscated Payload ---")
    results_2 = registry.evaluate_all(test_context_obfuscated)
    for r in results_2:
        print(f"[{r.status.value}] {r.rule_name} (Severity: {r.severity.value}, Time: {r.execution_time_ms}ms)")
        if r.is_triggered:
            print(f"   Message: {r.message}")
            for m in r.matches:
                print(f"   Match Detail: {m.matched_value}")
