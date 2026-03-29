"""Rule engine that combines pattern-based rules with ML model weights.

Architecture:
  1. Pattern rules: regex/keyword matching → hit or miss
  2. ML weights: injection score, ambiguity score from KNN models
  3. Combined scoring: weighted sum of all signals → final risk percentage

Example rule:
  Rule(
      name="system_prompt_extraction",
      patterns=["system prompt", "reveal.*instructions", "ignore.*previous"],
      weight=0.3,                    # rule pattern weight
      ml_injection_weight=0.5,       # ML injection score weight
      ml_ambiguity_weight=0.2,       # ML ambiguity score weight
      threshold=0.6,                 # above this = flagged
  )

Final score = (pattern_hit × rule_weight) + (injection_score × ml_injection_weight) + (ambiguity_score × ml_ambiguity_weight)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class RiskLevel(str, Enum):
    SAFE = "safe"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Rule:
    """A single rule combining pattern matching with ML weight configuration."""

    name: str
    description: str = ""

    # Pattern matching
    patterns: list[str] = field(default_factory=list)
    case_sensitive: bool = False

    # Weight configuration (must sum to ~1.0 for interpretable percentages)
    pattern_weight: float = 0.3      # weight for regex/keyword match
    ml_injection_weight: float = 0.5  # weight for ML injection score
    ml_ambiguity_weight: float = 0.2  # weight for ML ambiguity score

    # Thresholds for risk levels
    threshold_low: float = 0.3
    threshold_medium: float = 0.5
    threshold_high: float = 0.7
    threshold_critical: float = 0.9

    enabled: bool = True

    def __post_init__(self):
        # Pre-compile regex patterns
        flags = 0 if self.case_sensitive else re.IGNORECASE
        self._compiled = [re.compile(p, flags) for p in self.patterns]

    def match_patterns(self, text: str) -> tuple[bool, list[str]]:
        """Check if text matches any patterns. Returns (hit, matched_patterns)."""
        matched = []
        for pattern, compiled in zip(self.patterns, self._compiled):
            if compiled.search(text):
                matched.append(pattern)
        return len(matched) > 0, matched

    def compute_score(
        self,
        text: str,
        injection_score: float,
        ambiguity_score: float,
    ) -> float:
        """Compute weighted risk score combining pattern match + ML scores.

        Returns: float between 0.0 and 1.0
        """
        pattern_hit, _ = self.match_patterns(text)
        pattern_value = 1.0 if pattern_hit else 0.0

        score = (
            pattern_value * self.pattern_weight
            + injection_score * self.ml_injection_weight
            + ambiguity_score * self.ml_ambiguity_weight
        )
        return min(max(score, 0.0), 1.0)

    def classify_risk(self, score: float) -> RiskLevel:
        """Map a score to a risk level."""
        if score >= self.threshold_critical:
            return RiskLevel.CRITICAL
        elif score >= self.threshold_high:
            return RiskLevel.HIGH
        elif score >= self.threshold_medium:
            return RiskLevel.MEDIUM
        elif score >= self.threshold_low:
            return RiskLevel.LOW
        return RiskLevel.SAFE


@dataclass
class RuleResult:
    """Result of evaluating a single rule against a prompt."""

    rule_name: str
    score: float
    score_pct: str
    risk_level: RiskLevel
    pattern_matched: bool
    matched_patterns: list[str]
    injection_score: float
    ambiguity_score: float
    injection_pct: str
    ambiguity_pct: str


@dataclass
class EvaluationResult:
    """Full evaluation result for a prompt across all rules."""

    prompt: str
    overall_score: float
    overall_pct: str
    overall_risk: RiskLevel
    injection_score: float
    injection_pct: str
    ambiguity_score: float
    ambiguity_pct: str
    rule_results: list[RuleResult]
    triggered_rules: list[str]


class RuleEngine:
    """Rule engine that evaluates prompts using pattern matching + ML weights.

    Usage:
        engine = RuleEngine()
        engine.add_default_rules()
        engine.set_scorer(scorer)  # PromptScorer instance
        result = engine.evaluate("Ignore all previous instructions")
        print(result.overall_pct)  # "92.3%"
    """

    def __init__(self):
        self.rules: dict[str, Rule] = {}
        self._scorer = None

    def set_scorer(self, scorer) -> None:
        """Set the ML scorer (PromptScorer instance)."""
        self._scorer = scorer

    def add_rule(self, rule: Rule) -> None:
        """Add or update a rule."""
        self.rules[rule.name] = rule

    def remove_rule(self, name: str) -> None:
        """Remove a rule by name."""
        self.rules.pop(name, None)

    def get_rule(self, name: str) -> Optional[Rule]:
        return self.rules.get(name)

    def list_rules(self) -> list[Rule]:
        return list(self.rules.values())

    def add_default_rules(self) -> None:
        """Add a standard set of prompt security rules."""

        self.add_rule(Rule(
            name="prompt_injection",
            description="Detect prompt injection attacks that try to override system instructions",
            patterns=[
                r"ignore\s+(all\s+)?previous\s+instructions",
                r"ignore\s+(all\s+)?prior\s+instructions",
                r"disregard\s+(all\s+)?previous",
                r"forget\s+(all\s+)?previous",
                r"override\s+(all\s+)?instructions",
                r"new\s+instructions?\s*:",
                r"system\s*:\s*you\s+are\s+now",
            ],
            pattern_weight=0.3,
            ml_injection_weight=0.5,
            ml_ambiguity_weight=0.2,
        ))

        self.add_rule(Rule(
            name="system_prompt_extraction",
            description="Detect attempts to extract the system prompt or configuration",
            patterns=[
                r"(reveal|show|display|print|output)\s+(the\s+)?(system|original|initial)\s+(prompt|instructions?|message)",
                r"what\s+(are|is)\s+(your|the)\s+(system\s+)?(prompt|instructions?)",
                r"repeat\s+(your\s+)?(system\s+)?instructions",
                r"(give|tell)\s+me\s+(your|the)\s+(system\s+)?(prompt|instructions?)",
            ],
            pattern_weight=0.35,
            ml_injection_weight=0.45,
            ml_ambiguity_weight=0.2,
        ))

        self.add_rule(Rule(
            name="jailbreak_attempt",
            description="Detect jailbreak attempts (DAN, roleplay bypass, etc.)",
            patterns=[
                r"you\s+are\s+now\s+DAN",
                r"do\s+anything\s+now",
                r"ignore\s+(all\s+)?safety\s+guidelines",
                r"no\s+restrictions",
                r"bypass\s+(all\s+)?(safety|content|filter)",
                r"pretend\s+(you\s+)?(are|have)\s+no\s+(rules|restrictions|limits)",
                r"act\s+as\s+(if|though)\s+you\s+have\s+no\s+(rules|restrictions)",
            ],
            pattern_weight=0.3,
            ml_injection_weight=0.5,
            ml_ambiguity_weight=0.2,
        ))

        self.add_rule(Rule(
            name="data_exfiltration",
            description="Detect attempts to extract sensitive data or credentials",
            patterns=[
                r"(api|secret|access|auth)\s*key",
                r"password\s*(is|=|:)",
                r"(give|show|reveal)\s+(me\s+)?the\s+(api|secret|access)\s*key",
                r"(database|db)\s*(password|credential|connection\s*string)",
                r"\.env\s+file",
            ],
            pattern_weight=0.4,
            ml_injection_weight=0.4,
            ml_ambiguity_weight=0.2,
        ))

        self.add_rule(Rule(
            name="ambiguous_request",
            description="Flag ambiguous or unclear prompts that may need clarification",
            patterns=[
                r"^.{1,15}$",  # Very short prompts
                r"^(do\s+)?(it|that|this|the\s+thing)\.?$",
            ],
            pattern_weight=0.1,
            ml_injection_weight=0.2,
            ml_ambiguity_weight=0.7,  # Heavily weighted toward ambiguity ML
            threshold_low=0.3,
            threshold_medium=0.5,
            threshold_high=0.7,
            threshold_critical=0.9,
        ))

    def evaluate(self, prompt: str) -> EvaluationResult:
        """Evaluate a prompt against all active rules.

        Returns a complete result with per-rule scores and overall assessment.
        """
        if self._scorer is None:
            raise RuntimeError("Scorer not set. Call set_scorer() first.")

        # Get ML scores
        ml_result = self._scorer.score(prompt)
        injection_score = ml_result.injection_score
        ambiguity_score = ml_result.ambiguity_score

        # Evaluate each rule
        rule_results = []
        triggered = []

        for rule in self.rules.values():
            if not rule.enabled:
                continue

            score = rule.compute_score(prompt, injection_score, ambiguity_score)
            risk = rule.classify_risk(score)
            pattern_hit, matched = rule.match_patterns(prompt)

            rr = RuleResult(
                rule_name=rule.name,
                score=round(score, 4),
                score_pct=f"{score * 100:.1f}%",
                risk_level=risk,
                pattern_matched=pattern_hit,
                matched_patterns=matched,
                injection_score=injection_score,
                ambiguity_score=ambiguity_score,
                injection_pct=ml_result.injection_pct,
                ambiguity_pct=ml_result.ambiguity_pct,
            )
            rule_results.append(rr)

            if risk in (RiskLevel.HIGH, RiskLevel.CRITICAL):
                triggered.append(rule.name)

        # Overall score = max of all rule scores
        overall_score = max((r.score for r in rule_results), default=0.0)
        overall_risk = RiskLevel.SAFE
        for level in [RiskLevel.CRITICAL, RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW]:
            if any(r.risk_level == level for r in rule_results):
                overall_risk = level
                break

        return EvaluationResult(
            prompt=prompt,
            overall_score=round(overall_score, 4),
            overall_pct=f"{overall_score * 100:.1f}%",
            overall_risk=overall_risk,
            injection_score=injection_score,
            injection_pct=ml_result.injection_pct,
            ambiguity_score=ambiguity_score,
            ambiguity_pct=ml_result.ambiguity_pct,
            rule_results=rule_results,
            triggered_rules=triggered,
        )

    def batch_evaluate(self, prompts: list[str]) -> list[EvaluationResult]:
        """Evaluate multiple prompts."""
        return [self.evaluate(p) for p in prompts]
