#!/bin/bash
# Start all services for the Multi-Agent Research Platform

set -e

echo "========================================="
echo " Multi-Agent Research Platform Launcher"
echo "========================================="

# Start AI Engine (background)
echo "[1/3] Starting AI Engine on port 8000..."
cd /app/ai_engine
uvicorn main:app --host 0.0.0.0 --port 8000 &
AI_PID=$!

# Start Backend (background)
echo "[2/3] Starting Backend on port 5000..."
cd /app/backend
node server.js &
BACKEND_PID=$!

# Start Worker (background)
echo "[2b/3] Starting Worker..."
node worker.js &
WORKER_PID=$!

# Wait for backend to be ready
sleep 3

echo "[3/3] All services started!"
echo "  - AI Engine:  http://localhost:8000"
echo "  - Backend:    http://localhost:5000"
echo "  - API Docs:   http://localhost:8000/docs"
echo "========================================="

# Wait for any process to exit
wait -n $AI_PID $BACKEND_PID $WORKER_PID

# Exit with the status of the process that exited first
exit $?
