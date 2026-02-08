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
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

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

# Import search router
from routes.search import router as search_router

app = FastAPI(title="AI Research Engine", version="2.0.0")

# ============================
# Register Routers
# ============================
app.include_router(search_router)

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

class SearchRequest(BaseModel):
    query: str
    providers: Optional[List[str]] = None
    max_results: int = 10

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai_engine", "version": "2.0.0"}

@app.get("/usage/stats")
async def get_usage_stats(hours: int = 24):
    """Get token usage statistics for the last N hours"""
    try:
        from utils.token_tracker import get_usage_stats
        stats = get_usage_stats(hours)
        return stats
    except Exception as e:
        logger.error(f"Failed to get usage stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/usage/job/{job_id}")
async def get_job_usage(job_id: str):
    """Get token usage statistics for a specific job"""
    try:
        from utils.token_tracker import get_job_usage
        stats = get_job_usage(job_id)
        return stats
    except Exception as e:
        logger.error(f"Failed to get job usage: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        
        # Save result to JSON file as requested
        try:
            output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output")
            os.makedirs(output_dir, exist_ok=True)
            
            output_file = os.path.join(output_dir, f"{job_id}.json")
            import json
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump({
                    "status": "completed",
                    "task": request.task,
                    "result": result.get("results"),
                    "final_state": result
                }, f, indent=2, ensure_ascii=False)
                
            logger.info(f"[Job #{job_id}] Saved result to {output_file}")
            
            # Also save as latest.json for easy access
            latest_file = os.path.join(output_dir, "latest.json")
            import shutil
            shutil.copy2(output_file, latest_file)
            
        except Exception as e:
            logger.error(f"[Job #{job_id}] Failed to save output JSON: {str(e)}")

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
# Unified Web Search Endpoint
# ============================

@app.post("/search", tags=["Search"])
async def unified_search(request: SearchRequest):
    """
    Unified web search across multiple providers.
    Returns normalized results from DuckDuckGo, Google, Arxiv, Wikipedia, OpenAlex, PubMed.
    """
    from utils.search_service import search_sync

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            lambda: search_sync(
                query=request.query,
                providers=request.providers,
                max_results=request.max_results
            )
        )
        return result
    except Exception as e:
        logger.error(f"[Search] Failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================
# Streaming Chat Endpoint
# ============================

@app.post("/agent/interactive_chatbot/stream", tags=["Agents"])
async def stream_chatbot(request: ResearchRequest):
    """
    Streaming version of the interactive chatbot.
    Returns SSE stream of text chunks.
    """
    from agents.registry import AGENTS

    agent = AGENTS.get("interactive_chatbot")
    if not agent:
        raise HTTPException(status_code=500, detail="Interactive chatbot agent not found in registry")

    state = {
        "task": request.task,
        "paper_url": request.paper_url or "",
        "findings": request.findings or {},
        "_job_id": request.job_id or "unknown"
    }

    async def generate():
        """Generate streaming response from agent."""
        try:
            from config import LLM_MODE, OLLAMA_BASE_URL, MODEL_WRITING

            if LLM_MODE == "offline":
                from langchain_ollama import ChatOllama
                llm = ChatOllama(
                    model=MODEL_WRITING,
                    base_url=OLLAMA_BASE_URL,
                    temperature=0.7
                )
            else:
                from config import GEMINI_API_KEY
                from langchain_google_genai import ChatGoogleGenerativeAI
                llm = ChatGoogleGenerativeAI(
                    model="gemini-2.5-flash",
                    google_api_key=GEMINI_API_KEY,
                    temperature=0.7
                )

            # Build messages
            system_prompt = agent.system_prompt
            context = state.get("findings", {})
            context_str = ""
            if context:
                for key, value in context.items():
                    if isinstance(value, str):
                        context_str += f"\n{key}: {value[:500]}"
                    elif isinstance(value, dict) and "response" in value:
                        context_str += f"\n{key}: {value['response'][:500]}"

            from langchain_core.messages import SystemMessage, HumanMessage
            messages = [
                SystemMessage(content=system_prompt + "\n\nResearch Context:" + context_str),
                HumanMessage(content=state["task"])
            ]

            # Stream chunks
            for chunk in llm.stream(messages):
                content = chunk.content if hasattr(chunk, 'content') else str(chunk)
                if content:
                    yield f"data: {content}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"[StreamChat] Error: {str(e)}")
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*"
        }
    )

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

def main():
    """Main entry point for console script"""
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()