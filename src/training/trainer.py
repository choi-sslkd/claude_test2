"""Training orchestrator for all model variants."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from config.settings import get_settings
from src.training.metrics import compute_class_weights, compute_metrics


def load_split(task: str, split: str) -> pd.DataFrame:
    """Load a Parquet split file."""
    settings = get_settings()
    fpath = settings.data_splits_dir / f"{task}_{split}.parquet"
    return pd.read_parquet(fpath)


def train_injection_transformer() -> dict:
    """Train DeBERTa injection detector."""
    from src.models.injection.transformer import InjectionTransformerModel

    print("\n=== Training Injection Transformer ===")
    train_df = load_split("injection", "train")
    val_df = load_split("injection", "val")

    weights = compute_class_weights(train_df["label"].tolist())
    print(f"  Class weights: {weights}")

    model = InjectionTransformerModel()
    model.build()
    history = model.train(
        train_texts=train_df["text"].tolist(),
        train_labels=train_df["label"].tolist(),
        val_texts=val_df["text"].tolist(),
        val_labels=val_df["label"].tolist(),
        class_weights=weights,
    )

    # Final evaluation on test set
    test_df = load_split("injection", "test")
    probs = model.predict(test_df["text"].tolist())
    preds = (probs >= 0.5).astype(int)
    test_metrics = compute_metrics(test_df["label"].tolist(), preds, probs)
    print(f"  Test metrics: {test_metrics}")

    return {"history": history, "test_metrics": test_metrics}


def train_injection_classical() -> dict:
    """Train TF-IDF + LR injection detector."""
    from src.models.injection.classical import InjectionClassicalModel

    print("\n=== Training Injection Classical ===")
    train_df = load_split("injection", "train")
    val_df = load_split("injection", "val")

    model = InjectionClassicalModel()
    result = model.train(
        train_texts=train_df["text"].tolist(),
        train_labels=train_df["label"].tolist(),
        val_texts=val_df["text"].tolist(),
        val_labels=val_df["label"].tolist(),
    )

    # Final evaluation on test set
    test_df = load_split("injection", "test")
    probs = model.predict(test_df["text"].tolist())
    preds = (probs >= 0.5).astype(int)
    test_metrics = compute_metrics(test_df["label"].tolist(), preds, probs)
    print(f"  Test metrics: {test_metrics}")

    return {"train_result": result, "test_metrics": test_metrics}


def train_ambiguity_transformer() -> dict:
    """Train DeBERTa ambiguity detector."""
    from src.models.ambiguity.transformer import AmbiguityTransformerModel

    print("\n=== Training Ambiguity Transformer ===")
    train_df = load_split("ambiguity", "train")
    val_df = load_split("ambiguity", "val")

    # Convert float labels to int for classification
    train_labels = [int(l) for l in train_df["label"].tolist()]
    val_labels = [int(l) for l in val_df["label"].tolist()]

    weights = compute_class_weights(train_labels)
    print(f"  Class weights: {weights}")

    model = AmbiguityTransformerModel()
    model.build()
    history = model.train(
        train_texts=train_df["text"].tolist(),
        train_labels=train_labels,
        val_texts=val_df["text"].tolist(),
        val_labels=val_labels,
        class_weights=weights,
    )

    test_df = load_split("ambiguity", "test")
    test_labels = [int(l) for l in test_df["label"].tolist()]
    probs = model.predict(test_df["text"].tolist())
    preds = (probs >= 0.5).astype(int)
    test_metrics = compute_metrics(test_labels, preds, probs)
    print(f"  Test metrics: {test_metrics}")

    return {"history": history, "test_metrics": test_metrics}


def train_ambiguity_classical() -> dict:
    """Train TF-IDF + LR ambiguity detector."""
    from src.models.ambiguity.classical import AmbiguityClassicalModel

    print("\n=== Training Ambiguity Classical ===")
    train_df = load_split("ambiguity", "train")
    val_df = load_split("ambiguity", "val")

    train_labels = [int(l) for l in train_df["label"].tolist()]
    val_labels = [int(l) for l in val_df["label"].tolist()]

    model = AmbiguityClassicalModel()
    result = model.train(
        train_texts=train_df["text"].tolist(),
        train_labels=train_labels,
        val_texts=val_df["text"].tolist(),
        val_labels=val_labels,
    )

    test_df = load_split("ambiguity", "test")
    test_labels = [int(l) for l in test_df["label"].tolist()]
    probs = model.predict(test_df["text"].tolist())
    preds = (probs >= 0.5).astype(int)
    test_metrics = compute_metrics(test_labels, preds, probs)
    print(f"  Test metrics: {test_metrics}")

    return {"train_result": result, "test_metrics": test_metrics}
