FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libmagic-dev \
    poppler-utils \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Force CPU versions of PyTorch to prevent massive 2.5GB CUDA layers that time out Railway free tier builder
RUN pip install --no-cache-dir --no-deps \
    --trusted-host download.pytorch.org --trusted-host download-r2.pytorch.org \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir \
    --trusted-host pypi.org --trusted-host files.pythonhosted.org \
    --trusted-host download.pytorch.org --trusted-host download-r2.pytorch.org \
    -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

COPY . .

# Railway dynamically routes traffic to the $PORT environment variable
ENV PORT=8000
ENV PYTHONPATH=/app
EXPOSE $PORT

# MUST bind to 0.0.0.0
CMD ["sh", "-c", "cd /app && python -m uvicorn ai_engine.main:app --host 0.0.0.0 --port $PORT"]
