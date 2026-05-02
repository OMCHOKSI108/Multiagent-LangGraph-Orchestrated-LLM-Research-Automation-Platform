"""
run.py — MARP Local Development Launcher (Windows + Mac/Linux)
================================================================
Starts all project services without Docker:
  • Backend (Node.js)   → http://localhost:5000
  • AI Engine (Python)  → http://localhost:8000
  • Worker  (Node.js)   → background job processor
  • Frontend (Next.js)  → http://localhost:3000

Usage:
  python run.py               # start everything
  python run.py --backend     # backend + worker only
  python run.py --ai          # AI engine only
  python run.py --frontend    # frontend only
  python run.py --no-worker   # skip the worker
  python run.py --no-ai       # skip AI engine (fast UI dev)

Auto-fixes:
  • Detects and uses project venv automatically
  • Installs missing Python packages via pip
  • Installs missing Node packages via npm install
  • Patches .env URLs from Docker hostnames → localhost
"""

import os
import re
import sys
import time
import signal
import shutil
import argparse
import subprocess
import threading
from pathlib import Path

IS_WINDOWS = sys.platform == "win32"

# ─── Paths ────────────────────────────────────────────────────────────────────
ROOT         = Path(__file__).parent.resolve()
BACKEND_DIR  = ROOT / "backend"
AI_DIR       = ROOT / "ai_engine"
FRONTEND_DIR = ROOT / "frontend"
ENV_FILE     = ROOT / ".env"
REQ_FILE     = AI_DIR / "requirements.txt"

# ─── ANSI Colors ──────────────────────────────────────────────────────────────
if IS_WINDOWS:
    # Enable VT100 on Windows 10+
    import ctypes
    try:
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except Exception:
        pass

C_RESET  = "\033[0m"
C_GREEN  = "\033[92m"
C_CYAN   = "\033[96m"
C_YELLOW = "\033[93m"
C_RED    = "\033[91m"
C_PURPLE = "\033[95m"
C_BOLD   = "\033[1m"
C_DIM    = "\033[2m"

def log(service: str, msg: str, color: str = C_CYAN):
    tag = f"{color}{C_BOLD}[{service}]{C_RESET}"
    print(f"{tag} {msg}", flush=True)

def info(msg: str):  print(f"  {C_DIM}{msg}{C_RESET}", flush=True)

# ─── Venv Detection ───────────────────────────────────────────────────────────
def find_python() -> str:
    """
    Find the best Python executable to use for the AI engine:
    1. Project-local venv (.venv, venv, env)
    2. The Python that launched run.py (respects Anaconda envs / activated venvs)
    """
    venv_candidates = [
        ROOT / ".venv"     / ("Scripts" if IS_WINDOWS else "bin") / ("python.exe" if IS_WINDOWS else "python"),
        ROOT / "venv"      / ("Scripts" if IS_WINDOWS else "bin") / ("python.exe" if IS_WINDOWS else "python"),
        ROOT / "env"       / ("Scripts" if IS_WINDOWS else "bin") / ("python.exe" if IS_WINDOWS else "python"),
        AI_DIR / ".venv"   / ("Scripts" if IS_WINDOWS else "bin") / ("python.exe" if IS_WINDOWS else "python"),
    ]
    for candidate in venv_candidates:
        if candidate.exists():
            log("run.py", f"Using project venv: {candidate}", C_GREEN)
            return str(candidate)

    # Fall back to current interpreter
    log("run.py", f"Using system Python: {sys.executable}", C_YELLOW)
    return sys.executable


def find_npm() -> list:
    """Return the correct npm command list for the current OS."""
    # On Windows, npm is npm.cmd or npm.ps1 — needs shell=True OR explicit .cmd path
    npm_cmd  = shutil.which("npm.cmd")   # Windows npm.cmd
    npm_path = shutil.which("npm")
    if IS_WINDOWS:
        # Use npm.cmd if found, otherwise fall back to shell invocation
        if npm_cmd:
            return [npm_cmd]
        return ["npm.cmd"]
    return [npm_path or "npm"]


def find_node() -> str:
    node = shutil.which("node")
    if not node:
        log("run.py", f"{C_RED}node not found in PATH. Install Node.js from https://nodejs.org{C_RESET}", C_RED)
        sys.exit(1)
    return node


# ─── .env Loader & Patcher ────────────────────────────────────────────────────
def load_env() -> dict:
    env = os.environ.copy()
    if not ENV_FILE.exists():
        log("run.py", f"{C_YELLOW}.env not found — using OS environment only.", C_YELLOW)
        return env
    with open(ENV_FILE, encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                env.setdefault(key, val)
    return env


def patch_local_env(env: dict) -> dict:
    """Swap Docker container hostnames to localhost for local dev."""
    db_user = env.get("DB_USER", "postgres")
    db_pass = env.get("DB_PASSWORD", "postgres")
    db_port = env.get("DB_PORT", "5432")
    db_name = env.get("DB_NAME", "research_platform")

    env.update({
        "DB_HOST":              "localhost",
        "REDIS_URL":            "redis://localhost:6379/0",
        "AI_ENGINE_URL":        "http://localhost:8000",
        "BACKEND_URL":          "http://localhost:5000/api",
        "DATABASE_URL":         f"postgresql://{db_user}:{db_pass}@localhost:{db_port}/{db_name}",
        "NEXT_PUBLIC_API_URL":  "http://localhost:5000/api",
        "NEXT_PUBLIC_WS_URL":   "ws://localhost:5000/events",
        "NODE_ENV":             "development",
        "ENVIRONMENT":          "development",
    })
    return env


# ─── Auto Dependency Installers ───────────────────────────────────────────────
def ensure_pip_deps(python_exec: str):
    """Auto-install Python requirements if any are missing."""
    if not REQ_FILE.exists():
        return

    log("AI Engine", "Checking Python dependencies...", C_GREEN)
    result = subprocess.run(
        [python_exec, "-m", "pip", "check"],
        capture_output=True, text=True, cwd=str(ROOT)
    )
    # Also do a fast import check
    check_imports = ["fastapi", "uvicorn", "langchain", "httpx"]
    missing = []
    for pkg in check_imports:
        r = subprocess.run(
            [python_exec, "-c", f"import {pkg}"],
            capture_output=True, cwd=str(ROOT)
        )
        if r.returncode != 0:
            missing.append(pkg)

    if missing:
        log("AI Engine", f"{C_YELLOW}Missing packages detected: {', '.join(missing)}", C_YELLOW)
        log("AI Engine", f"Installing from {REQ_FILE.name}...", C_YELLOW)
        subprocess.run(
            [python_exec, "-m", "pip", "install", "-r", str(REQ_FILE),
             "--quiet", "--no-warn-script-location"],
            cwd=str(ROOT), check=False
        )
        log("AI Engine", "Pip install complete.", C_GREEN)
    else:
        log("AI Engine", "All Python dependencies are present ✓", C_GREEN)


def ensure_node_deps(directory: Path, label: str, npm_cmd: list):
    """Auto-install node_modules if missing or stale."""
    node_modules = directory / "node_modules"
    if not node_modules.exists():
        log(label, "node_modules missing — running npm install...", C_YELLOW)
        subprocess.run(
            npm_cmd + ["install"],
            cwd=str(directory), check=True,
            shell=IS_WINDOWS  # needed on Windows for npm.cmd
        )
        log(label, "npm install complete ✓", C_GREEN)
    else:
        log(label, "node_modules present ✓", C_GREEN)


# ─── Process Registry ─────────────────────────────────────────────────────────
_processes: dict[str, subprocess.Popen] = {}


def stream_output(proc: subprocess.Popen, service: str, color: str):
    """Stream stdout/stderr of a subprocess to console."""
    def _read(stream, is_err=False):
        try:
            for line in iter(stream.readline, b""):
                text = line.decode("utf-8", errors="replace").rstrip()
                if text:
                    prefix = f"{C_RED}[{service}/ERR]{C_RESET}" if is_err else f"{color}[{service}]{C_RESET}"
                    print(f"{prefix} {text}", flush=True)
        except Exception:
            pass

    threading.Thread(target=_read, args=(proc.stdout,),      daemon=True).start()
    threading.Thread(target=_read, args=(proc.stderr, True), daemon=True).start()


def start_process(name: str, cmd: list, cwd: Path, env: dict, color: str,
                  shell: bool = False) -> subprocess.Popen:
    log(name, f"Starting: {' '.join(cmd)}", color)
    proc = subprocess.Popen(
        cmd,
        cwd=str(cwd),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=shell,
    )
    stream_output(proc, name, color)
    _processes[name] = proc
    return proc


def wait_for_port(host: str, port: int, timeout: int = 60, label: str = "") -> bool:
    import socket
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=1):
                log(label or f"{host}:{port}", f"✓ Ready on port {port}", C_GREEN)
                return True
        except OSError:
            time.sleep(1)
    log(label or f"{host}:{port}", f"⚠ Timed out waiting for port {port} (still starting...)", C_YELLOW)
    return False  # Don't abort — service may just be slow (ML model loading)


# ─── Service Starters ─────────────────────────────────────────────────────────
def start_backend(env: dict, node: str):
    return start_process("Backend", [node, "server.js"], BACKEND_DIR, env, C_CYAN)


def start_worker(env: dict, node: str):
    return start_process("Worker", [node, "worker.js"], BACKEND_DIR, env, C_YELLOW)


def start_ai_engine(env: dict, python_exec: str):
    engine_env = env.copy()
    engine_env["PYTHONPATH"] = str(ROOT)
    cmd = [
        python_exec, "-m", "uvicorn",
        "ai_engine.main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--reload",
        "--reload-dir", str(AI_DIR),
    ]
    return start_process("AI Engine", cmd, ROOT, engine_env, C_GREEN)


def start_frontend(env: dict, npm_cmd: list):
    ensure_node_deps(FRONTEND_DIR, "Frontend", npm_cmd)
    # On Windows npm must run with shell=True because npm.cmd is a batch wrapper
    cmd = npm_cmd + ["run", "dev"]
    return start_process("Frontend", cmd, FRONTEND_DIR, env, C_PURPLE, shell=IS_WINDOWS)


# ─── Graceful Shutdown ────────────────────────────────────────────────────────
def shutdown_all(signum=None, frame=None):
    print(f"\n{C_YELLOW}{C_BOLD}Shutting down all services...{C_RESET}", flush=True)
    for name, proc in list(_processes.items()):
        try:
            if proc.poll() is None:
                log(name, "Stopping...", C_YELLOW)
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
        except Exception as e:
            log(name, f"Error: {e}", C_RED)
    print(f"{C_GREEN}✓ All services stopped.{C_RESET}", flush=True)
    sys.exit(0)


# ─── Banner ───────────────────────────────────────────────────────────────────
BANNER = f"""
{C_BOLD}{C_CYAN}╔══════════════════════════════════════════════════╗
║     MARP – Multi-Agentic Research Platform       ║
║         Local Development Launcher               ║
╚══════════════════════════════════════════════════╝{C_RESET}

  {C_GREEN}Frontend   {C_RESET}→  http://localhost:3000
  {C_CYAN}Backend    {C_RESET}→  http://localhost:5000
  {C_GREEN}AI Engine  {C_RESET}→  http://localhost:8000
  {C_YELLOW}Worker     {C_RESET}→  background process

  Press {C_BOLD}Ctrl+C{C_RESET} to stop all services.
"""

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="MARP Local Launcher")
    parser.add_argument("--backend",   action="store_true", help="Start only backend + worker")
    parser.add_argument("--ai",        action="store_true", help="Start only AI engine")
    parser.add_argument("--frontend",  action="store_true", help="Start only frontend")
    parser.add_argument("--no-worker", action="store_true", help="Skip the worker")
    parser.add_argument("--no-ai",     action="store_true", help="Skip the AI engine")
    parser.add_argument("--no-frontend", action="store_true", help="Skip the frontend")
    args = parser.parse_args()

    print(BANNER)

    signal.signal(signal.SIGINT,  shutdown_all)
    signal.signal(signal.SIGTERM, shutdown_all)

    env      = load_env()
    env      = patch_local_env(env)
    node     = find_node()
    npm_cmd  = find_npm()
    python_exec = find_python()

    start_all = not (args.backend or args.ai or args.frontend)

    # ── Backend ──────────────────────────────────────────────────────────────
    if start_all or args.backend:
        ensure_node_deps(BACKEND_DIR, "Backend", npm_cmd)
        start_backend(env, node)
        wait_for_port("localhost", int(env.get("PORT", 5000)), timeout=20, label="Backend")
        if not args.no_worker:
            start_worker(env, node)

    # ── AI Engine ────────────────────────────────────────────────────────────
    if (start_all or args.ai) and not args.no_ai:
        ensure_pip_deps(python_exec)
        start_ai_engine(env, python_exec)
        log("AI Engine", "Starting... (first run may take 30-90s for model loading)", C_YELLOW)
        # Non-blocking — worker will retry. Don't abort if slow.
        wait_for_port("localhost", 8000, timeout=90, label="AI Engine")

    # ── Frontend ─────────────────────────────────────────────────────────────
    if (start_all or args.frontend) and not args.no_frontend:
        start_frontend(env, npm_cmd)
        wait_for_port("localhost", 3000, timeout=90, label="Frontend")

    if start_all:
        print(f"\n{C_GREEN}{C_BOLD}✓ All services started!{C_RESET}")
        print(f"  Open {C_CYAN}http://localhost:3000{C_RESET} in your browser.\n")

    # ── Keep alive: monitor for crashed processes ─────────────────────────────
    try:
        while True:
            for name in list(_processes.keys()):
                proc = _processes.get(name)
                if proc and proc.poll() is not None:
                    log(name, f"{C_RED}Exited with code {proc.returncode}{C_RESET}", C_RED)
                    _processes.pop(name, None)
            if not _processes:
                log("run.py", "All processes have exited.", C_YELLOW)
                break
            time.sleep(2)
    except KeyboardInterrupt:
        shutdown_all()


if __name__ == "__main__":
    main()
