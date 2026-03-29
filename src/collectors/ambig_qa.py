from __future__ import annotations

from pathlib import Path

import requests
from tqdm import tqdm

from src.collectors.base import DataCollector

AMBIGQA_BASE = "https://nlp.cs.washington.edu/ambigqa/data"
AMBIGQA_FILES = [
    "train_light.json",
    "dev_light.json",
]


class AmbigQACollector(DataCollector):
    name = "ambig_qa"

    def download(self) -> Path:
        print(f"[{self.name}] Downloading AmbigQA dataset...")
        downloaded = []
        for fname in AMBIGQA_FILES:
            url = f"{AMBIGQA_BASE}/{fname}"
            dest = self.output_dir / fname
            if dest.exists():
                print(f"  [skip] {fname} already exists")
                downloaded.append(dest)
                continue
            print(f"  Downloading {fname}...")
            resp = requests.get(url, stream=True, timeout=300)
            resp.raise_for_status()
            total = int(resp.headers.get("content-length", 0))
            with open(dest, "wb") as f:
                with tqdm(total=total, unit="B", unit_scale=True, desc=fname) as pbar:
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)
                        pbar.update(len(chunk))
            downloaded.append(dest)

        self.write_manifest(downloaded)
        print(f"[{self.name}] Downloaded {len(downloaded)} files")
        return self.output_dir

    def validate(self) -> bool:
        for fname in AMBIGQA_FILES:
            if not (self.output_dir / fname).exists():
                return False
        return True
