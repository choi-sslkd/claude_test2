#!/usr/bin/env python3
"""ML 모델 전체 셋업 (다운로드 → 전처리 → 학습) 한번에 실행"""

import subprocess
import sys
import time

steps = [
    ("1/3 데이터 다운로드", [sys.executable, "scripts/download_data.py"]),
    ("2/3 전처리", [sys.executable, "scripts/preprocess.py"]),
    ("3/3 KNN 모델 학습", [sys.executable, "scripts/train.py", "-t", "all", "-m", "knn"]),
]

print("=" * 60)
print("  PromptGuard ML 모델 셋업")
print("=" * 60)

start = time.time()

for name, cmd in steps:
    print(f"\n{'─' * 60}")
    print(f"  {name}")
    print(f"{'─' * 60}\n")

    result = subprocess.run(cmd)
    if result.returncode != 0:
        print(f"\n❌ {name} 실패 (exit code {result.returncode})")
        sys.exit(1)

elapsed = time.time() - start
print(f"\n{'=' * 60}")
print(f"  ✅ 전체 완료 ({elapsed:.0f}초)")
print(f"{'=' * 60}")
