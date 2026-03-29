from __future__ import annotations

from pathlib import Path

from src.collectors.base import DataCollector

GDRIVE_FOLDER_ID = "1bujroxJ02ym8SgEmC10IsVnCc8HAwTLH"
ASK_CQ_FILES = ["cq_train.json", "cq_dev.json"]


class AskCQCollector(DataCollector):
    name = "ask_cq"

    def download(self) -> Path:
        import gdown

        print(f"[{self.name}] Downloading AskCQ dataset from Google Drive...")

        # Download the entire folder
        folder_url = f"https://drive.google.com/drive/folders/{GDRIVE_FOLDER_ID}"
        gdown.download_folder(
            url=folder_url,
            output=str(self.output_dir),
            quiet=False,
            use_cookies=False,
        )

        all_files = list(self.output_dir.rglob("*.json"))
        self.write_manifest(all_files)
        print(f"[{self.name}] Downloaded {len(all_files)} files")
        return self.output_dir

    def validate(self) -> bool:
        json_files = list(self.output_dir.rglob("*.json"))
        # Exclude manifest
        data_files = [f for f in json_files if f.name != "manifest.json"]
        return len(data_files) > 0
