import os
import json
import subprocess
import sys

def print_step(msg):
    print(f"\\n{'='*40}\\n🚀 {msg}\\n{'='*40}")

def run_cmd(cmd, cwd=None):
    print(f"\\n> {cmd}")
    try:
        subprocess.run(cmd, cwd=cwd, shell=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"\\n❌ Error running command: {e}")
        # We don't exit here so other services can still deploy if one fails

def deploy_service(name, folder, env_file, attach_domain=False):
    print_step(f"Deploying {name} service...")
    
    # 1. Upload service
    run_cmd(f"railway up --service {name} --environment production -detach", cwd=folder)

    # 2. Set environment variables
    print(f"⚙️ Setting environment variables for {name}...")
    try:
        with open(env_file, 'r', encoding='utf-8') as f:
            env_vars = json.load(f)
            for k, v in env_vars.items():
                print(f"  Setting {k}...")
                run_cmd(f'railway variables set "{k}={v}" --service {name}', cwd=folder)
    except Exception as e:
        print(f"❌ Failed to parse {env_file}: {e}")
        
    # 3. Generate domain
    if attach_domain:
        print(f"🌐 Generating public domain for {name}...")
        run_cmd(f"railway domain --service {name}", cwd=folder)

if __name__ == "__main__":
    print_step("DEEP RESEARCH PLATFORM - FULL DEPLOY")
    
    # Deploy API
    deploy_service("api", "backend/api", "env.api.json", attach_domain=True)
    
    # Deploy Worker
    deploy_service("worker", "backend/worker", "env.worker.json", attach_domain=False)
    
    # Deploy AI Engine
    deploy_service("ai_engine", "ai_engine", "env.ai_engine.json", attach_domain=True)
    
    print_step("✅ ALL DEPLOY COMMANDS COMPLETED!")
    print("Check your dashboard: https://railway.app/dashboard")
