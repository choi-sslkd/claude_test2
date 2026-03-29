"""Stratified train/val/test splitting and Parquet export."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

from config.settings import get_settings
from src.preprocessing.schema import AmbiguitySample, InjectionSample


def _to_dataframe(samples: list) -> pd.DataFrame:
    return pd.DataFrame([s.model_dump() for s in samples])


def create_splits(
    injection_samples: list[InjectionSample],
    ambiguity_samples: list[AmbiguitySample],
    output_dir: Path | None = None,
) -> dict[str, Path]:
    """Create stratified train/val/test splits and save as Parquet."""
    settings = get_settings()
    output_dir = output_dir or settings.data_splits_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    saved = {}

    for task_name, samples in [
        ("injection", injection_samples),
        ("ambiguity", ambiguity_samples),
    ]:
        if not samples:
            print(f"  [{task_name}] No samples to split")
            continue

        df = _to_dataframe(samples)
        print(f"  [{task_name}] Total: {len(df)} samples")

        # Create stratification key from source + label
        df["_strat"] = df["source"] + "_" + df["label"].astype(str)

        # First split: train vs (val + test)
        val_test_ratio = settings.val_ratio + settings.test_ratio
        train_df, valtest_df = train_test_split(
            df,
            test_size=val_test_ratio,
            stratify=df["_strat"],
            random_state=42,
        )

        # Second split: val vs test
        relative_test = settings.test_ratio / val_test_ratio
        val_df, test_df = train_test_split(
            valtest_df,
            test_size=relative_test,
            stratify=valtest_df["_strat"],
            random_state=42,
        )

        # Drop stratification column and save
        for split_name, split_df in [
            ("train", train_df),
            ("val", val_df),
            ("test", test_df),
        ]:
            split_df = split_df.drop(columns=["_strat"]).reset_index(drop=True)
            fpath = output_dir / f"{task_name}_{split_name}.parquet"
            split_df.to_parquet(fpath, index=False)
            saved[f"{task_name}_{split_name}"] = fpath
            print(f"    {split_name}: {len(split_df)} samples -> {fpath.name}")

    return saved
