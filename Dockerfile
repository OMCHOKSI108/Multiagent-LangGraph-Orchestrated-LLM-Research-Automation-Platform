# Multi-Agent Research Platform - All-in-One Dockerfile
# Optimized for macOS and cross-platform deployment

FROM python:3.12-slim-bookworm

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    NODE_ENV=production \
    PYTHONPATH=/app/ai_engine \
    DEBIAN_FRONTEND=noninteractive \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    postgresql-client \
    nginx \
    chromium \
    # Fonts for PDF generation
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-freefont-ttf \
    libxss1 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set work directory
WORKDIR /app

# Install Python dependencies (CPU-only for macOS compatibility)
COPY ai_engine/requirements.txt ai_engine/

# Install core dependencies first with timeout and retry
RUN pip install --no-cache-dir --timeout 60 --retries 3 \
    torch==2.4.0+cpu --index-url https://download.pytorch.org/whl/cpu

# Install essential packages only (skip heavy ML libraries for initial build)
RUN pip install --no-cache-dir --timeout 60 --retries 3 \
    "fastapi>=0.110" \
    "uvicorn[standard]>=0.27" \
    "pydantic>=2.5" \
    "python-dotenv>=1.0" \
    "requests>=2.31" \
    "beautifulsoup4>=4.12" \
    duckduckgo-search \
    "langchain>=0.2" \
    langchain-core \
    langchain-community \
    langchain-google-genai \
    langchain-groq \
    langchain-huggingface \
    langchain-ollama \
    ollama \
    sentence-transformers \
    transformers \
    scikit-learn

# Install Node.js dependencies
COPY backend/package*.json backend/
RUN cd backend && npm install --production --silent

COPY frontend/package*.json frontend/
RUN cd frontend && npm install --include=dev --silent --force

# Copy source code
COPY ai_engine/ ai_engine/
COPY backend/ backend/
COPY frontend/ frontend/

# Build frontend
RUN cd frontend && \
    npm cache clean --force && \
    rm -rf node_modules && \
    npm install --include=dev --force && \
    npm run build

# Create necessary directories
RUN mkdir -p data/cache data/uploads logs output

# Create nginx configuration file
RUN cat > /etc/nginx/sites-available/default <<'EOF'
server {
    listen 3000;
    root /app/frontend/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Create startup script
RUN cat > /app/start.sh <<'EOF'
#!/bin/bash
set -e

echo "Starting Multi-Agent Research Platform..."
mkdir -p /app/data/cache /app/data/uploads /app/logs /app/output

echo "Starting AI Engine..."
cd /app/ai_engine
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
AI_ENGINE_PID=$!

echo "Starting Backend..."
cd /app/backend
npm start &
BACKEND_PID=$!

echo "Starting Frontend..."
nginx &
NGINX_PID=$!

sleep 5

echo "Platform ready!"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"
echo "AI Engine: http://localhost:8000"

wait $AI_ENGINE_PID $BACKEND_PID $NGINX_PID
EOF

RUN chmod +x /app/start.sh

# Expose ports
EXPOSE 3000 5000 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start platform
CMD ["/app/start.sh"]
