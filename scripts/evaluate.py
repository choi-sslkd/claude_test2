#!/usr/bin/env python3
"""Evaluate trained models on test set with detailed metrics."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import click
import numpy as np
import pandas as pd

from config.settings import get_settings
from src.training.metrics import compute_metrics


@click.command()
@click.option("--task", "-t", type=click.Choice(["injection", "ambiguity"]), required=True)
@click.option("--model", "-m", type=click.Choice(["transformer", "classical"]), required=True)
def main(task: str, model: str):
    """Evaluate a trained model on the test split."""
    settings = get_settings()

    # Load test data
    test_path = settings.data_splits_dir / f"{task}_test.parquet"
    if not test_path.exists():
        click.echo(f"Test split not found: {test_path}")
        sys.exit(1)
    test_df = pd.read_parquet(test_path)

    texts = test_df["text"].tolist()
    labels = test_df["label"].tolist()
    if task == "ambiguity":
        labels = [int(l) for l in labels]

    # Load model and predict
    if task == "injection" and model == "transformer":
        from src.models.injection.transformer import InjectionTransformerModel
        m = InjectionTransformerModel()
        m.load()
    elif task == "injection" and model == "classical":
        from src.models.injection.classical import InjectionClassicalModel
        m = InjectionClassicalModel()
        m.load()
    elif task == "ambiguity" and model == "transformer":
        from src.models.ambiguity.transformer import AmbiguityTransformerModel
        m = AmbiguityTransformerModel()
        m.load()
    else:
        from src.models.ambiguity.classical import AmbiguityClassicalModel
        m = AmbiguityClassicalModel()
        m.load()

    probs = m.predict(texts)
    preds = (probs >= 0.5).astype(int)
    metrics = compute_metrics(labels, preds, probs)

    click.echo(f"\n{'='*60}")
    click.echo(f"Evaluation: {task} / {model}")
    click.echo(f"{'='*60}")
    click.echo(f"  Samples: {len(labels)}")
    for k, v in metrics.items():
        click.echo(f"  {k}: {v:.4f}")

    # Per-source breakdown
    click.echo(f"\nPer-source breakdown:")
    for source in test_df["source"].unique():
        mask = test_df["source"] == source
        src_labels = np.array(labels)[mask]
        src_preds = preds[mask]
        src_probs = probs[mask]
        src_metrics = compute_metrics(src_labels, src_preds, src_probs)
        click.echo(f"  [{source}] n={mask.sum()}, F1={src_metrics['f1']:.4f}, AUC={src_metrics.get('auc_roc', 0):.4f}")


if __name__ == "__main__":
    main()
