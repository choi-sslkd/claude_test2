FROM python:3.12-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY config/ config/
COPY src/ src/
COPY scripts/ scripts/
COPY pyproject.toml .

# 데이터 + 기존 학습 모델 복사
COPY data/ data/
COPY models/ models/

# 모델이 없으면 학습 실행
RUN if [ ! -d "models/injection/knn" ]; then python scripts/setup_ml.py; fi

EXPOSE 8001

CMD ["python", "scripts/serve.py", "--port", "8001"]
