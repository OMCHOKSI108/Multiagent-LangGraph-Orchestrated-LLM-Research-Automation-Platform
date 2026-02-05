#!/bin/bash

# Multi-Agent LLM Research Automation Platform
# Startup script for all services

set -e

echo "🚀 Starting Multi-Agent LLM Research Automation Platform..."

# Function to wait for service
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for $service on port $port..."
    while ! nc -z localhost $port 2>/dev/null; do
        if [ $attempt -ge $max_attempts ]; then
            echo "❌ Failed to connect to $service after $max_attempts attempts"
            exit 1
        fi
        echo "   Attempt $attempt/$max_attempts..."
        sleep 2
        ((attempt++))
    done
    echo "✅ $service is ready!"
}

# Start Ollama in background
echo "🤖 Starting Ollama..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama
wait_for_service "Ollama" 11434

# Pull required models
echo "📥 Pulling required Ollama models..."
ollama pull phi3:mini || echo "Warning: Could not pull phi3:mini"
ollama pull gemma2:2b || echo "Warning: Could not pull gemma2:2b"
ollama pull qwen2.5-coder:1.5b || echo "Warning: Could not pull qwen2.5-coder:1.5b"

# Start AI Engine
echo "🧠 Starting AI Engine..."
cd ai_engine
python main.py &
AI_ENGINE_PID=$!

# Wait for AI Engine
wait_for_service "AI Engine" 8000

# Start Backend API
echo "🔧 Starting Backend API..."
cd ../backend
npm start &
BACKEND_PID=$!

# Wait for Backend
wait_for_service "Backend API" 5000

# Start Frontend
echo "💻 Starting Frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "📊 Service URLs:"
echo "   Frontend:    http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo "   AI Engine:   http://localhost:8000"
echo "   Ollama:      http://localhost:11434"
echo ""
echo "📝 API Documentation:"
echo "   Backend:     http://localhost:5000/docs"
echo "   AI Engine:   http://localhost:8000/docs"
echo ""
echo "🛑 To stop all services, press Ctrl+C"

# Wait for interrupt
trap "echo '🛑 Shutting down services...'; kill $FRONTEND_PID $BACKEND_PID $AI_ENGINE_PID $OLLAMA_PID 2>/dev/null; exit" INT
wait