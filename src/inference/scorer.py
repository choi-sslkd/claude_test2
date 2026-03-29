"""Unified prompt scorer that combines injection and ambiguity models."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from config.settings import get_settings


@dataclass
class ScoringResult:
    injection_score: float
    ambiguity_score: float
    injection_label: str
    ambiguity_label: str
    injection_pct: str
    ambiguity_pct: str
    model_version: str
    latency_ms: float


@dataclass
class DetailedScoringResult(ScoringResult):
    """Scoring result with KNN neighbor details for interpretability."""
    injection_neighbors: list[dict] = field(default_factory=list)
    ambiguity_neighbors: list[dict] = field(default_factory=list)


class PromptScorer:
    """Load models and score prompts for injection and ambiguity.

    Supports 3 model types: transformer, classical, knn.
    KNN mode provides interpretable percentage scores based on
    neighbor label distribution.
    """

    VERSION = "0.2.0"

    def __init__(
        self,
        injection_model_type: str = "knn",
        ambiguity_model_type: str = "knn",
        injection_threshold: float = 0.5,
        ambiguity_threshold: float = 0.5,
    ):
        self.injection_model_type = injection_model_type
        self.ambiguity_model_type = ambiguity_model_type
        self.injection_threshold = injection_threshold
        self.ambiguity_threshold = ambiguity_threshold
        self._injection_model = None
        self._ambiguity_model = None

    def load_models(self) -> None:
        """Load both scoring models."""
        self._injection_model = self._load_model("injection", self.injection_model_type)
        self._ambiguity_model = self._load_model("ambiguity", self.ambiguity_model_type)

    def _load_model(self, task: str, model_type: str):
        """Load a specific model with fallback chain: requested -> knn -> classical."""
        loaders = {
            ("injection", "transformer"): self._load_injection_transformer,
            ("injection", "knn"): self._load_injection_knn,
            ("injection", "classical"): self._load_injection_classical,
            ("ambiguity", "transformer"): self._load_ambiguity_transformer,
            ("ambiguity", "knn"): self._load_ambiguity_knn,
            ("ambiguity", "classical"): self._load_ambiguity_classical,
        }

        # Try requested model type, then fallback chain
        fallback_order = [model_type, "knn", "classical"]
        for mt in fallback_order:
            loader = loaders.get((task, mt))
            if loader is None:
                continue
            try:
                model = loader()
                if mt != model_type:
                    print(f"[scorer] {task}: fell back from {model_type} to {mt}")
                    if task == "injection":
                        self.injection_model_type = mt
                    else:
                        self.ambiguity_model_type = mt
                return model
            except Exception as e:
                print(f"[scorer] {task}/{mt} load failed: {e}")
                continue

        raise RuntimeError(f"No model available for {task}")

    def _load_injection_transformer(self):
        from src.models.injection.transformer import InjectionTransformerModel
        m = InjectionTransformerModel()
        m.load()
        print("[scorer] Loaded injection transformer model")
        return m

    def _load_injection_knn(self):
        from src.models.injection.knn import InjectionKNNModel
        m = InjectionKNNModel()
        m.load()
        print("[scorer] Loaded injection KNN model")
        return m

    def _load_injection_classical(self):
        from src.models.injection.classical import InjectionClassicalModel
        m = InjectionClassicalModel()
        m.load()
        print("[scorer] Loaded injection classical model")
        return m

    def _load_ambiguity_transformer(self):
        from src.models.ambiguity.transformer import AmbiguityTransformerModel
        m = AmbiguityTransformerModel()
        m.load()
        print("[scorer] Loaded ambiguity transformer model")
        return m

    def _load_ambiguity_knn(self):
        from src.models.ambiguity.knn import AmbiguityKNNModel
        m = AmbiguityKNNModel()
        m.load()
        print("[scorer] Loaded ambiguity KNN model")
        return m

    def _load_ambiguity_classical(self):
        from src.models.ambiguity.classical import AmbiguityClassicalModel
        m = AmbiguityClassicalModel()
        m.load()
        print("[scorer] Loaded ambiguity classical model")
        return m

    @property
    def is_loaded(self) -> bool:
        return self._injection_model is not None and self._ambiguity_model is not None

    def score(self, prompt: str) -> ScoringResult:
        """Score a single prompt."""
        return self.batch_score([prompt])[0]

    def batch_score(self, prompts: list[str]) -> list[ScoringResult]:
        """Score multiple prompts."""
        if not self.is_loaded:
            raise RuntimeError("Models not loaded. Call load_models() first.")

        start = time.perf_counter()

        injection_probs = self._injection_model.predict(prompts)
        ambiguity_probs = self._ambiguity_model.predict(prompts)

        elapsed_ms = (time.perf_counter() - start) * 1000
        per_item_ms = elapsed_ms / len(prompts)

        results = []
        for inj_score, amb_score in zip(injection_probs, ambiguity_probs):
            inj_score = float(inj_score)
            amb_score = float(amb_score)
            results.append(ScoringResult(
                injection_score=round(inj_score, 4),
                ambiguity_score=round(amb_score, 4),
                injection_label="injection" if inj_score >= self.injection_threshold else "benign",
                ambiguity_label="ambiguous" if amb_score >= self.ambiguity_threshold else "clear",
                injection_pct=f"{inj_score * 100:.1f}%",
                ambiguity_pct=f"{amb_score * 100:.1f}%",
                model_version=self.VERSION,
                latency_ms=round(per_item_ms, 2),
            ))

        return results

    def score_detailed(self, prompt: str) -> DetailedScoringResult:
        """Score with KNN neighbor details for interpretability.

        Returns the same scores plus the K nearest neighbors from
        training data, showing WHY the model gave this score.
        """
        if not self.is_loaded:
            raise RuntimeError("Models not loaded. Call load_models() first.")

        start = time.perf_counter()

        # Get detailed predictions if KNN, otherwise just probs
        inj_neighbors = []
        amb_neighbors = []

        if hasattr(self._injection_model, "predict_with_neighbors"):
            inj_detail = self._injection_model.predict_with_neighbors([prompt])[0]
            inj_score = inj_detail["injection_score"]
            inj_neighbors = inj_detail["neighbors"]
        else:
            inj_score = float(self._injection_model.predict([prompt])[0])

        if hasattr(self._ambiguity_model, "predict_with_neighbors"):
            amb_detail = self._ambiguity_model.predict_with_neighbors([prompt])[0]
            amb_score = amb_detail["ambiguity_score"]
            amb_neighbors = amb_detail["neighbors"]
        else:
            amb_score = float(self._ambiguity_model.predict([prompt])[0])

        elapsed_ms = (time.perf_counter() - start) * 1000

        return DetailedScoringResult(
            injection_score=round(inj_score, 4),
            ambiguity_score=round(amb_score, 4),
            injection_label="injection" if inj_score >= self.injection_threshold else "benign",
            ambiguity_label="ambiguous" if amb_score >= self.ambiguity_threshold else "clear",
            injection_pct=f"{inj_score * 100:.1f}%",
            ambiguity_pct=f"{amb_score * 100:.1f}%",
            model_version=self.VERSION,
            latency_ms=round(elapsed_ms, 2),
            injection_neighbors=inj_neighbors,
            ambiguity_neighbors=amb_neighbors,
        )
