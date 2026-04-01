"""Per-dataset normalization into unified InjectionSample / AmbiguitySample."""

from __future__ import annotations

import csv
import json
import uuid
from pathlib import Path
from typing import Iterator

import yaml

from config.settings import get_settings
from src.preprocessing.schema import AmbiguitySample, InjectionSample


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _uid(source: str, idx: int) -> str:
    return f"{source}_{idx:06d}"


# ---------------------------------------------------------------------------
# INJECTION normalizers
# ---------------------------------------------------------------------------

def normalize_tensor_trust(raw_dir: Path | None = None) -> list[InjectionSample]:
    """Normalize tensor-trust-data benchmarks."""
    settings = get_settings()
    raw_dir = raw_dir or settings.data_raw_dir / "tensor_trust" / "repo"
    samples: list[InjectionSample] = []
    idx = 0

    # Process hijacking and extraction benchmarks
    for benchmark_type in ["hijacking-robustness", "extraction-robustness"]:
        bench_dir = raw_dir / "benchmarks" / benchmark_type
        if not bench_dir.exists():
            continue
        for jsonl_file in bench_dir.rglob("*.jsonl"):
            for line in jsonl_file.read_text(encoding="utf-8").strip().splitlines():
                if not line.strip():
                    continue
                rec = json.loads(line)
                # Attack text as injection sample
                attack = rec.get("attack", rec.get("prompt", ""))
                if attack:
                    samples.append(InjectionSample(
                        id=_uid("tensor_trust", idx),
                        text=attack.strip(),
                        label=1,
                        source="tensor_trust",
                        category=benchmark_type.split("-")[0],
                    ))
                    idx += 1
                # Access code / benign text as negative sample
                benign = rec.get("access_code", rec.get("pre_prompt", ""))
                if benign and len(benign.strip()) > 5:
                    samples.append(InjectionSample(
                        id=_uid("tensor_trust", idx),
                        text=benign.strip(),
                        label=0,
                        source="tensor_trust",
                        category="benign",
                    ))
                    idx += 1

    # Also check raw-data directories
    for version_dir in (raw_dir / "raw-data").iterdir() if (raw_dir / "raw-data").exists() else []:
        for jsonl_file in version_dir.rglob("*.jsonl"):
            for line in jsonl_file.read_text(encoding="utf-8").strip().splitlines():
                if not line.strip():
                    continue
                rec = json.loads(line)
                attack = rec.get("attack", rec.get("attacker_input", ""))
                if attack and len(attack.strip()) > 3:
                    samples.append(InjectionSample(
                        id=_uid("tensor_trust", idx),
                        text=attack.strip(),
                        label=1,
                        source="tensor_trust",
                        category="raw_attack",
                    ))
                    idx += 1

    print(f"  [tensor_trust] Normalized {len(samples)} samples")
    return samples


def normalize_pint_benchmark(raw_dir: Path | None = None) -> list[InjectionSample]:
    """Normalize pint-benchmark YAML data."""
    settings = get_settings()
    raw_dir = raw_dir or settings.data_raw_dir / "pint_benchmark" / "repo"
    samples: list[InjectionSample] = []
    idx = 0

    yaml_files = list(raw_dir.rglob("*.yaml")) + list(raw_dir.rglob("*.yml"))
    for yf in yaml_files:
        try:
            data = yaml.safe_load(yf.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(data, list):
            continue
        for rec in data:
            text = rec.get("text", "")
            label_raw = rec.get("label", False)
            category = rec.get("category", "unknown")
            if not text:
                continue
            label = 1 if label_raw else 0
            samples.append(InjectionSample(
                id=_uid("pint", idx),
                text=text.strip(),
                label=label,
                source="pint_benchmark",
                category=category,
            ))
            idx += 1

    print(f"  [pint_benchmark] Normalized {len(samples)} samples")
    return samples


def normalize_prompt_leakage(raw_dir: Path | None = None) -> list[InjectionSample]:
    """Normalize prompt-leakage CSV data."""
    settings = get_settings()
    raw_dir = raw_dir or settings.data_raw_dir / "prompt_leakage" / "repo"
    samples: list[InjectionSample] = []
    idx = 0

    csv_files = list(raw_dir.rglob("*.csv"))
    for cf in csv_files:
        try:
            with open(cf, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Try to find text and label columns adaptively
                    text = (
                        row.get("prompt", "")
                        or row.get("text", "")
                        or row.get("input", "")
                        or row.get("attack", "")
                        or row.get("user_input", "")
                    )
                    if not text or len(text.strip()) < 3:
                        continue

                    # Determine label
                    label_val = (
                        row.get("label", "")
                        or row.get("is_attack", "")
                        or row.get("leaked", "")
                    )
                    if str(label_val).lower() in ("1", "true", "yes", "attack", "leaked"):
                        label = 1
                    elif str(label_val).lower() in ("0", "false", "no", "benign", "safe"):
                        label = 0
                    else:
                        # If from safetyfinetuning, treat as injection example
                        if "finetune" in cf.name.lower():
                            label = 1
                        else:
                            label = 1  # Default: leakage attempts

                    # Determine domain from path
                    domain = None
                    for d in ["news", "legal", "finance", "medical"]:
                        if d in str(cf).lower():
                            domain = d
                            break

                    samples.append(InjectionSample(
                        id=_uid("leakage", idx),
                        text=text.strip(),
                        label=label,
                        source="prompt_leakage",
                        category="leakage",
                        domain=domain,
                    ))
                    idx += 1
        except Exception as e:
            print(f"  [prompt_leakage] Warning: Error reading {cf}: {e}")

    print(f"  [prompt_leakage] Normalized {len(samples)} samples")
    return samples


def normalize_raccoon_bench(raw_dir: Path | None = None) -> list[InjectionSample]:
    """Normalize RaccoonBench attack/defense JSON data."""
    settings = get_settings()
    raw_dir = raw_dir or settings.data_raw_dir / "raccoon_bench" / "repo"
    samples: list[InjectionSample] = []
    idx = 0

    # Find the Data directory (case-sensitive)
    data_dir = raw_dir / "Data"
    if not data_dir.exists():
        data_dir = raw_dir / "data"

    if not data_dir.exists():
        print(f"  [raccoon_bench] Data directory not found at {data_dir}")
        return samples

    # Process attack files as injection samples (label=1)
    # Attacks are plain text files (no extension) in subdirectories
    attacks_dir = data_dir / "attacks"
    if attacks_dir.exists():
        for attack_file in attacks_dir.rglob("*"):
            if not attack_file.is_file():
                continue
            # Skip JSON files, process plain text prompt files
            try:
                text = attack_file.read_text(encoding="utf-8").strip()
                if text and len(text) > 3 and not text.startswith("{"):
                    attack_type = attack_file.parent.name
                    samples.append(InjectionSample(
                        id=_uid("raccoon", idx),
                        text=text,
                        label=1,
                        source="raccoon_bench",
                        category=f"extraction_{attack_type}",
                    ))
                    idx += 1
            except Exception:
                pass

    # Process defense prompts as benign (label=0)
    # Defense templates and reference prompts are JSON dicts
    for json_file in data_dir.rglob("*.json"):
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                for key, val in data.items():
                    if isinstance(val, str) and len(val.strip()) > 10:
                        samples.append(InjectionSample(
                            id=_uid("raccoon", idx),
                            text=val.strip()[:1000],  # truncate very long prompts
                            label=0,
                            source="raccoon_bench",
                            category="defense",
                        ))
                        idx += 1
                    elif isinstance(val, dict):
                        # reference file: nested dict with defense categories
                        for subkey, subval in val.items():
                            if isinstance(subval, str) and len(subval.strip()) > 10:
                                samples.append(InjectionSample(
                                    id=_uid("raccoon", idx),
                                    text=subval.strip()[:1000],
                                    label=0,
                                    source="raccoon_bench",
                                    category="defense",
                                ))
                                idx += 1
        except Exception:
            pass

    print(f"  [raccoon_bench] Normalized {len(samples)} samples")
    return samples


# ---------------------------------------------------------------------------
# AMBIGUITY normalizers
# ---------------------------------------------------------------------------

def normalize_ambig_qa(raw_dir: Path | None = None) -> list[AmbiguitySample]:
    """Normalize AmbigQA JSON data."""
    settings = get_settings()
    raw_dir = raw_dir or settings.data_raw_dir / "ambig_qa"
    samples: list[AmbiguitySample] = []
    idx = 0

    for json_file in ["train_light.json", "dev_light.json"]:
        fpath = raw_dir / json_file
        if not fpath.exists():
            print(f"  [ambig_qa] Warning: {fpath} not found")
            continue
        data = json.loads(fpath.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            continue
        for rec in data:
            question = rec.get("question", "")
            if not question:
                continue
            annotations = rec.get("annotations", [])

            # Determine ambiguity from annotation types
            has_multiple = any(
                a.get("type") == "multipleQAs" for a in annotations
            )
            label = 1.0 if has_multiple else 0.0

            samples.append(AmbiguitySample(
                id=_uid("ambigqa", idx),
                text=question.strip(),
                label=label,
                source="ambig_qa",
                category="multipleQAs" if has_multiple else "singleAnswer",
            ))
            idx += 1

    print(f"  [ambig_qa] Normalized {len(samples)} samples")
    return samples


def normalize_ask_cq(raw_dir: Path | None = None) -> list[AmbiguitySample]:
    """Normalize AskCQ JSON data."""
    settings = get_settings()
    raw_dir = raw_dir or settings.data_raw_dir / "ask_cq"
    samples: list[AmbiguitySample] = []
    idx = 0

    json_files = list(raw_dir.rglob("cq_*.json"))
    for jf in json_files:
        try:
            data = json.loads(jf.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(data, list):
            continue
        for rec in data:
            question = rec.get("question", "")
            if not question:
                continue
            cq = rec.get("clarification_question", "")
            samples.append(AmbiguitySample(
                id=_uid("askcq", idx),
                text=question.strip(),
                label=1.0,  # All AskCQ questions are ambiguous
                source="ask_cq",
                category="clarification_needed",
                clarification=cq if cq else None,
            ))
            idx += 1

    print(f"  [ask_cq] Normalized {len(samples)} samples")
    return samples


def normalize_clamber(raw_dir: Path | None = None) -> list[AmbiguitySample]:
    """Normalize CLAMBER JSONL data."""
    settings = get_settings()
    raw_dir = raw_dir or settings.data_raw_dir / "clamber" / "repo"
    samples: list[AmbiguitySample] = []
    idx = 0

    jsonl_files = list(raw_dir.rglob("*.jsonl"))
    for jf in jsonl_files:
        for line in jf.read_text(encoding="utf-8").strip().splitlines():
            if not line.strip():
                continue
            parsed = json.loads(line)
            # Handle double-encoded JSON (string inside JSON)
            if isinstance(parsed, str):
                parsed = json.loads(parsed)
            rec = parsed
            question = rec.get("question", "")
            if not question:
                continue

            require_clar = rec.get("require_clarification", 0)
            label = 1.0 if require_clar else 0.0
            category = rec.get("subclass", rec.get("category", None))
            cq = rec.get("clarifying_question", None)

            samples.append(AmbiguitySample(
                id=_uid("clamber", idx),
                text=question.strip(),
                label=label,
                source="clamber",
                category=category,
                clarification=cq,
            ))
            idx += 1

    print(f"  [clamber] Normalized {len(samples)} samples")
    return samples


# ---------------------------------------------------------------------------
# Aggregate functions
# ---------------------------------------------------------------------------

def _add_benign_prompts() -> list[InjectionSample]:
    """Add curated benign prompts for balanced training."""
    from src.preprocessing.benign_samples import BENIGN_PROMPTS

    samples = []
    for idx, text in enumerate(BENIGN_PROMPTS):
        samples.append(InjectionSample(
            id=_uid("benign_curated", idx),
            text=text,
            label=0,
            source="benign_curated",
            category="normal_query",
        ))
    print(f"  [benign_curated] Added {len(samples)} benign samples")
    return samples


def _add_korean_injection_samples() -> list[InjectionSample]:
    """Add Korean injection training samples."""
    try:
        from src.preprocessing.korean_injection_samples import KOREAN_INJECTION_SAMPLES
    except ImportError:
        from preprocessing.korean_injection_samples import KOREAN_INJECTION_SAMPLES

    samples = [
        InjectionSample(
            id=f"korean_injection_{i}",
            text=text,
            label=1,  # injection
            source="korean_curated",
            category="korean_injection",
        )
        for i, text in enumerate(KOREAN_INJECTION_SAMPLES)
    ]
    print(f"  [korean_injection] Added {len(samples)} samples")
    return samples


def normalize_all_injection() -> list[InjectionSample]:
    """Run all injection normalizers and combine."""
    print("Normalizing injection datasets...")
    samples = []
    samples.extend(normalize_tensor_trust())
    samples.extend(normalize_pint_benchmark())
    samples.extend(normalize_prompt_leakage())
    samples.extend(normalize_raccoon_bench())
    samples.extend(_add_benign_prompts())
    samples.extend(_add_korean_injection_samples())
    print(f"Total injection samples: {len(samples)}")
    return samples


def normalize_all_ambiguity() -> list[AmbiguitySample]:
    """Run all ambiguity normalizers and combine."""
    print("Normalizing ambiguity datasets...")
    samples = []
    samples.extend(normalize_ambig_qa())
    samples.extend(normalize_ask_cq())
    samples.extend(normalize_clamber())
    print(f"Total ambiguity samples: {len(samples)}")
    return samples
