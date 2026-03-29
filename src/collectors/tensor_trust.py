from __future__ import annotations

from pathlib import Path

from src.collectors.base import DataCollector


class TensorTrustCollector(DataCollector):
    name = "tensor_trust"
    repo_url = "https://github.com/HumanCompatibleAI/tensor-trust-data.git"

    def download(self) -> Path:
        print(f"[{self.name}] Cloning repository...")
        repo_dir = self.output_dir / "repo"
        self.git_clone_shallow(self.repo_url, repo_dir)

        key_files = list(repo_dir.rglob("*.jsonl")) + list(repo_dir.rglob("*.json"))
        self.write_manifest(key_files)
        print(f"[{self.name}] Downloaded {len(key_files)} data files")
        return self.output_dir

    def validate(self) -> bool:
        repo_dir = self.output_dir / "repo"
        benchmarks = repo_dir / "benchmarks"
        if not benchmarks.exists():
            return False
        jsonl_files = list(benchmarks.rglob("*.jsonl"))
        return len(jsonl_files) > 0
