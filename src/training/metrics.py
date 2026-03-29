"""Evaluation metrics for classification models."""

from __future__ import annotations

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    auc,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)


def compute_metrics(
    y_true: list[int] | np.ndarray,
    y_pred: list[int] | np.ndarray,
    y_prob: np.ndarray | None = None,
) -> dict[str, float]:
    """Compute standard binary classification metrics."""
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    metrics = {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1": f1_score(y_true, y_pred, average="binary", zero_division=0),
    }

    if y_prob is not None:
        try:
            metrics["auc_roc"] = roc_auc_score(y_true, y_prob)
        except ValueError:
            metrics["auc_roc"] = 0.0

        prec_vals, rec_vals, _ = precision_recall_curve(y_true, y_prob)
        metrics["auc_pr"] = auc(rec_vals, prec_vals)

        # Expected Calibration Error (10 bins)
        metrics["ece"] = _expected_calibration_error(y_true, y_prob, n_bins=10)

    return metrics


def _expected_calibration_error(
    y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10
) -> float:
    """Compute Expected Calibration Error."""
    bin_boundaries = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    total = len(y_true)

    for i in range(n_bins):
        mask = (y_prob > bin_boundaries[i]) & (y_prob <= bin_boundaries[i + 1])
        if i == 0:
            mask = (y_prob >= bin_boundaries[i]) & (y_prob <= bin_boundaries[i + 1])

        bin_size = mask.sum()
        if bin_size == 0:
            continue

        bin_acc = y_true[mask].mean()
        bin_conf = y_prob[mask].mean()
        ece += (bin_size / total) * abs(bin_acc - bin_conf)

    return ece


def compute_class_weights(labels: list[int] | np.ndarray) -> list[float]:
    """Compute class weights inversely proportional to class frequencies."""
    labels = np.array(labels)
    n_samples = len(labels)
    n_classes = len(np.unique(labels))
    weights = []
    for c in sorted(np.unique(labels)):
        count = (labels == c).sum()
        w = n_samples / (n_classes * count)
        weights.append(float(w))
    return weights
