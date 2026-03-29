"""Auto dataset loader - detects format and labels automatically.

Supports:
  - CSV  (.csv)   : text column + optional label column
  - JSON (.json)  : list of objects or {"data": [...]}
  - JSONL (.jsonl) : one JSON object per line

Auto-detects:
  - Text column: text, prompt, input, question, query, content, message, sentence
  - Label column: label, class, category, is_injection, is_ambiguous, target, tag
  - Label type: injection (0/1) or ambiguity (0.0/1.0) based on values
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Optional

import pandas as pd


# Column name candidates (priority order)
TEXT_COLUMNS = [
    "text", "prompt", "input", "question", "query",
    "content", "message", "sentence", "utterance", "user_input",
]
LABEL_COLUMNS = [
    "label", "class", "category", "is_injection", "is_ambiguous",
    "target", "tag", "classification", "type", "is_attack",
    "require_clarification", "ambiguous", "injection",
]


class AutoDatasetLoader:
    """Load any dataset and auto-detect text/label columns."""

    def __init__(self, file_path: str | Path):
        self.file_path = Path(file_path)
        self.df: Optional[pd.DataFrame] = None
        self.text_col: Optional[str] = None
        self.label_col: Optional[str] = None
        self.task_type: Optional[str] = None  # "injection" or "ambiguity" or "both"

    def load(self) -> pd.DataFrame:
        """Load file and auto-detect columns."""
        ext = self.file_path.suffix.lower()

        if ext == ".csv":
            self.df = self._load_csv()
        elif ext == ".json":
            self.df = self._load_json()
        elif ext == ".jsonl":
            self.df = self._load_jsonl()
        elif ext == ".parquet":
            self.df = pd.read_parquet(self.file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}. Use .csv, .json, .jsonl, or .parquet")

        self._detect_columns()
        self._detect_task_type()
        self._normalize_labels()

        print(f"[loader] Loaded {len(self.df)} samples from {self.file_path.name}")
        print(f"[loader] Text column: '{self.text_col}'")
        print(f"[loader] Label column: '{self.label_col}'")
        print(f"[loader] Task type: {self.task_type}")
        print(f"[loader] Label distribution: {dict(self.df['_label'].value_counts())}")

        return self.df

    def _load_csv(self) -> pd.DataFrame:
        return pd.read_csv(self.file_path, encoding="utf-8")

    def _load_json(self) -> pd.DataFrame:
        data = json.loads(self.file_path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return pd.DataFrame(data)
        elif isinstance(data, dict):
            # Try common wrapper keys
            for key in ["data", "samples", "examples", "records", "items"]:
                if key in data and isinstance(data[key], list):
                    return pd.DataFrame(data[key])
            # If dict of lists, treat as columnar format
            return pd.DataFrame(data)
        raise ValueError("JSON must be a list of objects or {data: [...]}")

    def _load_jsonl(self) -> pd.DataFrame:
        records = []
        for line in self.file_path.read_text(encoding="utf-8").strip().splitlines():
            if not line.strip():
                continue
            parsed = json.loads(line)
            if isinstance(parsed, str):
                parsed = json.loads(parsed)
            records.append(parsed)
        return pd.DataFrame(records)

    def _detect_columns(self) -> None:
        """Auto-detect text and label columns."""
        cols = [c.lower().strip() for c in self.df.columns]
        col_map = {c.lower().strip(): c for c in self.df.columns}

        # Find text column
        for candidate in TEXT_COLUMNS:
            if candidate in cols:
                self.text_col = col_map[candidate]
                break

        if self.text_col is None:
            # Fallback: first string column with avg length > 10
            for col in self.df.columns:
                if self.df[col].dtype == object:
                    avg_len = self.df[col].astype(str).str.len().mean()
                    if avg_len > 10:
                        self.text_col = col
                        break

        if self.text_col is None:
            raise ValueError(
                f"Cannot detect text column. Columns found: {list(self.df.columns)}. "
                f"Expected one of: {TEXT_COLUMNS}"
            )

        # Find label column
        for candidate in LABEL_COLUMNS:
            if candidate in cols:
                self.label_col = col_map[candidate]
                break

        if self.label_col is None:
            raise ValueError(
                f"Cannot detect label column. Columns found: {list(self.df.columns)}. "
                f"Expected one of: {LABEL_COLUMNS}"
            )

    def _detect_task_type(self) -> None:
        """Detect if dataset is for injection, ambiguity, or both."""
        unique_labels = set(self.df[self.label_col].dropna().unique())
        str_labels = {str(l).lower().strip() for l in unique_labels}

        # Check for injection-specific labels
        injection_keywords = {
            "injection", "attack", "malicious", "jailbreak",
            "benign", "safe", "normal", "legitimate",
        }
        ambiguity_keywords = {
            "ambiguous", "clear", "unclear", "vague",
            "clarification", "specific",
        }

        has_injection = bool(str_labels & injection_keywords)
        has_ambiguity = bool(str_labels & ambiguity_keywords)

        if has_injection and has_ambiguity:
            self.task_type = "both"
        elif has_injection:
            self.task_type = "injection"
        elif has_ambiguity:
            self.task_type = "ambiguity"
        else:
            # Fallback: binary labels (0/1, true/false) → default injection
            if str_labels <= {"0", "1", "true", "false", "0.0", "1.0"}:
                col_name_lower = self.label_col.lower()
                if any(k in col_name_lower for k in ["ambig", "clarif", "unclear", "vague"]):
                    self.task_type = "ambiguity"
                else:
                    self.task_type = "injection"
            else:
                self.task_type = "injection"  # default

    def _normalize_labels(self) -> None:
        """Convert labels to binary int (0/1) as _label column."""
        raw = self.df[self.label_col]

        def to_binary(val):
            s = str(val).lower().strip()
            if s in ("1", "1.0", "true", "yes",
                     "injection", "attack", "malicious", "jailbreak",
                     "ambiguous", "unclear", "vague", "clarification"):
                return 1
            elif s in ("0", "0.0", "false", "no",
                       "benign", "safe", "normal", "legitimate",
                       "clear", "specific", "unambiguous"):
                return 0
            else:
                return None

        self.df["_label"] = raw.apply(to_binary)
        # Drop rows with unknown labels
        before = len(self.df)
        self.df = self.df.dropna(subset=["_label"])
        self.df["_label"] = self.df["_label"].astype(int)
        dropped = before - len(self.df)
        if dropped > 0:
            print(f"[loader] Warning: dropped {dropped} rows with unrecognized labels")

    def get_texts_and_labels(self) -> tuple[list[str], list[int]]:
        """Return (texts, labels) ready for training."""
        texts = self.df[self.text_col].astype(str).tolist()
        labels = self.df["_label"].tolist()
        return texts, labels
