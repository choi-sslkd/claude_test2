"""KNN-based ambiguity detector using sentence embeddings.

Score = proportion of K nearest neighbors that are ambiguous.
  "모호함: 42.1%" means 42.1% of the K nearest training examples
  are known ambiguous prompts.
"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import f1_score
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline

from config.settings import get_settings


class AmbiguityKNNModel:
    """KNN-based ambiguity detector with distance-weighted voting."""

    def __init__(self, n_neighbors: int = 15, metric: str = "cosine"):
        settings = get_settings()
        self.n_neighbors = n_neighbors
        self.metric = metric

        self.pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(
                analyzer="word",
                ngram_range=(1, 3),
                max_features=settings.tfidf_max_features,
                sublinear_tf=True,
                strip_accents="unicode",
            )),
            ("knn", KNeighborsClassifier(
                n_neighbors=n_neighbors,
                metric=metric,
                weights="distance",
                algorithm="brute",
                n_jobs=-1,
            )),
        ])

        self._train_texts: list[str] = []
        self._train_labels: list[int] = []

    def train(
        self,
        train_texts: list[str],
        train_labels: list[int],
        val_texts: list[str],
        val_labels: list[int],
    ) -> dict[str, float]:
        print(f"  Training Ambiguity KNN (K={self.n_neighbors}, metric={self.metric})...")

        self._train_texts = train_texts
        self._train_labels = train_labels
        self.pipeline.fit(train_texts, train_labels)

        val_probs = self.predict(val_texts)
        val_preds = (val_probs >= 0.5).astype(int)
        val_f1 = f1_score(val_labels, val_preds, average="binary", zero_division=0)
        val_acc = np.mean(val_preds == np.array(val_labels))

        print(f"  Validation accuracy: {val_acc:.4f}, F1: {val_f1:.4f}")

        self._save()
        return {"val_accuracy": float(val_acc), "val_f1": float(val_f1)}

    def predict(self, texts: list[str]) -> np.ndarray:
        """Return ambiguity probability (0.0~1.0) for each text."""
        return self.pipeline.predict_proba(texts)[:, 1]

    def predict_with_neighbors(self, texts: list[str]) -> list[dict]:
        """Return detailed prediction with neighbor information."""
        tfidf = self.pipeline.named_steps["tfidf"]
        knn = self.pipeline.named_steps["knn"]

        X = tfidf.transform(texts)
        distances, indices = knn.kneighbors(X)
        probs = knn.predict_proba(X)[:, 1]

        results = []
        for i in range(len(texts)):
            neighbors = []
            for j in range(self.n_neighbors):
                idx = indices[i][j]
                neighbors.append({
                    "text": self._train_texts[idx][:200],
                    "label": "ambiguous" if self._train_labels[idx] == 1 else "clear",
                    "distance": round(float(distances[i][j]), 4),
                })
            results.append({
                "ambiguity_score": round(float(probs[i]), 4),
                "ambiguity_pct": f"{probs[i] * 100:.1f}%",
                "k_neighbors": self.n_neighbors,
                "neighbors": neighbors,
            })
        return results

    def _save(self) -> None:
        settings = get_settings()
        save_dir = settings.models_dir / "ambiguity" / "knn"
        save_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.pipeline, save_dir / "pipeline.joblib")
        joblib.dump(
            {"texts": self._train_texts, "labels": self._train_labels},
            save_dir / "train_data.joblib",
        )

    def load(self, path: Path | None = None) -> None:
        settings = get_settings()
        base = path or settings.models_dir / "ambiguity" / "knn"
        self.pipeline = joblib.load(base / "pipeline.joblib")
        train_data = joblib.load(base / "train_data.joblib")
        self._train_texts = train_data["texts"]
        self._train_labels = train_data["labels"]
        self.n_neighbors = self.pipeline.named_steps["knn"].n_neighbors
