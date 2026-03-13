import subprocess
import os
import sys
import time

# =============================================================================
# MARP (Multi-Agentic Research Platform) Multi-Terminal Service Runner
# =============================================================================

def print_banner(text):
    print("=" * 60)
    print(f" {text}")
    print("=" * 60)

class ServiceRunner:
    def __init__(self):
        self.root_dir = os.path.dirname(os.path.abspath(__file__))
        self.ai_engine_dir = os.path.join(self.root_dir, "ai_engine")
        self.backend_dir = os.path.join(self.root_dir, "backend")
        self.frontend_dir = os.path.join(self.root_dir, "frontend")
        self.venv_python = os.path.join(self.ai_engine_dir, "venv", "Scripts", "python.exe") if os.name == "nt" else os.path.join(self.ai_engine_dir, "venv", "bin", "python")

    def run_migrations(self):
        print_banner("Running Database Migrations")
        # Ensure we run migrations first
        try:
            subprocess.run(["node", "scripts/init-db.js"], cwd=self.backend_dir, check=True)
            print("✅ Migrations completed successfully.")
        except subprocess.CalledProcessError as e:
            print(f"❌ Migrations failed: {e}")
            sys.exit(1)

    def start_service_in_new_terminal(self, name, command, cwd):
        print(f"Launching {name} in a new terminal...")
        if os.name == "nt":
            # Windows 'start' command opens a new window
            # Use 'powershell' to wrap the command if needed, or 'cmd /c'
            # We use 'cmd /k' so the window stays open even if the process crashes/exits
            full_cmd = f'start "{name}" cmd /k "cd /d {cwd} && {command}"'
            os.system(full_cmd)
        else:
            # Linux/macOS alternatives (xterm, gnome-terminal, etc. are environment dependent)
            # For simplicity, providing a generic fallback or advice
            print(f"NOTE: Separate window launch is optimized for Windows. Running in current shell for {name}.")
            subprocess.Popen(command, cwd=cwd, shell=True)

    def start_all(self):
        self.run_migrations()
        time.sleep(1)

        # 1. AI Engine
        ai_cmd = f'"{self.venv_python}" -m uvicorn main:app --reload --port 8000'
        self.start_service_in_new_terminal("MARP AI Engine", ai_cmd, self.ai_engine_dir)
        time.sleep(2)

        # 2. Backend Server
        self.start_service_in_new_terminal("MARP Backend", "npm run dev", self.backend_dir)
        time.sleep(1)

        # 3. Worker
        self.start_service_in_new_terminal("MARP Worker", "npm run worker:dev", self.backend_dir)
        time.sleep(1)

        # 4. Frontend
        self.start_service_in_new_terminal("MARP Frontend", "npm run dev", self.frontend_dir)

        print_banner("All Services Launched in Separate Windows!")
        print("AI Engine: http://localhost:8000/docs")
        print("Backend:    http://localhost:5000")
        print("Frontend:   http://localhost:3000")

    def run(self):
        self.start_all()

if __name__ == "__main__":
    runner = ServiceRunner()
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--on":
            runner.run()
        elif sys.argv[1] == "--off":
            print("Stopping services in separate windows must be done manually (close the windows).")
        else:
            print("Usage: python run.py [--on]")
    else:
        runner.run()
