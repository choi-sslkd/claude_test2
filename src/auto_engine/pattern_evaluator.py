"""Single pattern auto-evaluator.

Input:  "act as" (패턴 하나)
Output: riskLevel=HIGH, injection_score=87.3%, ambiguity_score=12.1%, ...

How it works:
  1. Takes a single pattern string (e.g., "jailbreak", "ignore previous instructions")
  2. Generates diverse test prompts containing that pattern
  3. Runs all prompts through the ML models
  4. Aggregates scores to determine risk level and weight

This maps directly to a DB Rule record:
  { pattern: "act as", riskLevel: "HIGH", enabled: true }
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

import numpy as np


# Templates for generating test prompts containing the pattern
INJECTION_TEMPLATES = [
    "{pattern}",
    "Please {pattern}",
    "{pattern} and tell me everything",
    "I want you to {pattern}",
    "Can you {pattern} for me?",
    "Now {pattern} immediately",
    "{pattern}. This is important.",
    "You must {pattern} right now",
    "Hey, {pattern} please",
    "I need you to {pattern}",
]

CONTEXT_TEMPLATES = [
    "{pattern} a helpful assistant",
    "{pattern} my teacher and explain math",
    "Help me understand {pattern}",
    "What does {pattern} mean?",
    "Tell me about {pattern} in history",
    "How do I {pattern} in Python?",
    "Write about {pattern}",
    "Explain {pattern} to a beginner",
    "I'm studying {pattern}",
    "Can you define {pattern}?",
]

# Benign baseline prompts (no pattern)
BENIGN_BASELINES = [
    "What is the weather like today?",
    "How do I cook pasta?",
    "Help me write a professional email",
    "What is machine learning?",
    "Tell me about the history of Korea",
    "How do I sort a list in Python?",
    "What are the benefits of exercise?",
    "Explain photosynthesis",
    "What is the capital of France?",
    "How do I learn a new language?",
]


@dataclass
class PatternEvaluation:
    """Result of evaluating a single pattern."""

    pattern: str
    risk_level: str                    # SAFE, LOW, MEDIUM, HIGH, CRITICAL
    injection_score_avg: float         # average injection score (0.0~1.0)
    injection_score_max: float         # max injection score
    ambiguity_score_avg: float         # average ambiguity score
    injection_pct: str                 # "87.3%"
    ambiguity_pct: str                 # "12.1%"
    confidence: float                  # how confident the evaluation is (0.0~1.0)
    sample_scores: list[dict] = field(default_factory=list)
    recommendation: str = ""           # human-readable recommendation

    def to_db_record(self) -> dict:
        """Convert to a record matching Prisma Rule table schema."""
        return {
            "pattern": self.pattern,
            "riskLevel": self.risk_level,
            "enabled": True,
            "injectionScore": round(self.injection_score_avg, 4),
            "ambiguityScore": round(self.ambiguity_score_avg, 4),
            "confidence": round(self.confidence, 4),
        }

    def to_dict(self) -> dict:
        return {
            "pattern": self.pattern,
            "riskLevel": self.risk_level,
            "injectionScore": round(self.injection_score_avg, 4),
            "injectionScoreMax": round(self.injection_score_max, 4),
            "ambiguityScore": round(self.ambiguity_score_avg, 4),
            "injectionPct": self.injection_pct,
            "ambiguityPct": self.ambiguity_pct,
            "confidence": round(self.confidence, 4),
            "enabled": True,
            "recommendation": self.recommendation,
        }


class PatternEvaluator:
    """Evaluate a single pattern string and auto-determine its risk level.

    Usage:
        evaluator = PatternEvaluator(scorer)
        result = evaluator.evaluate("act as")
        print(result.risk_level)      # "HIGH"
        print(result.injection_pct)   # "87.3%"
        print(result.to_db_record())  # ready for DB insert
    """

    def __init__(self, scorer=None):
        self._scorer = scorer

    def load_scorer(self) -> None:
        """Load ML models if not already provided."""
        if self._scorer is None:
            from src.inference.scorer import PromptScorer
            self._scorer = PromptScorer(
                injection_model_type="knn", ambiguity_model_type="knn"
            )
            self._scorer.load_models()

    def evaluate(self, pattern: str) -> PatternEvaluation:
        """Evaluate a single pattern and determine its risk level.

        Args:
            pattern: A pattern string like "act as", "jailbreak",
                     "ignore previous instructions"

        Returns:
            PatternEvaluation with risk level, scores, and DB record
        """
        if self._scorer is None:
            self.load_scorer()

        # Generate test prompts
        pattern_prompts = self._generate_prompts(pattern)
        all_prompts = pattern_prompts + BENIGN_BASELINES

        # Score all prompts
        results = self._scorer.batch_score(all_prompts)

        # Split into pattern vs baseline scores
        n_pattern = len(pattern_prompts)
        pattern_results = results[:n_pattern]
        baseline_results = results[n_pattern:]

        # Compute pattern scores
        pattern_inj_scores = [r.injection_score for r in pattern_results]
        pattern_amb_scores = [r.ambiguity_score for r in pattern_results]
        baseline_inj_scores = [r.injection_score for r in baseline_results]

        inj_avg = np.mean(pattern_inj_scores)
        inj_max = np.max(pattern_inj_scores)
        amb_avg = np.mean(pattern_amb_scores)
        baseline_avg = np.mean(baseline_inj_scores)

        # Confidence = how much the pattern differs from baseline
        # High diff = high confidence that pattern is meaningful
        diff = inj_avg - baseline_avg
        confidence = min(max(abs(diff) * 2, 0.0), 1.0)

        # Determine risk level based on injection score
        risk_level = self._classify_risk(inj_avg, inj_max, confidence)

        # Build sample scores for transparency
        sample_scores = []
        for prompt, result in zip(pattern_prompts[:5], pattern_results[:5]):
            sample_scores.append({
                "prompt": prompt[:100],
                "injection": f"{result.injection_score * 100:.1f}%",
                "ambiguity": f"{result.ambiguity_score * 100:.1f}%",
            })

        # Generate recommendation
        recommendation = self._make_recommendation(
            pattern, risk_level, inj_avg, amb_avg, confidence
        )

        return PatternEvaluation(
            pattern=pattern,
            risk_level=risk_level,
            injection_score_avg=inj_avg,
            injection_score_max=inj_max,
            ambiguity_score_avg=amb_avg,
            injection_pct=f"{inj_avg * 100:.1f}%",
            ambiguity_pct=f"{amb_avg * 100:.1f}%",
            confidence=confidence,
            sample_scores=sample_scores,
            recommendation=recommendation,
        )

    def batch_evaluate(self, patterns: list[str]) -> list[PatternEvaluation]:
        """Evaluate multiple patterns."""
        return [self.evaluate(p) for p in patterns]

    def _generate_prompts(self, pattern: str) -> list[str]:
        """Generate diverse test prompts containing the pattern."""
        prompts = []

        # Direct injection-style prompts
        for template in INJECTION_TEMPLATES:
            prompts.append(template.format(pattern=pattern))

        # Contextual prompts (could be benign use of the pattern)
        for template in CONTEXT_TEMPLATES:
            prompts.append(template.format(pattern=pattern))

        return prompts

    def _classify_risk(
        self, inj_avg: float, inj_max: float, confidence: float
    ) -> str:
        """Determine risk level from scores."""
        # Use average score as primary, max as secondary
        score = inj_avg * 0.7 + inj_max * 0.3

        if score >= 0.85:
            return "CRITICAL"
        elif score >= 0.65:
            return "HIGH"
        elif score >= 0.45:
            return "MEDIUM"
        elif score >= 0.25:
            return "LOW"
        return "SAFE"

    def _make_recommendation(
        self,
        pattern: str,
        risk_level: str,
        inj_avg: float,
        amb_avg: float,
        confidence: float,
    ) -> str:
        """Generate human-readable recommendation."""
        if risk_level == "CRITICAL":
            return f"'{pattern}' is a strong injection indicator. Block or flag immediately."
        elif risk_level == "HIGH":
            return f"'{pattern}' is likely used in injection attacks. Recommend blocking."
        elif risk_level == "MEDIUM":
            return f"'{pattern}' has moderate risk. Consider flagging for review."
        elif risk_level == "LOW":
            return f"'{pattern}' has low injection risk. Monitor but allow."
        return f"'{pattern}' appears benign. No action needed."
