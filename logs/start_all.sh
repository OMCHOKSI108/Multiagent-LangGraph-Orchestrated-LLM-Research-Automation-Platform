#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/omchoksi/workspace/projects/Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOGDIR="$ROOT/logs"
LOGFILE="$LOGDIR/log_${TIMESTAMP}_server_start.log"
FLOG="$LOGDIR/.fastapi_${TIMESTAMP}.log"
NLOG="$LOGDIR/.node_${TIMESTAMP}.log"
XLOG="$LOGDIR/.next_${TIMESTAMP}.log"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOGFILE"; }

# Kill existing
for port in 8000 4000 3000; do
  pid=$(lsof -ti :"$port" 2>/dev/null || true)
  [ -n "$pid" ] && kill -9 "$pid" 2>/dev/null && log "Killed existing on port $port"
done
sleep 1

log "========== STARTING ALL SERVERS =========="
log "Log: $LOGFILE"

cd "$ROOT/server/fastapi_server"
nohup "$ROOT/server/.venv/bin/python" main.py > "$FLOG" 2>&1 &
FPID=$!; echo "$FPID" > "$LOGDIR/.fastapi.pid"; log "FastAPI (PID $FPID)"

sleep 3

cd "$ROOT/server/ts_server"
nohup npx tsx src/index.ts > "$NLOG" 2>&1 &
NPID=$!; echo "$NPID" > "$LOGDIR/.node.pid"; log "Node    (PID $NPID)"

sleep 2

cd "$ROOT/client"
nohup npx next dev > "$XLOG" 2>&1 &
XPDID=$!; echo "$XPDID" > "$LOGDIR/.next.pid"; log "Next    (PID $XPDID)"

# Wait for all ports
for i in $(seq 1 30); do
  sleep 2
  f_ok=0; n_ok=0; x_ok=0
  curl -sf http://localhost:8000/api/health >/dev/null 2>&1 && f_ok=1
  curl -sf http://localhost:4000/api/health >/dev/null 2>&1 && n_ok=1
  curl -sf http://localhost:3000 >/dev/null 2>&1 && x_ok=1
  [ $((f_ok + n_ok + x_ok)) -eq 3 ] && break
  log "Waiting... (F:$f_ok N:$n_ok X:$x_ok)"
done

log "FastAPI: $(lsof -ti :8000 >/dev/null 2>&1 && echo 'UP' || echo 'DOWN')"
log "Node:    $(lsof -ti :4000 >/dev/null 2>&1 && echo 'UP' || echo 'DOWN')"
log "Next:    $(lsof -ti :3000 >/dev/null 2>&1 && echo 'UP' || echo 'DOWN')"
log "========== SERVERS READY =========="
log ""
log "Live logs:   tail -f $LOGFILE"
log "Stop all:    kill \$(cat $LOGDIR/.fastapi.pid) \$(cat $LOGDIR/.node.pid) \$(cat $LOGDIR/.next.pid)"
log "Individual:  $FLOG  $NLOG  $XLOG"
