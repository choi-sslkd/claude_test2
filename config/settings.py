from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Paths
    project_root: Path = Path(__file__).resolve().parent.parent
    data_raw_dir: Path = Path(__file__).resolve().parent.parent / "data" / "raw"
    data_processed_dir: Path = Path(__file__).resolve().parent.parent / "data" / "processed"
    data_splits_dir: Path = Path(__file__).resolve().parent.parent / "data" / "splits"
    models_dir: Path = Path(__file__).resolve().parent.parent / "models"

    # Model
    transformer_model_name: str = "microsoft/deberta-v3-base"
    max_length_injection: int = 512
    max_length_ambiguity: int = 256

    # Training
    learning_rate: float = 2e-5
    weight_decay: float = 0.01
    num_epochs: int = 5
    batch_size: int = 16
    gradient_accumulation_steps: int = 2
    warmup_ratio: float = 0.1
    early_stopping_patience: int = 2

    # Classical model
    tfidf_max_features: int = 50000

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Data split ratios
    train_ratio: float = 0.8
    val_ratio: float = 0.1
    test_ratio: float = 0.1

    model_config = {"env_prefix": "PG_", "env_file": ".env"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
