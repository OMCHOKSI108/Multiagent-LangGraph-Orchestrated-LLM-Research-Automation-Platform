import sys
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

# Add the ai_engine directory to Python path for relative imports
AI_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
if AI_ENGINE_DIR not in sys.path:
    sys.path.insert(0, AI_ENGINE_DIR)

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

# ============================
# Structured Logging Setup
# ============================
# Create logs directory FIRST
os.makedirs("logs", exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.FileHandler('logs/ai_engine.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("ai_engine")

# ============================
# Thread Pool for Blocking Calls
# ============================
# This prevents blocking LLM calls from freezing the async event loop
executor = ThreadPoolExecutor(max_workers=4)

app = FastAPI(title="AI Research Engine", version="2.0.0")

class ResearchRequest(BaseModel):
    task: str
    paper_url: Optional[str] = None
    depth: str = "deep"
    findings: Optional[Dict[str, Any]] = None
    job_id: Optional[int] = None  # For correlation/tracing

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "task": "Transformer Architecture evolution",
                    "paper_url": "https://arxiv.org/pdf/1706.03762.pdf",
                    "depth": "deep"
                },
                {
                    "task": "Impact of Generative AI on Education",
                    "depth": "quick"
                }
            ]
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai_engine", "version": "2.0.0"}

@app.get("/")
async def root():
    return {
        "service": "AI Research Platform",
        "status": "active",
        "documentation": "/docs",
        "endpoints": {
            "research": "POST /research"
        }
    }

@app.post("/research")
async def run_research(request: ResearchRequest):
    """
    Main research endpoint - runs the full pipeline.
    Uses ThreadPoolExecutor to avoid blocking the async event loop.
    """
    from graph.full_pipeline import app as pipeline
    from utils.event_emitter import set_job_context, emit_stage_change, emit_event
    
    job_id = request.job_id or "unknown"
    research_id = int(job_id) if str(job_id).isdigit() else None
    
    logger.info(f"[Job #{job_id}] Starting research: {request.task[:50]}...")
    
    # Set job context for event emission
    if research_id:
        set_job_context(research_id)
        emit_stage_change("orchestrating", next_stage="searching")
    
    initial_state = {
        "task": request.task,
        "paper_url": request.paper_url,
        "plan": None,
        "results": {},
        "next_step": None,
        "findings": {},
        "history": [],
        "_job_id": job_id  # For tracing through pipeline
    }
    
    try:
        # Run blocking pipeline in thread pool to not block async loop
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            lambda: pipeline.invoke(initial_state)
        )
        
        logger.info(f"[Job #{job_id}] Research completed successfully")
        
        if research_id:
            emit_stage_change("completed")
        
        return {
            "status": "completed",
            "task": request.task,
            "result": result.get("results"),
            "final_state": result
        }
    except Exception as e:
        logger.error(f"[Job #{job_id}] Research failed: {str(e)}")
        if research_id:
            emit_event("failed", f"Pipeline failed: {str(e)}", severity="error")
        raise HTTPException(status_code=500, detail=str(e))

# ============================
# Dynamic Agent Endpoints
# ============================
from agents.registry import AGENTS

for agent_slug, agent_instance in AGENTS.items():
    def make_handler(agent=agent_instance):
        async def handler(request: ResearchRequest):
            job_id = request.job_id or "unknown"
            logger.info(f"[Job #{job_id}] Calling agent: {agent.name}")
            
            state = {
                "task": request.task, 
                "paper_url": request.paper_url or "",
                "findings": request.findings or {},
                "_job_id": job_id
            }
            
            # Run blocking LLM call in thread pool
            loop = asyncio.get_event_loop()
            try:
                result = await loop.run_in_executor(
                    executor,
                    lambda: agent.run(state)
                )
                return {"agent": agent.name, "response": result}
            except Exception as e:
                logger.error(f"[Job #{job_id}] Agent {agent.name} failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        return handler

    app.post(f"/agent/{agent_slug}", tags=["Agents"])(make_handler())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)