# Multi-Agent LLM Research Automation Platform
# Root Dockerfile for complete application

FROM python:3.9-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV NODE_ENV=production

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    nodejs \
    npm \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.ai/install.sh | sh

# Set work directory
WORKDIR /app

# Copy Python requirements first for better caching
COPY ai_engine/requirements.txt ai_engine/
RUN pip install --no-cache-dir -r ai_engine/requirements.txt

# Copy Node.js dependencies
COPY backend/package*.json backend/
RUN cd backend && npm ci --only=production

COPY frontend/package*.json frontend/
RUN cd frontend && npm ci --only=production

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Create necessary directories
RUN mkdir -p data/cache data/uploads logs

# Expose ports
EXPOSE 3000 5000 8000 11434

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start all services
CMD ["./scripts/run_all.sh"]