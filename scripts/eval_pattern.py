#!/usr/bin/env python3
"""Evaluate a single pattern and auto-determine its risk level.

Usage:
    python scripts/eval_pattern.py "act as"
    python scripts/eval_pattern.py "jailbreak"
    python scripts/eval_pattern.py "ignore previous instructions"
    python scripts/eval_pattern.py "act as" "jailbreak" "you are now" "pretend you are"
"""

import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import click

from src.auto_engine.pattern_evaluator import PatternEvaluator


@click.command()
@click.argument("patterns", nargs=-1, required=True)
@click.option("--json-output", is_flag=True, help="Output as JSON (for DB import)")
def main(patterns: tuple[str], json_output: bool):
    """Evaluate pattern(s) and auto-determine risk level + weights.

    PATTERNS: one or more pattern strings to evaluate
    """
    evaluator = PatternEvaluator()
    evaluator.load_scorer()

    results = []
    for pattern in patterns:
        result = evaluator.evaluate(pattern)
        results.append(result)

        if not json_output:
            print(f"\n{'='*60}")
            print(f"  Pattern: \"{pattern}\"")
            print(f"{'='*60}")
            print(f"  Risk Level    : {result.risk_level}")
            print(f"  Injection Avg : {result.injection_pct}")
            print(f"  Injection Max : {result.injection_score_max * 100:.1f}%")
            print(f"  Ambiguity Avg : {result.ambiguity_pct}")
            print(f"  Confidence    : {result.confidence * 100:.1f}%")
            print(f"  Recommendation: {result.recommendation}")
            print(f"")
            print(f"  Sample Scores:")
            for s in result.sample_scores:
                print(f"    [{s['injection']:>7} inj | {s['ambiguity']:>7} amb] {s['prompt'][:50]}")
            print(f"")
            print(f"  DB Record:")
            db = result.to_db_record()
            for k, v in db.items():
                print(f"    {k}: {v}")

    if json_output:
        db_records = [r.to_db_record() for r in results]
        print(json.dumps(db_records, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
