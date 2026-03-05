# ─────────────────────────────────────────────────────────────────────────────
# Backend Dockerfile — FastAPI (Python 3.11 slim)
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

# System deps needed for asyncpg + native SSL certs
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make sure Python finds the correct SSL cert bundle (fixes macOS-like cert issues in containers)
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
