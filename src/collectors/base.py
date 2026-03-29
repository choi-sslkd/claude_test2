from __future__ import annotations

import hashlib
import json
import subprocess
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path

from config.settings import get_settings


class DataCollector(ABC):
    """Base class for all dataset collectors."""

    name: str = ""
    repo_url: str = ""

    def __init__(self, output_dir: Path | None = None):
        settings = get_settings()
        self.output_dir = output_dir or settings.data_raw_dir / self.name
        self.output_dir.mkdir(parents=True, exist_ok=True)

    @abstractmethod
    def download(self) -> Path:
        """Download raw data. Returns path to downloaded directory."""
        ...

    @abstractmethod
    def validate(self) -> bool:
        """Validate downloaded data integrity."""
        ...

    def git_clone_shallow(self, repo_url: str, target_dir: Path) -> Path:
        """Shallow clone a git repository."""
        if (target_dir / ".git").exists():
            print(f"  [skip] {target_dir} already cloned")
            return target_dir
        target_dir.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            ["git", "clone", "--depth", "1", repo_url, str(target_dir)],
            check=True,
            capture_output=True,
            text=True,
        )
        return target_dir

    def write_manifest(self, files: list[Path]) -> None:
        """Write a manifest.json with file checksums and timestamps."""
        entries = []
        for f in files:
            if f.is_file():
                sha256 = hashlib.sha256(f.read_bytes()).hexdigest()
                entries.append({
                    "path": str(f.relative_to(self.output_dir)),
                    "size_bytes": f.stat().st_size,
                    "sha256": sha256,
                })
        manifest = {
            "dataset": self.name,
            "downloaded_at": datetime.now(timezone.utc).isoformat(),
            "files": entries,
        }
        (self.output_dir / "manifest.json").write_text(
            json.dumps(manifest, indent=2), encoding="utf-8"
        )
