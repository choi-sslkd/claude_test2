#!/usr/bin/env python3
"""Download all datasets for prompt injection and ambiguity scoring."""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import click

from src.collectors import ALL_COLLECTORS


@click.command()
@click.option("--dataset", "-d", default=None, help="Download specific dataset only")
@click.option("--skip-validate", is_flag=True, help="Skip validation after download")
def main(dataset: str | None, skip_validate: bool):
    """Download all raw datasets."""
    collectors = ALL_COLLECTORS

    if dataset:
        collectors = [c for c in collectors if c.name == dataset]
        if not collectors:
            click.echo(f"Unknown dataset: {dataset}")
            click.echo(f"Available: {[c.name for c in ALL_COLLECTORS]}")
            sys.exit(1)

    for CollectorClass in collectors:
        collector = CollectorClass()
        click.echo(f"\n{'='*60}")
        click.echo(f"Downloading: {collector.name}")
        click.echo(f"{'='*60}")

        try:
            collector.download()
            if not skip_validate:
                if collector.validate():
                    click.echo(f"  [OK] {collector.name} validated successfully")
                else:
                    click.echo(f"  [WARN] {collector.name} validation failed")
        except Exception as e:
            click.echo(f"  [ERROR] {collector.name}: {e}")

    click.echo("\nDone!")


if __name__ == "__main__":
    main()
