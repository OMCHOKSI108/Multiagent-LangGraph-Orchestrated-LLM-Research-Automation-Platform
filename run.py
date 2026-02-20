import subprocess
import sys
import os
import platform
import time
import argparse
import signal
import re

# Service Configuration
SERVICES = {
    "backend": {
        "name": "Backend (Node)",
        "cmd": ["npm", "start"],
        "cwd": "backend",
        "port": 5000,
        "color": "blue"
    },
    "ai_engine": {
        "name": "AI Engine (Python)",
        "cmd": ["uvicorn", "main:app", "--reload", "--port", "8000"],
        "cwd": "ai_engine",
        "venv": "venv",
        "port": 8000,
        "color": "green"
    },
    "frontend": {
        "name": "Frontend (Vite)",
        "cmd": ["npm", "run", "dev"],
        "cwd": "frontend",
        "port": 3000,
        "color": "cyan"
    },
    "worker": {
        "name": "Worker (Node)",
        "cmd": ["npm", "run", "worker"],
        "cwd": "backend",
        "port": None, # Background process, no port
        "color": "magenta"
    }
}

def is_windows():
    return platform.system().lower() == "windows"

def kill_process_by_title(title):
    """Kills a process by its window title (Windows only)."""
    if is_windows():
        try:
            print(f"Killing window '{title}'...")
            subprocess.run(f'taskkill /F /FI "WINDOWTITLE eq {title}*"', shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            print(f"Error killing window {title}: {e}")

def kill_process_on_port(port):
    """Kills any process listening on the specified port."""
    try:
        if is_windows():
            # Find PID
            cmd = f'netstat -ano'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            lines = result.stdout.strip().split('\n')
            
            pids = set()
            for line in lines:
                parts = line.split()
                # Windows netstat -ano output: Proto Local Address Foreign Address State PID
                if len(parts) >= 5 and "LISTENING" in line:
                    local_addr = parts[1]
                    pid = parts[-1]
                    
                    # Strict port check
                    if re.search(f":{port}$", local_addr):
                        pids.add(pid)
            
            for pid in pids:
                if pid != "0":
                    print(f"[{port}] Killing PID {pid}...")
                    subprocess.run(f'taskkill /F /PID {pid}', shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            # Unix-like (lsof)
            cmd = f"lsof -ti:{port} | xargs kill -9"
            subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
    except Exception as e:
        print(f"Error killing port {port}: {e}")

def start_services():
    print("🚀 Starting Services...")
    
    # Base directory
    base_dir = os.path.dirname(os.path.abspath(__file__))

    for key, service in SERVICES.items():
        print(f"Starting {service['name']}...")
        
        cwd = os.path.join(base_dir, service['cwd'])
        cmd = service['cmd']
        
        if is_windows():
            # Construct command for new console window
            if "venv" in service:
                # Python service with venv
                activate_script = os.path.join(cwd, service['venv'], "Scripts", "activate")
                # Quote paths to handle spaces
                full_cmd = f'start "{service["name"]}" cmd /k "cd /d "{cwd}" && call "{activate_script}" && {" ".join(cmd)}"'
            else:
                # Node service
                full_cmd = f'start "{service["name"]}" cmd /k "cd /d "{cwd}" && {" ".join(cmd)}"'
            
            subprocess.Popen(full_cmd, shell=True)
        else:
            print("Linux/Mac support not fully implemented in this script version (focusing on Windows).")

    print("\n✅ All services launch commands issued!")
    print("   - Frontend: http://localhost:3000")
    print("   - Backend:  http://localhost:5000")
    print("   - AI Engine: http://localhost:8000/docs")
    print("   - Worker:   (Background Process)")

def stop_services():
    print("🛑 Stopping Services...")
    
    for key, service in SERVICES.items():
        if service['port']:
            print(f"Stopping {service['name']} (Port {service['port']})...")
            kill_process_on_port(service['port'])
        else:
            print(f"Stopping {service['name']} (Window Title)...")
            kill_process_by_title(service['name'])
        
    print("\n✅ All services stopped.")

def main():
    parser = argparse.ArgumentParser(description="Manage project services.")
    parser.add_argument("--on", action="store_true", help="Start all services")
    parser.add_argument("--off", action="store_true", help="Stop all services")
    
    args = parser.parse_args()
    
    if args.on:
        start_services()
    elif args.off:
        stop_services()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
