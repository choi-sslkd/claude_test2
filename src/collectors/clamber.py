from __future__ import annotations

from pathlib import Path

from src.collectors.base import DataCollector


class ClamberCollector(DataCollector):
    name = "clamber"
    repo_url = "https://github.com/zt991211/CLAMBER.git"

    def download(self) -> Path:
        print(f"[{self.name}] Cloning repository...")
        repo_dir = self.output_dir / "repo"
        self.git_clone_shallow(self.repo_url, repo_dir)

        data_files = list(repo_dir.rglob("*.jsonl")) + list(repo_dir.rglob("*.json"))
        self.write_manifest(data_files)
        print(f"[{self.name}] Downloaded {len(data_files)} data files")
        return self.output_dir

    def validate(self) -> bool:
        repo_dir = self.output_dir / "repo"
        jsonl_files = list(repo_dir.rglob("*.jsonl"))
        return len(jsonl_files) > 0
