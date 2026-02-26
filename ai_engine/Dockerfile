FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Force CPU versions of PyTorch to prevent massive 2.5GB CUDA layers that time out Railway free tier builder
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

COPY . .

# Railway dynamically routes traffic to the $PORT environment variable
ENV PORT=8000
EXPOSE $PORT

# MUST bind to 0.0.0.0
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
