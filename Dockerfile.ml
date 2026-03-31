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

# models/ is mounted as volume or copied in
# If no models exist, they must be trained first

EXPOSE 8001

CMD ["python", "scripts/serve.py", "--port", "8001"]
