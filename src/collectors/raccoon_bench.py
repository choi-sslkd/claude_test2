from __future__ import annotations

from pathlib import Path

from src.collectors.base import DataCollector


class RaccoonBenchCollector(DataCollector):
    name = "raccoon_bench"
    repo_url = "https://github.com/M0gician/RaccoonBench.git"

    def download(self) -> Path:
        print(f"[{self.name}] Cloning repository...")
        repo_dir = self.output_dir / "repo"
        self.git_clone_shallow(self.repo_url, repo_dir)

        json_files = list(repo_dir.rglob("*.json"))
        self.write_manifest(json_files)
        print(f"[{self.name}] Downloaded {len(json_files)} JSON files")
        return self.output_dir

    def validate(self) -> bool:
        repo_dir = self.output_dir / "repo"
        data_dir = repo_dir / "Data"
        if not data_dir.exists():
            data_dir = repo_dir / "data"
        return data_dir.exists() and len(list(data_dir.rglob("*.json"))) > 0
