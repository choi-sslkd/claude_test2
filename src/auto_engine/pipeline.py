"""One-shot auto pipeline: dataset in → trained rule engine out.

Usage:
    pipeline = AutoPipeline()
    engine = pipeline.run("my_dataset.csv")
    result = engine.evaluate("some prompt")
    print(result.overall_pct)  # "87.3%"
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from sklearn.model_selection import train_test_split

from config.settings import get_settings
from src.auto_engine.loader import AutoDatasetLoader
from src.auto_engine.optimizer import WeightOptimizer
from src.inference.scorer import PromptScorer
from src.rule_engine.rules import Rule, RuleEngine, RiskLevel
from src.training.metrics import compute_metrics


class AutoPipeline:
    """Complete auto pipeline: load dataset → train → optimize → rule engine.

    Just provide a dataset file and get a fully configured rule engine.
    """

    def __init__(self, use_existing_models: bool = True):
        """
        Args:
            use_existing_models: If True, use pre-trained KNN models as base
                                 and train additional model on new data.
                                 If False, train from scratch on new data only.
        """
        self.use_existing_models = use_existing_models
        self.scorer: PromptScorer | None = None
        self.engine: RuleEngine | None = None
        self.report: dict = {}

    def run(self, dataset_path: str | Path) -> RuleEngine:
        """Run the complete pipeline on a dataset file.

        Args:
            dataset_path: Path to CSV, JSON, JSONL, or Parquet file

        Returns:
            Configured RuleEngine ready to evaluate prompts
        """
        dataset_path = Path(dataset_path)
        print(f"\n{'='*60}")
        print(f"AutoPipeline: {dataset_path.name}")
        print(f"{'='*60}")

        # Step 1: Load dataset
        print("\n[Step 1/5] Loading dataset...")
        loader = AutoDatasetLoader(dataset_path)
        loader.load()
        texts, labels = loader.get_texts_and_labels()
        task_type = loader.task_type

        # Step 2: Split data
        print("\n[Step 2/5] Splitting data (80/20)...")
        train_texts, test_texts, train_labels, test_labels = train_test_split(
            texts, labels, test_size=0.2, stratify=labels, random_state=42
        )
        print(f"  Train: {len(train_texts)}, Test: {len(test_texts)}")

        # Step 3: Train KNN model on new data
        print(f"\n[Step 3/5] Training KNN model (task={task_type})...")
        if task_type in ("injection", "both"):
            self._train_injection_knn(train_texts, train_labels, test_texts, test_labels)
        if task_type in ("ambiguity", "both"):
            self._train_ambiguity_knn(train_texts, train_labels, test_texts, test_labels)

        # Step 4: Load scorer (with new models)
        print("\n[Step 4/5] Loading scorer and optimizing weights...")
        self.scorer = PromptScorer(injection_model_type="knn", ambiguity_model_type="knn")
        self.scorer.load_models()

        # Get ML scores for test data
        injection_scores = self.scorer._injection_model.predict(test_texts)
        ambiguity_scores = self.scorer._ambiguity_model.predict(test_texts)

        # Auto-detect useful patterns from the data
        patterns = self._extract_common_patterns(train_texts, train_labels)
        print(f"  Auto-detected {len(patterns)} patterns from data")

        # Optimize weights
        optimizer = WeightOptimizer(weight_steps=11, threshold_steps=20)
        optimal = optimizer.optimize(
            texts=test_texts,
            labels=test_labels,
            injection_scores=injection_scores,
            ambiguity_scores=ambiguity_scores,
            patterns=patterns,
        )

        # Step 5: Build rule engine with optimized weights
        print(f"\n[Step 5/5] Building rule engine...")
        self.engine = RuleEngine()
        self.engine.set_scorer(self.scorer)

        # Create optimized rule from the dataset
        optimized_rule = Rule(
            name=f"auto_{dataset_path.stem}",
            description=f"Auto-generated rule from {dataset_path.name}",
            patterns=patterns,
            pattern_weight=optimal.pattern_weight,
            ml_injection_weight=optimal.ml_injection_weight,
            ml_ambiguity_weight=optimal.ml_ambiguity_weight,
            threshold_low=optimal.best_threshold * 0.5,
            threshold_medium=optimal.best_threshold * 0.75,
            threshold_high=optimal.best_threshold,
            threshold_critical=min(optimal.best_threshold * 1.2, 0.95),
        )
        self.engine.add_rule(optimized_rule)

        # Also add default rules (with optimized weights applied)
        self.engine.add_default_rules()
        # Override default rule weights with optimized values
        for rule in self.engine.rules.values():
            if rule.name != f"auto_{dataset_path.stem}":
                rule.pattern_weight = optimal.pattern_weight
                rule.ml_injection_weight = optimal.ml_injection_weight
                rule.ml_ambiguity_weight = optimal.ml_ambiguity_weight

        # Generate report
        self.report = self._generate_report(
            dataset_path, loader, optimal, test_texts, test_labels,
            injection_scores, ambiguity_scores
        )
        self._print_report()

        return self.engine

    def _train_injection_knn(
        self, train_texts, train_labels, test_texts, test_labels
    ) -> None:
        from src.models.injection.knn import InjectionKNNModel
        model = InjectionKNNModel(n_neighbors=min(15, len(train_texts) // 3))
        model.train(train_texts, train_labels, test_texts, test_labels)

    def _train_ambiguity_knn(
        self, train_texts, train_labels, test_texts, test_labels
    ) -> None:
        from src.models.ambiguity.knn import AmbiguityKNNModel
        model = AmbiguityKNNModel(n_neighbors=min(15, len(train_texts) // 3))
        model.train(train_texts, train_labels, test_texts, test_labels)

    def _extract_common_patterns(
        self, texts: list[str], labels: list[int]
    ) -> list[str]:
        """Extract common keyword patterns from positive (label=1) samples."""
        import re
        from collections import Counter

        positive_texts = [t.lower() for t, l in zip(texts, labels) if l == 1]
        negative_texts = [t.lower() for t, l in zip(texts, labels) if l == 0]

        if not positive_texts:
            return []

        # Extract n-grams (2-3 words) from positive texts
        def get_ngrams(text, n):
            words = re.findall(r'\b\w+\b', text)
            return [" ".join(words[i:i+n]) for i in range(len(words) - n + 1)]

        pos_ngrams = Counter()
        neg_ngrams = Counter()

        for t in positive_texts:
            for n in [2, 3]:
                pos_ngrams.update(get_ngrams(t, n))
        for t in negative_texts:
            for n in [2, 3]:
                neg_ngrams.update(get_ngrams(t, n))

        # Find ngrams that appear much more in positive than negative
        patterns = []
        for ngram, count in pos_ngrams.most_common(100):
            if count < 3:
                continue
            neg_count = neg_ngrams.get(ngram, 0)
            # At least 5x more frequent in positive
            if count > neg_count * 5:
                # Convert to regex pattern
                pattern = r"\b" + re.escape(ngram) + r"\b"
                patterns.append(pattern)
                if len(patterns) >= 10:
                    break

        return patterns if patterns else [r"placeholder_no_patterns_found"]

    def _generate_report(
        self, dataset_path, loader, optimal, test_texts, test_labels,
        injection_scores, ambiguity_scores
    ) -> dict:
        """Generate evaluation report."""
        # Evaluate with optimized threshold
        combined = (
            injection_scores * optimal.ml_injection_weight
            + ambiguity_scores * optimal.ml_ambiguity_weight
        )
        preds = (combined >= optimal.best_threshold).astype(int)
        metrics = compute_metrics(test_labels, preds, combined)

        return {
            "dataset": dataset_path.name,
            "total_samples": len(loader.df),
            "task_type": loader.task_type,
            "text_column": loader.text_col,
            "label_column": loader.label_col,
            "label_distribution": dict(loader.df["_label"].value_counts()),
            "optimized_weights": {
                "pattern_weight": optimal.pattern_weight,
                "ml_injection_weight": optimal.ml_injection_weight,
                "ml_ambiguity_weight": optimal.ml_ambiguity_weight,
                "threshold": optimal.best_threshold,
            },
            "test_metrics": {k: round(v, 4) for k, v in metrics.items()},
        }

    def _print_report(self) -> None:
        """Print evaluation report."""
        r = self.report
        print(f"\n{'='*60}")
        print(f"  AUTO PIPELINE REPORT")
        print(f"{'='*60}")
        print(f"  Dataset       : {r['dataset']}")
        print(f"  Samples       : {r['total_samples']}")
        print(f"  Task type     : {r['task_type']}")
        print(f"  Text column   : {r['text_column']}")
        print(f"  Label column  : {r['label_column']}")
        print(f"  Distribution  : {r['label_distribution']}")
        print(f"")
        print(f"  Optimized Weights:")
        w = r["optimized_weights"]
        print(f"    Pattern     : {w['pattern_weight']}")
        print(f"    Injection   : {w['ml_injection_weight']}")
        print(f"    Ambiguity   : {w['ml_ambiguity_weight']}")
        print(f"    Threshold   : {w['threshold']}")
        print(f"")
        print(f"  Test Metrics:")
        for k, v in r["test_metrics"].items():
            print(f"    {k:<12} : {v}")
        print(f"{'='*60}")

    def save_report(self, path: str | Path) -> None:
        """Save report to JSON file."""
        path = Path(path)
        path.write_text(json.dumps(self.report, indent=2, default=str), encoding="utf-8")
        print(f"Report saved to {path}")
