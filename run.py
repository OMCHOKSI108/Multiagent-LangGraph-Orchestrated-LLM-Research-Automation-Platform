#!/usr/bin/env python3
"""
Unified Project Runner

Opens each service in a separate terminal window so you can see logs individually.

Usage:
    python run.py          # Start all services in separate windows
    python run.py --stop   # Stop all services
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

# --------------------------------------------------
# Paths
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).parent.resolve()
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
AI_ENGINE_DIR = PROJECT_ROOT / "ai_engine"

IS_WINDOWS = platform.system() == "Windows"

# Detect Python environment
def find_python():
    """Find the Python executable in the AI engine."""
    possible_names = ["agent", "venv", ".venv", "env"]
    for name in possible_names:
        venv_path = AI_ENGINE_DIR / name
        if IS_WINDOWS:
            python_path = venv_path / "Scripts" / "python.exe"
        else:
            python_path = venv_path / "bin" / "python"
        
        if python_path.exists():
            return str(python_path)
    
    # Fallback to system Python
    return sys.executable

PYTHON_EXE = find_python()

# --------------------------------------------------
# Service Launchers
# --------------------------------------------------

def open_terminal_windows():
    """Open each service in a separate terminal window."""
    
    print("\n" + "=" * 60)
    print(" 🚀 AI Research Platform - Launching Services")
    print("=" * 60 + "\n")
    
    if IS_WINDOWS:
        # Backend API
        print("→ Opening Backend API terminal...")
        subprocess.Popen(
            f'start "Backend API" cmd /k "cd /d {BACKEND_DIR} && npm run dev"',
            shell=True
        )
        
        # Worker
        print("→ Opening Worker terminal...")
        subprocess.Popen(
            f'start "Worker" cmd /k "cd /d {BACKEND_DIR} && npm run worker:dev"',
            shell=True
        )
        
        # AI Engine
        print("→ Opening AI Engine terminal...")
        subprocess.Popen(
            f'start "AI Engine" cmd /k "cd /d {AI_ENGINE_DIR} && "{PYTHON_EXE}" -m uvicorn main:app --reload --port 8000"',
            shell=True
        )
        
        # Frontend
        print("→ Opening Frontend terminal...")
        subprocess.Popen(
            f'start "Frontend" cmd /k "cd /d {FRONTEND_DIR} && npm run dev"',
            shell=True
        )
    
    else:
        # For Mac/Linux, use gnome-terminal or xterm
        terminals = ["gnome-terminal", "xterm", "konsole"]
        term = None
        for t in terminals:
            if subprocess.run(["which", t], capture_output=True).returncode == 0:
                term = t
                break
        
        if term == "gnome-terminal":
            subprocess.Popen([term, "--", "bash", "-c", f"cd {BACKEND_DIR} && npm run dev; exec bash"])
            subprocess.Popen([term, "--", "bash", "-c", f"cd {BACKEND_DIR} && npm run worker:dev; exec bash"])
            subprocess.Popen([term, "--", "bash", "-c", f"cd {AI_ENGINE_DIR} && {PYTHON_EXE} -m uvicorn main:app --reload --port 8000; exec bash"])
            subprocess.Popen([term, "--", "bash", "-c", f"cd {FRONTEND_DIR} && npm run dev; exec bash"])
        else:
            print("No supported terminal found. Please start services manually.")
            return

    print("\n" + "=" * 60)
    print(" ✅ All terminals opened!")
    print("=" * 60)
    print("\n Services:")
    print("   • Frontend  → http://localhost:3000")
    print("   • Backend   → http://localhost:5000")
    print("   • AI Engine → http://localhost:8000")
    print("   • API Docs  → http://localhost:8000/docs")
    print("\n Close the terminal windows to stop each service.")
    print("=" * 60 + "\n")


def stop_services():
    """Stop all running services (Windows only)."""
    if not IS_WINDOWS:
        print("Stop command only works on Windows. Close terminal windows manually.")
        return
    
    print("\n🛑 Stopping all services...\n")
    
    # Kill node processes
    subprocess.run("taskkill /F /IM node.exe", shell=True, capture_output=True)
    
    # Kill Python uvicorn
    subprocess.run("taskkill /F /IM python.exe /FI \"WINDOWTITLE eq AI Engine*\"", shell=True, capture_output=True)
    
    print("✓ All services stopped\n")


def check_dependencies():
    """Quick check for required dependencies."""
    print("📋 Checking setup...\n")
    
    # Check Node
    result = subprocess.run("node --version", shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"✓ Node.js: {result.stdout.strip()}")
    else:
        print("❌ Node.js not found!")
        return False
    
    # Check npm packages
    if (BACKEND_DIR / "node_modules").exists():
        print("✓ Backend dependencies installed")
    else:
        print("→ Installing backend dependencies...")
        subprocess.run("npm install", shell=True, cwd=BACKEND_DIR)
    
    if (FRONTEND_DIR / "node_modules").exists():
        print("✓ Frontend dependencies installed")
    else:
        print("→ Installing frontend dependencies...")
        subprocess.run("npm install", shell=True, cwd=FRONTEND_DIR)
    
    # Check Python env
    if Path(PYTHON_EXE).exists():
        print(f"✓ Python environment: {Path(PYTHON_EXE).parent.parent.name}")
    else:
        print(f"⚠ Python environment not found at expected path")
        print(f"  Will use system Python: {sys.executable}")
    
    return True


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Launch AI Research Platform")
    parser.add_argument("--stop", action="store_true", help="Stop all running services")
    args = parser.parse_args()
    
    if args.stop:
        stop_services()
        return
    
    if check_dependencies():
        open_terminal_windows()


if __name__ == "__main__":
    main()
