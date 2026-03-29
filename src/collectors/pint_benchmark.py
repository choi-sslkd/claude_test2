from __future__ import annotations

from pathlib import Path

from src.collectors.base import DataCollector


class PintBenchmarkCollector(DataCollector):
    name = "pint_benchmark"
    repo_url = "https://github.com/lakeraai/pint-benchmark.git"

    def download(self) -> Path:
        print(f"[{self.name}] Cloning repository...")
        repo_dir = self.output_dir / "repo"
        self.git_clone_shallow(self.repo_url, repo_dir)

        yaml_files = list(repo_dir.rglob("*.yaml")) + list(repo_dir.rglob("*.yml"))
        self.write_manifest(yaml_files)
        print(f"[{self.name}] Downloaded {len(yaml_files)} YAML files")
        return self.output_dir

    def validate(self) -> bool:
        repo_dir = self.output_dir / "repo"
        data_dir = repo_dir / "benchmark" / "data"
        if not data_dir.exists():
            # Try alternative structure
            yaml_files = list(repo_dir.rglob("*.yaml"))
            return len(yaml_files) > 0
        return True
