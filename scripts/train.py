#!/usr/bin/env python3
"""Train ML/DL models for prompt injection and ambiguity detection."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import click

from src.training.trainer import (
    train_ambiguity_classical,
    train_ambiguity_knn,
    train_ambiguity_transformer,
    train_injection_classical,
    train_injection_knn,
    train_injection_transformer,
)


TRAIN_FUNCS = {
    ("injection", "transformer"): train_injection_transformer,
    ("injection", "classical"): train_injection_classical,
    ("injection", "knn"): train_injection_knn,
    ("ambiguity", "transformer"): train_ambiguity_transformer,
    ("ambiguity", "classical"): train_ambiguity_classical,
    ("ambiguity", "knn"): train_ambiguity_knn,
}


@click.command()
@click.option(
    "--task",
    "-t",
    type=click.Choice(["injection", "ambiguity", "all"]),
    required=True,
    help="Which task to train",
)
@click.option(
    "--model",
    "-m",
    type=click.Choice(["transformer", "classical", "knn", "all"]),
    required=True,
    help="Which model type to train",
)
def main(task: str, model: str):
    """Train models for prompt scoring."""
    tasks = ["injection", "ambiguity"] if task == "all" else [task]
    models = ["transformer", "classical", "knn"] if model == "all" else [model]

    results = {}
    for t in tasks:
        for m in models:
            key = f"{t}_{m}"
            click.echo(f"\n{'='*60}")
            click.echo(f"Training: {key}")
            click.echo(f"{'='*60}")

            train_fn = TRAIN_FUNCS[(t, m)]
            result = train_fn()
            results[key] = result

    # Save results summary
    from config.settings import get_settings
    settings = get_settings()
    summary_path = settings.models_dir / "training_results.json"
    settings.models_dir.mkdir(parents=True, exist_ok=True)

    def _convert(obj):
        import numpy as np
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return obj

    serializable = {}
    for k, v in results.items():
        serializable[k] = json.loads(json.dumps(v, default=_convert))

    summary_path.write_text(json.dumps(serializable, indent=2), encoding="utf-8")
    click.echo(f"\nResults saved to {summary_path}")


if __name__ == "__main__":
    main()
