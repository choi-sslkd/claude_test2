#!/usr/bin/env python3
"""Preprocess all downloaded datasets into unified format and create splits."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import click

from src.preprocessing.normalizers import normalize_all_ambiguity, normalize_all_injection
from src.preprocessing.splitter import create_splits


@click.command()
@click.option("--task", "-t", type=click.Choice(["all", "injection", "ambiguity"]), default="all")
def main(task: str):
    """Normalize raw data and create train/val/test splits."""
    injection_samples = []
    ambiguity_samples = []

    if task in ("all", "injection"):
        injection_samples = normalize_all_injection()

    if task in ("all", "ambiguity"):
        ambiguity_samples = normalize_all_ambiguity()

    click.echo(f"\nCreating splits...")
    splits = create_splits(injection_samples, ambiguity_samples)

    click.echo(f"\nSaved splits:")
    for name, path in splits.items():
        click.echo(f"  {name}: {path}")

    click.echo("\nDone!")


if __name__ == "__main__":
    main()
