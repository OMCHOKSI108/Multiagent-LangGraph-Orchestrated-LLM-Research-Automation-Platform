# Multi-Agent LLM Research Automation Platform
# Root Dockerfile — monolithic build for single-container deployment

FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV NODE_ENV=production

# Install system dependencies including Node.js 20
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    postgresql-client \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# --- Python dependencies ---
COPY ai_engine/requirements.txt ai_engine/
RUN pip install --no-cache-dir -r ai_engine/requirements.txt

# --- Node.js dependencies ---
COPY backend/package*.json backend/
RUN cd backend && npm ci --only=production

COPY frontend/package*.json frontend/
RUN cd frontend && npm ci

# --- Copy source code ---
COPY . .

# --- Build frontend ---
RUN cd frontend && npm run build

# --- Create data directories ---
RUN mkdir -p data/cache data/uploads logs

# Make startup script executable
RUN chmod +x scripts/run_all.sh

# Expose ports
EXPOSE 3000 5000 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start all services
CMD ["bash", "scripts/run_all.sh"]