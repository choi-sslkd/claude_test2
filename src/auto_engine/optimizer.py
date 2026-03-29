"""Auto weight optimizer - finds best rule weights using grid search.

Given a trained model and labeled dataset, finds the optimal combination of:
  - pattern_weight
  - ml_injection_weight
  - ml_ambiguity_weight

that maximizes F1 score on the provided data.
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass

import numpy as np
from sklearn.metrics import f1_score

from src.rule_engine.rules import Rule, RuleEngine


@dataclass
class OptimizedWeights:
    """Result of weight optimization."""
    pattern_weight: float
    ml_injection_weight: float
    ml_ambiguity_weight: float
    best_threshold: float
    best_f1: float
    best_accuracy: float
    search_results: list[dict]


class WeightOptimizer:
    """Find optimal weights for combining pattern matching + ML scores.

    Uses grid search over weight combinations and threshold values
    to maximize F1 score on the provided labeled data.
    """

    def __init__(
        self,
        weight_steps: int = 11,  # 0.0, 0.1, 0.2, ..., 1.0
        threshold_steps: int = 20,  # 0.05, 0.10, ..., 1.0
    ):
        self.weight_steps = weight_steps
        self.threshold_steps = threshold_steps

    def optimize(
        self,
        texts: list[str],
        labels: list[int],
        injection_scores: np.ndarray,
        ambiguity_scores: np.ndarray,
        patterns: list[str],
    ) -> OptimizedWeights:
        """Find optimal weights via grid search.

        Args:
            texts: input texts
            labels: ground truth (0 or 1)
            injection_scores: ML injection scores (0.0~1.0)
            ambiguity_scores: ML ambiguity scores (0.0~1.0)
            patterns: regex patterns to test against texts

        Returns:
            OptimizedWeights with best configuration
        """
        import re

        labels = np.array(labels)

        # Pre-compute pattern matches for all texts
        compiled = [re.compile(p, re.IGNORECASE) for p in patterns]
        pattern_hits = np.array([
            1.0 if any(c.search(t) for c in compiled) else 0.0
            for t in texts
        ])

        # Generate weight combinations (must sum to ~1.0)
        step = 1.0 / (self.weight_steps - 1)
        weight_values = [round(i * step, 2) for i in range(self.weight_steps)]

        # All (pw, iw, aw) combinations where pw + iw + aw ≈ 1.0
        weight_combos = []
        for pw in weight_values:
            for iw in weight_values:
                aw = round(1.0 - pw - iw, 2)
                if 0.0 <= aw <= 1.0:
                    weight_combos.append((pw, iw, aw))

        # Threshold values
        thresholds = [round((i + 1) / self.threshold_steps, 3) for i in range(self.threshold_steps)]

        best_f1 = -1.0
        best_config = None
        all_results = []

        print(f"  Searching {len(weight_combos)} weight combos x {len(thresholds)} thresholds...")

        for pw, iw, aw in weight_combos:
            # Compute combined scores for all texts
            combined = pattern_hits * pw + injection_scores * iw + ambiguity_scores * aw
            combined = np.clip(combined, 0.0, 1.0)

            for threshold in thresholds:
                preds = (combined >= threshold).astype(int)
                f1 = f1_score(labels, preds, average="binary", zero_division=0)
                acc = np.mean(preds == labels)

                if f1 > best_f1:
                    best_f1 = f1
                    best_config = {
                        "pattern_weight": pw,
                        "ml_injection_weight": iw,
                        "ml_ambiguity_weight": aw,
                        "threshold": threshold,
                        "f1": f1,
                        "accuracy": acc,
                    }

        # Collect top 10 results for reporting
        # Re-run for top configs (simplified - just return best)
        all_results.append(best_config)

        print(f"  Best F1: {best_config['f1']:.4f}")
        print(f"  Best weights: pattern={best_config['pattern_weight']}, "
              f"injection={best_config['ml_injection_weight']}, "
              f"ambiguity={best_config['ml_ambiguity_weight']}")
        print(f"  Best threshold: {best_config['threshold']}")

        return OptimizedWeights(
            pattern_weight=best_config["pattern_weight"],
            ml_injection_weight=best_config["ml_injection_weight"],
            ml_ambiguity_weight=best_config["ml_ambiguity_weight"],
            best_threshold=best_config["threshold"],
            best_f1=best_config["f1"],
            best_accuracy=best_config["accuracy"],
            search_results=all_results,
        )
