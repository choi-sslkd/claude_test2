"""Unified prompt scorer that combines injection and ambiguity models."""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from config.settings import get_settings


@dataclass
class ScoringResult:
    injection_score: float
    ambiguity_score: float
    injection_label: str
    ambiguity_label: str
    model_version: str
    latency_ms: float


class PromptScorer:
    """Load models and score prompts for injection and ambiguity."""

    VERSION = "0.1.0"

    def __init__(
        self,
        injection_model_type: str = "classical",
        ambiguity_model_type: str = "classical",
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
        settings = get_settings()

        # Load injection model
        if self.injection_model_type == "transformer":
            try:
                from src.models.injection.transformer import InjectionTransformerModel
                self._injection_model = InjectionTransformerModel()
                self._injection_model.load()
                print("[scorer] Loaded injection transformer model")
            except Exception as e:
                print(f"[scorer] Transformer load failed ({e}), falling back to classical")
                self._load_injection_classical()
        else:
            self._load_injection_classical()

        # Load ambiguity model
        if self.ambiguity_model_type == "transformer":
            try:
                from src.models.ambiguity.transformer import AmbiguityTransformerModel
                self._ambiguity_model = AmbiguityTransformerModel()
                self._ambiguity_model.load()
                print("[scorer] Loaded ambiguity transformer model")
            except Exception as e:
                print(f"[scorer] Transformer load failed ({e}), falling back to classical")
                self._load_ambiguity_classical()
        else:
            self._load_ambiguity_classical()

    def _load_injection_classical(self) -> None:
        from src.models.injection.classical import InjectionClassicalModel
        self._injection_model = InjectionClassicalModel()
        self._injection_model.load()
        self.injection_model_type = "classical"
        print("[scorer] Loaded injection classical model")

    def _load_ambiguity_classical(self) -> None:
        from src.models.ambiguity.classical import AmbiguityClassicalModel
        self._ambiguity_model = AmbiguityClassicalModel()
        self._ambiguity_model.load()
        self.ambiguity_model_type = "classical"
        print("[scorer] Loaded ambiguity classical model")

    @property
    def is_loaded(self) -> bool:
        return self._injection_model is not None and self._ambiguity_model is not None

    def score(self, prompt: str) -> ScoringResult:
        """Score a single prompt."""
        results = self.batch_score([prompt])
        return results[0]

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
                model_version=self.VERSION,
                latency_ms=round(per_item_ms, 2),
            ))

        return results
