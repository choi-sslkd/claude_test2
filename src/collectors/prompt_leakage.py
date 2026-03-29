from __future__ import annotations

from pathlib import Path

from src.collectors.base import DataCollector


class PromptLeakageCollector(DataCollector):
    name = "prompt_leakage"
    repo_url = "https://github.com/salesforce/prompt-leakage.git"

    def download(self) -> Path:
        print(f"[{self.name}] Cloning repository...")
        repo_dir = self.output_dir / "repo"
        self.git_clone_shallow(self.repo_url, repo_dir)

        csv_files = list(repo_dir.rglob("*.csv"))
        json_files = list(repo_dir.rglob("*.json"))
        all_data = csv_files + json_files
        self.write_manifest(all_data)
        print(f"[{self.name}] Downloaded {len(all_data)} data files")
        return self.output_dir

    def validate(self) -> bool:
        repo_dir = self.output_dir / "repo"
        data_dir = repo_dir / "data"
        if not data_dir.exists():
            return len(list(repo_dir.rglob("*.csv"))) > 0
        return True
