import sys
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging
import datetime
import traceback

# Add the ai_engine directory to Python path for relative imports
AI_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
if AI_ENGINE_DIR not in sys.path:
    sys.path.insert(0, AI_ENGINE_DIR)

from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from config import SEARCH_PROVIDERS
from utils.metrics import get_metrics

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
executor = ThreadPoolExecutor(max_workers=int(os.getenv("AI_ENGINE_MAX_WORKERS", "4")))

# ============================
# Internal API Key Security
# ============================
AI_ENGINE_SECRET = os.getenv("AI_ENGINE_SECRET", "")
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_internal_key(api_key: str = Security(_api_key_header)):
    """
    Validates the internal API key for mutation endpoints.
    If AI_ENGINE_SECRET is not configured, all requests are allowed (dev mode).
    """
    if not AI_ENGINE_SECRET:
        return  # No secret configured — dev mode, allow all
    if api_key != AI_ENGINE_SECRET:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")

# Import search router
from routes.search import router as search_router

app = FastAPI(
    title="Deep Research Engine API",
    description="""
    **Multi-Agent Research Platform** 

    This API provides access to specialized AI agents for comprehensive research analysis.
    Each agent can be tested individually with custom inputs through the `/agents/{agent_slug}/test` endpoints.

    ## Features
    - **Individual Agent Testing**: Test each research agent separately
    - **Provider Configuration**: Configure and test search providers
    - **Real-time Processing**: Stream research progress and results
    - **Specialized Agents**: Discovery, Scraping, Synthesis, Critique, Visualization, Verification

    ## Quick Start
    1. Check available agents: `GET /agents`
    2. Test an agent: `POST /agents/{agent_slug}/test`
    3. Configure providers: `GET /providers`
    4. Run full research: `POST /research`
    """,
    version="2.1.0",
    contact={
        "name": "Deep Research Engine",
        "url": "https://github.com/your-repo",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_tags=[
        {
            "name": "Health",
            "description": "Service health and status checks"
        },
        {
            "name": "Providers", 
            "description": "Search provider configuration and testing"
        },
        {
            "name": "Agents",
            "description": "Individual agent testing and management"
        },
        {
            "name": "Research",
            "description": "Full research pipeline execution"
        },
        {
            "name": "Usage",
            "description": "Token usage and cost tracking"
        },
        {
            "name": "Search",
            "description": "Direct search functionality"
        }
    ]
)

# ============================
# CORS Middleware
# ============================
_allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5000,http://127.0.0.1:5000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    workspace_id: Optional[str] = None   # Phase 2: workspace isolation
    session_id: Optional[int] = None     # Phase 2: session tracking

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

@app.get("/health", tags=["Health"])
async def health_check():
    """
    🟢 **Health Check**
    
    Returns the current status of the AI Engine service.
    Use this endpoint to verify the service is running and operational.
    """
    return {"status": "ok", "service": "ai_engine", "version": "2.1.0"}


@app.get('/metrics', tags=['Health'])
async def metrics_endpoint():
    """Return in-memory metrics (development only)."""
    try:
        return get_metrics()
    except Exception as e:
        return {"error": str(e)}


@app.get("/llm/status", tags=["Health"])
async def llm_status():
    """
    🔧 **LLM Provider Status**

    Returns the current LLM mode (OFFLINE/ONLINE), active provider details,
    available API keys count, and model configuration.

    Use this endpoint to display the current mode in the frontend UI.
    """
    from llm.factory import get_llm_status
    return get_llm_status()

@app.get("/providers", tags=["Providers"])
async def get_provider_config():
    """
    🔍 **Get Search Provider Configuration**
    
    Returns all available search providers with descriptions and test capabilities.
    
    **Available Providers:**
    - 🦆 **DuckDuckGo**: Privacy-focused general web search
    - 🔍 **Google**: Comprehensive web search (requires API key)
    - 📚 **ArXiv**: Academic papers and preprints
    - 📰 **Wikipedia**: Encyclopedia articles and summaries
    - 🔬 **OpenAlex**: Open access scientific literature
    - ⚕️ **PubMed**: Medical and life science research
    
    **Each provider can be tested individually using the `/providers/test` endpoint!**
    """
    return {
        **SEARCH_PROVIDERS,
        "test_endpoint": "/providers/test",
        "usage_examples": {
            "duckduckgo": "General web search for any topic",
            "google": "Comprehensive search with advanced ranking", 
            "arxiv": "Latest research papers and preprints",
            "wikipedia": "Encyclopedic knowledge and summaries",
            "openalex": "Open access academic publications",
            "pubmed": "Medical and biomedical research"
        }
    }

@app.get("/providers/status", tags=["Providers"])
async def get_providers_status():
    """
    📊 **Check All Search Providers Status**
    
    Tests connectivity and availability of all search providers.
    Shows which providers are working and which have issues.
    """
    from utils.providers import PROVIDER_REGISTRY
    
    status_results = {}
    
    for provider_name, provider_instance in PROVIDER_REGISTRY.items():
        try:
            # Quick test search
            test_results = provider_instance.search("test", max_results=1)
            
            if test_results and len(test_results) > 0 and "error" not in test_results[0]:
                status_results[provider_name] = {
                    "status": "✅ Available",
                    "test_results": len(test_results),
                    "sample_title": test_results[0].get("title", "N/A")[:50]
                }
            else:
                error_msg = test_results[0].get("error", "No results") if test_results else "No response"
                status_results[provider_name] = {
                    "status": "⚠️ Issues",
                    "error": error_msg
                }
        except Exception as e:
            status_results[provider_name] = {
                "status": "❌ Failed",
                "error": str(e)
            }
    
    working_count = sum(1 for s in status_results.values() if "Available" in s["status"])
    
    return {
        "total_providers": len(PROVIDER_REGISTRY),
        "working_providers": working_count,
        "provider_status": status_results,
        "summary": f"{working_count}/{len(PROVIDER_REGISTRY)} providers working"
    }

@app.post("/providers/test", tags=["Providers"])
async def test_provider(provider: str = "duckduckgo", query: str = "artificial intelligence research"):
    """
    🧪 **Test Search Provider**
    
    Tests any available search provider with a sample query.
    
    **Available Providers:**
    - `duckduckgo`: General web search with privacy focus
    - `google`: Google search (requires API key)
    - `arxiv`: Academic papers and preprints
    - `wikipedia`: Wikipedia encyclopedia articles
    - `openalex`: Open access scientific literature
    - `pubmed`: Medical and life science literature
    
    **Click 'Try it out' to test any provider immediately!**
    
    **Example Queries by Provider:**
    - **DuckDuckGo**: "machine learning trends 2024"
    - **ArXiv**: "transformer neural networks"
    - **Wikipedia**: "artificial intelligence"
    - **OpenAlex**: "deep learning applications"
    - **PubMed**: "COVID-19 treatment"
    - **Google**: "quantum computing research"
    """
    try:
        from utils.search_service import search_sync
        
        # Provider-specific default queries
        default_queries = {
            "duckduckgo": "machine learning trends 2024",
            "google": "quantum computing research",
            "arxiv": "transformer neural networks",
            "wikipedia": "artificial intelligence",
            "openalex": "deep learning applications",
            "pubmed": "COVID-19 treatment"
        }
        
        # Use default query if generic query provided
        test_query = query
        if query == "artificial intelligence research":
            test_query = default_queries.get(provider, query)
        
        logger.info(f"Testing provider: {provider} with query: '{test_query}'")
        
        # Run search in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            lambda: search_sync(test_query, providers=[provider], max_results=3)
        )
        
        return {
            "provider": provider,
            "status": "success",
            "query": test_query,
            "results_count": result.get("total_results", 0),
            "execution_time": result.get("execution_time", 0),
            "sample_results": result.get("results", [])[:2],  # Show first 2 results
            "all_results": result.get("results", [])  # Full results for detailed inspection
        }
    except Exception as e:
        logger.error(f"Provider test failed: {e}")
        return {
            "provider": provider,
            "status": "error", 
            "query": query,
            "error": str(e),
            "available_providers": SEARCH_PROVIDERS["available"]
        }

@app.get("/agents", tags=["Agents"])
async def list_agents():
    """
    🤖 **List Available Agents**
    
    Returns all available AI agents with their descriptions and default inputs.
    Each agent can be tested individually using the `/agents/{agent_slug}/test` endpoint.
    
    **Click "Try it out" on any agent below to test with pre-filled inputs!**
    """
    from agents.registry import AGENTS
    
    # Agent metadata with default inputs for testing
    agent_metadata = {
        "topic_discovery": {
            "name": "Topic Discovery",
            "description": "Generates professional research titles and topics",
            "default_input": "artificial intelligence in healthcare",
            "category": "Discovery"
        },
        "domain_intelligence": {
            "name": "Domain Intelligence",
            "description": "Maps research landscapes and key concepts",
            "default_input": "quantum computing applications",
            "category": "Discovery"
        },
        "historical_review": {
            "name": "Historical Review",
            "description": "Traces evolution of research topics over time",
            "default_input": "neural networks development",
            "category": "Discovery"
        },
        "slr": {
            "name": "Systematic Literature Review",
            "description": "PRISMA-compliant literature reviews",
            "default_input": "transformer architecture papers",
            "category": "Review"
        },
        "gap_synthesis": {
            "name": "Gap Synthesis",
            "description": "Identifies research opportunities and gaps",
            "default_input": "computer vision limitations",
            "category": "Synthesis"
        },
        "innovation_novelty": {
            "name": "Innovation & Novelty",
            "description": "Creates novel research ideas and approaches",
            "default_input": "sustainable AI computing",
            "category": "Innovation"
        },
        "paper_decomposition": {
            "name": "Paper Decomposition",
            "description": "Structural analysis of research papers",
            "default_input": "https://arxiv.org/abs/1706.03762",
            "category": "Analysis"
        },
        "paper_understanding": {
            "name": "Paper Understanding",
            "description": "Deep comprehension and summarization",
            "default_input": "Attention mechanism in transformers",
            "category": "Analysis"
        },
        "technical_verification": {
            "name": "Technical Verification",
            "description": "Validates technical claims and methods",
            "default_input": "BERT achieves 95% accuracy on GLUE benchmark",
            "category": "Verification"
        },
        "interactive_chatbot": {
            "name": "Interactive Chatbot",
            "description": "Conversational research assistance",
            "default_input": "Explain the attention mechanism in simple terms",
            "category": "Interaction"
        },
        "visualization": {
            "name": "Data Visualization",
            "description": "Creates charts, diagrams, and visual representations",
            "default_input": "GPU performance: RTX 4090: 100 TFLOPS, RTX 4080: 80 TFLOPS, RTX 4070: 60 TFLOPS",
            "category": "Visualization"
        },
        "scientific_writing": {
            "name": "Scientific Writing",
            "description": "Academic paper composition and editing",
            "default_input": "Write introduction for machine learning survey",
            "category": "Writing"
        },
        "latex_generation": {
            "name": "LaTeX Generation",
            "description": "Professional typesetting and formatting",
            "default_input": "Generate LaTeX table for experimental results",
            "category": "Writing"
        },
        "adversarial_critique": {
            "name": "Adversarial Critique",
            "description": "Bias detection and critical analysis",
            "default_input": "AI will replace all human jobs within 5 years",
            "category": "Critique"
        },
        "hallucination_detection": {
            "name": "Hallucination Detection",
            "description": "AI output validation and fact-checking",
            "default_input": "GPT-4 has 1 trillion parameters and was trained on 100TB of data",
            "category": "Verification"
        },
        "data_scraper": {
            "name": "Data Scraper",
            "description": "Web content extraction and processing",
            "default_input": "https://arxiv.org/abs/2023.12345",
            "category": "Data"
        },
        "news": {
            "name": "News Agent",
            "description": "Latest research news and developments",
            "default_input": "recent AI breakthroughs 2024",
            "category": "Discovery"
        },
        "scoring": {
            "name": "Research Scoring",
            "description": "Quality assessment and ranking",
            "default_input": "evaluate research methodology quality",
            "category": "Assessment"
        }
    }
    
    # Build response with available agents
    available_agents = []
    for agent_key, agent_instance in AGENTS.items():
        if agent_instance and agent_key in agent_metadata:
            meta = agent_metadata[agent_key]
            available_agents.append({
                "slug": agent_key,
                "name": meta["name"],
                "description": meta["description"],
                "default_input": meta["default_input"],
                "category": meta["category"],
                "test_url": f"/agents/{agent_key}/test"
            })
    
    # Group by category
    categories = {}
    for agent in available_agents:
        cat = agent["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(agent)
    
    return {
        "total_agents": len(available_agents),
        "categories": categories,
        "agents": available_agents,
        "search_providers": SEARCH_PROVIDERS
    }

class AgentTestRequest(BaseModel):
    task: str = "artificial intelligence in healthcare"
    options: Optional[Dict[str, Any]] = {}
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "task": "artificial intelligence in healthcare",
                    "options": {"depth": "detailed", "focus": "applications"}
                },
                {
                    "task": "quantum computing applications",
                    "options": {"include_timeline": True}
                },
                {
                    "task": "https://arxiv.org/abs/1706.03762",
                    "options": {"extract_figures": True, "summarize": True}
                },
                {
                    "task": "transformer architecture papers",
                    "options": {"max_papers": 10, "include_citations": True}
                },
                {
                    "task": "BERT achieves 95% accuracy on GLUE benchmark",
                    "options": {"check_methodology": True, "verify_claims": True}
                },
                {
                    "task": "GPU performance: RTX 4090: 100 TFLOPS, RTX 4080: 80 TFLOPS",
                    "options": {"chart_type": "bar", "include_comparison": True}
                },
                {
                    "task": "recent AI breakthroughs 2024",
                    "options": {"time_range": "last_6_months", "sources": ["arxiv", "news"]}
                }
            ]
        }
    }

@app.post("/agents/{agent_slug}/test", tags=["Agents"])
async def test_agent(agent_slug: str, request: AgentTestRequest):
    """
    🧪 **Test Individual Agent**
    
    Test any available AI agent with pre-filled default inputs or custom inputs.
    
    **Quick Test Instructions:**
    1. Select an agent from the dropdown or enter agent slug
    2. Click "Try it out" 
    3. Use the default input or modify as needed
    4. Click "Execute" to see results
    
    **Available Agent Categories:**
    - **Discovery**: topic_discovery, domain_intelligence, historical_review, news
    - **Review**: slr, gap_synthesis, innovation_novelty
    - **Analysis**: paper_decomposition, paper_understanding
    - **Verification**: technical_verification, hallucination_detection
    - **Interaction**: interactive_chatbot
    - **Visualization**: visualization
    - **Writing**: scientific_writing, latex_generation
    - **Critique**: adversarial_critique
    - **Data**: data_scraper
    - **Assessment**: scoring
    
    **Default inputs are automatically provided for each agent!**
    """
    from agents.registry import AGENTS
    import datetime
    import traceback
    
    try:
        logger.info(f"Testing agent: {agent_slug} with task: {request.task[:50]}...")
        
        # Get agent from registry
        agent = AGENTS.get(agent_slug)
        if not agent:
            available_agents = list(AGENTS.keys())
            raise HTTPException(
                status_code=404, 
                detail=f"Agent '{agent_slug}' not found. Available agents: {available_agents}"
            )
        
        # Prepare state for agent
        state = {
            "task": request.task,
            "options": request.options,
            "_job_id": "test",
            "findings": {}
        }
        
        # Run agent in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            lambda: agent.run(state)
        )
        
        return {
            "agent": agent_slug,
            "agent_name": agent.name,
            "status": "success", 
            "input": request.task,
            "options": request.options,
            "result": result,
            "execution_time": result.get("execution_time", 0) if isinstance(result, dict) else 0,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Agent test failed: {e}")
        return {
            "agent": agent_slug,
            "status": "error",
            "input": request.task,
            "error": str(e),
            "traceback": traceback.format_exc() if logger.level <= logging.DEBUG else None,
            "timestamp": datetime.datetime.now().isoformat()
        }

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

@app.get("/", tags=["Health"])
async def root():
    """
    🏠 **Multi-Agent Research Platform API**
    
    Welcome to the Deep Research Engine! This API provides access to 18+ specialized AI agents
    for comprehensive research analysis and automation.
    
    **🚀 Quick Start Guide:**
    1. **Test Individual Agents**: Use `/agents/{agent_slug}/test` endpoints
    2. **Test Search Providers**: Use `/providers/test` endpoint  
    3. **Run Full Research**: Use `/research` endpoint
    4. **View All Agents**: Check `/agents` endpoint
    
    **🤖 Available Agent Categories:**
    - **Discovery**: Topic analysis and domain mapping
    - **Review**: Literature reviews and synthesis
    - **Analysis**: Paper decomposition and understanding
    - **Verification**: Fact-checking and validation
    - **Visualization**: Charts and diagrams
    - **Writing**: Academic writing and LaTeX
    - **Critique**: Quality assessment and bias detection
    
    **🔍 Search Providers:**
    - DuckDuckGo, Google, ArXiv, Wikipedia, OpenAlex, PubMed
    
    **Click on any endpoint below to test it immediately!**
    """
    from agents.registry import AGENTS
    active_agents = [k for k, v in AGENTS.items() if v is not None]
    
    return {
        "service": "Multi-Agent Research Platform",
        "version": "2.1.0",
        "status": "active",
        "total_agents": len(active_agents),
        "active_agents": active_agents[:10],  # Show first 10
        "search_providers": SEARCH_PROVIDERS["available"],
        "quick_test_urls": {
            "list_agents": "/agents",
            "test_topic_discovery": "/agents/topic_discovery/test",
            "test_visualization": "/agents/visualization/test", 
            "test_search_arxiv": "/providers/test?provider=arxiv",
            "test_search_duckduckgo": "/providers/test?provider=duckduckgo",
            "full_research": "/research"
        },
        "documentation": "/docs",
        "openapi_spec": "/openapi.json"
    }

@app.post("/research", dependencies=[Depends(verify_internal_key)])
async def run_research(request: ResearchRequest):
    """
    Main research endpoint - runs the full pipeline.
    Uses ThreadPoolExecutor to avoid blocking the async event loop.
    """
    from graph.full_pipeline import app as pipeline
    from utils.event_emitter import set_job_context, emit_stage_change, emit_event
    
    job_id = request.job_id or request.session_id or "unknown"
    research_id = int(job_id) if str(job_id).isdigit() else None
    workspace_id = request.workspace_id
    
    logger.info(f"[Job #{job_id}] Starting research: {request.task[:50]}...")
    if workspace_id:
        logger.info(f"[Job #{job_id}] Workspace: {workspace_id}")
    
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
        "topic_locked": False,
        "selected_topic": None,
        "topic_suggestions": [],
        "_job_id": job_id,
        "workspace_id": workspace_id,
        "session_id": request.session_id or (int(job_id) if str(job_id).isdigit() else None),
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

        # === Phase 3: Auto-embed research findings into vector store ===
        if workspace_id and result.get("findings"):
            try:
                from vectorstore.manager import add_text
                findings = result.get("findings", {})
                embedded_count = 0

                for agent_key, agent_output in findings.items():
                    if not agent_output:
                        continue
                    # Extract text content from agent output
                    text = ""
                    if isinstance(agent_output, str):
                        text = agent_output
                    elif isinstance(agent_output, dict):
                        text = agent_output.get("response", "") or agent_output.get("content", "")
                        if isinstance(text, dict):
                            text = str(text)
                    if text and len(text) > 50:
                        count = add_text(
                            workspace_id=workspace_id,
                            text=text,
                            source_url=f"research://{agent_key}",
                            source_type="research",
                            session_id=research_id,
                            metadata={"agent": agent_key},
                        )
                        embedded_count += count

                logger.info(f"[Job #{job_id}] Embedded {embedded_count} chunks into vector store")
            except ImportError:
                logger.info(f"[Job #{job_id}] chromadb not installed — skipping vector embedding")
            except Exception as e:
                logger.error(f"[Job #{job_id}] Vector embedding failed (non-fatal): {e}")

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
# Research State Management
# ============================

class StateUpdateRequest(BaseModel):
    research_id: int
    state_update: Dict[str, Any]

@app.post("/research/update-state", tags=["Research"])
async def update_research_state(request: StateUpdateRequest):
    """
    Update the state of a running research job externally.
    Used for human-in-the-loop interactions (e.g., topic selection).
    """
    try:
        from state_store import update_state as store_update
        
        rid = request.research_id
        update = request.state_update
        
        logger.info(f"[State Update] Job #{rid}: {update}")
        
        # Use new state store API (Redis-backed with fallback)
        store_update(rid, update)
        
        return {"status": "success", "updated": True}
        
    except Exception as e:
        logger.error(f"[State Update] Failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/research/{job_id}/suggestions", tags=["Research"])
async def get_topic_suggestions(job_id: int):
    """
    Get current topic suggestions for a research job.
    Used as a polling fallback when SSE delivery fails.
    """
    try:
        from state_store import get_state
        
        state = get_state(job_id)
        return {
            "topic_locked": state.get("topic_locked", False),
            "selected_topic": state.get("selected_topic"),
            "topic_suggestions": state.get("topic_suggestions", []),
        }
    except Exception as e:
        logger.error(f"[Suggestions] Failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================
# Vector Store Endpoints (Phase 3)
# ============================

class VectorSearchRequest(BaseModel):
    workspace_id: str
    query: str
    top_k: int = 10
    session_id: Optional[int] = None

class VectorIngestRequest(BaseModel):
    workspace_id: str
    text: str
    source_url: str = ""
    source_type: str = "scraped"
    session_id: Optional[int] = None

@app.post("/vectorstore/search", tags=["VectorStore"])
async def vectorstore_search(request: VectorSearchRequest):
    """
    Search workspace vector collection for similar content.
    Used by the RAG chat system and for testing retrieval.
    """
    try:
        from vectorstore.manager import similarity_search
        results = similarity_search(
            workspace_id=request.workspace_id,
            query=request.query,
            top_k=request.top_k,
            session_id=request.session_id,
        )
        return {"results": results, "count": len(results)}
    except ImportError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except Exception as e:
        logger.error(f"[VectorStore] Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vectorstore/{workspace_id}/stats", tags=["VectorStore"])
async def vectorstore_stats(workspace_id: str):
    """Get document count and stats for a workspace's vector collection."""
    try:
        from vectorstore.manager import get_collection_stats
        return get_collection_stats(workspace_id)
    except ImportError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectorstore/ingest", tags=["VectorStore"], dependencies=[Depends(verify_internal_key)])
async def vectorstore_ingest(request: VectorIngestRequest):
    """
    Manually ingest text into a workspace's vector collection.
    Chunks the text and adds it with embeddings.
    """
    try:
        from vectorstore.manager import add_text
        count = add_text(
            workspace_id=request.workspace_id,
            text=request.text,
            source_url=request.source_url,
            source_type=request.source_type,
            session_id=request.session_id,
        )
        return {"chunks_added": count}
    except ImportError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except Exception as e:
        logger.error(f"[VectorStore] Ingest failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================
# Streaming Chat Endpoint (RAG-Enhanced)
# ============================

def _build_rag_context(findings: dict) -> str:
    """
    Build a structured research context string from findings for RAG-style chat.
    Extracts the full report, literature, sources, and key sections so the LLM
    can answer questions with specific references.
    """
    sections = []

    # 1. Full report text (most important for Q&A)
    msr = findings.get("multi_stage_report", {})
    report_text = msr.get("markdown_report") or msr.get("response") or ""
    if not report_text:
        sw = findings.get("scientific_writing", {})
        report_text = sw.get("markdown_report") or sw.get("response") or ""
    if report_text:
        sections.append(f"=== FULL RESEARCH REPORT ===\n{report_text[:12000]}")

    # 2. Literature review and papers found
    lit = findings.get("literature_review", {})
    lit_resp = lit.get("response") if isinstance(lit, dict) else None
    if lit_resp:
        if isinstance(lit_resp, dict) and "papers" in lit_resp:
            papers_text = []
            for i, p in enumerate(lit_resp["papers"][:15], 1):
                papers_text.append(
                    f"[{i}] {p.get('title', 'Untitled')} — {p.get('authors', 'Unknown')} "
                    f"({p.get('published', 'N/A')})\n    URL: {p.get('url', 'N/A')}\n    "
                    f"Summary: {(p.get('abstract') or p.get('summary', ''))[:200]}"
                )
            sections.append(f"=== LITERATURE ({len(lit_resp['papers'])} papers) ===\n" + "\n".join(papers_text))
        elif isinstance(lit_resp, str):
            sections.append(f"=== LITERATURE REVIEW ===\n{lit_resp[:3000]}")

    # 3. News / web sources
    for key in ["google_news", "news"]:
        news = findings.get(key, {})
        news_resp = news.get("response") if isinstance(news, dict) else None
        if news_resp and isinstance(news_resp, dict) and "results" in news_resp:
            news_items = []
            for i, n in enumerate(news_resp["results"][:10], 1):
                news_items.append(f"[N{i}] {n.get('title', '')} — {n.get('url', '')}")
            if news_items:
                sections.append(f"=== NEWS SOURCES ===\n" + "\n".join(news_items))
            break

    # 4. Gap synthesis / novelty
    for key in ["gap_synthesis", "innovation_novelty", "scoring"]:
        data = findings.get(key, {})
        resp = data.get("response") if isinstance(data, dict) else None
        if resp:
            text = resp if isinstance(resp, str) else str(resp)[:2000]
            heading = key.replace("_", " ").title()
            sections.append(f"=== {heading.upper()} ===\n{text[:2000]}")

    # 5. Web scraper sources
    ws = findings.get("web_scraper", {})
    ws_resp = ws.get("response") if isinstance(ws, dict) else None
    if ws_resp and isinstance(ws_resp, dict):
        src_list = ws_resp.get("sources", [])
        if src_list:
            sections.append(f"=== WEB SOURCES ({len(src_list)}) ===\n" + "\n".join(str(s) for s in src_list[:20]))

    if not sections:
        # Fallback: dump first 8000 chars of raw findings
        raw = str(findings)[:8000]
        sections.append(f"=== RAW FINDINGS ===\n{raw}")

    return "\n\n".join(sections)


@app.post("/agent/interactive_chatbot/stream", tags=["Agents"])
async def stream_chatbot(request: ResearchRequest):
    """
    RAG-enhanced streaming chatbot.
    Builds structured context from research findings so the LLM can answer
    with specific references and section pointers.
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
        """Generate RAG-enhanced streaming response from agent."""
        try:
            from config import MODEL_WRITING
            from llm.factory import get_llm_provider

            # Use the provider factory — handles OFFLINE/ONLINE mode,
            # key rotation, and fallback automatically.
            provider = get_llm_provider(MODEL_WRITING)
            llm = provider.get_langchain_llm()

            # Build RAG context from findings
            findings = state.get("findings", {})
            # Handle nested final_state structure
            if "final_state" in findings and "findings" in findings["final_state"]:
                rag_context = _build_rag_context(findings["final_state"]["findings"])
            else:
                rag_context = _build_rag_context(findings)

            # Enhanced system prompt for RAG-style Q&A with reference support
            system_prompt = """You are a Research Paper Assistant with RAG (Retrieval-Augmented Generation) capabilities.
You have access to the COMPLETE research document, literature sources, and data gathered by the multi-agent research pipeline.

YOUR CAPABILITIES:
1. Answer questions about ANY section of the research paper
2. Cite specific sources with [Source N] references when available
3. Explain methodology, findings, gaps, and conclusions
4. Compare findings across different sources in the literature
5. Suggest further research directions based on identified gaps

RESPONSE FORMAT RULES:
- When referencing a specific section, use **bold section names** like **Literature Review** or **Gap Analysis**
- When citing a paper, use the format: [Author, Year](url) or [Source N] with the reference number
- When quoting from the report, use > blockquote formatting
- Structure longer answers with clear headings using ## or ###
- For numerical data or comparisons, use markdown tables
- If the user asks about something NOT in the research, clearly state that and offer to discuss what IS covered

REFERENCE HIGHLIGHTING:
- Always include source citations when answering factual questions
- Use inline references like [[1]](url), [[2]](url) linking to the actual paper URLs
- At the end of detailed answers, include a "References" section listing cited sources"""

            # Check global state for topic status
            from state_store import RESEARCH_STATES
            job_id_int = int(state["_job_id"]) if str(state["_job_id"]).isdigit() else None
            
            topic_context = ""
            if job_id_int and job_id_int in RESEARCH_STATES:
                job_state = RESEARCH_STATES[job_id_int]
                if not job_state.get("topic_locked"):
                    suggestions = job_state.get("topic_suggestions", [])
                    topic_context = f"\n\n[SYSTEM UPDATE]: The user is currently in the TOPIC DISCOVERY phase. Research has NOT started yet.\nThe user has been offered the following topic suggestions:\n{suggestions}\n\nYOUR TASK: Help the user select one of these topics or refine their original query. Do NOT ask for a paper PDF yet. Focus on freezing the research title."

            from langchain_core.messages import SystemMessage, HumanMessage
            messages = [
                SystemMessage(content=system_prompt + "\n\n" + rag_context + topic_context),
                HumanMessage(content=state["task"])
            ]

            # Stream chunks
            import json
            for chunk in llm.stream(messages):
                content = chunk.content if hasattr(chunk, 'content') else str(chunk)
                if content:
                    payload = json.dumps({"text": content})
                    yield f"data: {payload}\n\n"

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

# Dynamic Agent Endpoints with Default Inputs
from agents.registry import AGENTS

# Create individual endpoints for each agent with default inputs
for agent_slug, agent_instance in AGENTS.items():
    if not agent_instance:
        continue
        
    # Default inputs for each agent
    default_inputs = {
        "topic_discovery": "artificial intelligence in healthcare",
        "domain_intelligence": "quantum computing applications", 
        "historical_review": "neural networks development",
        "slr": "transformer architecture papers",
        "gap_synthesis": "computer vision limitations",
        "innovation_novelty": "sustainable AI computing",
        "paper_decomposition": "https://arxiv.org/abs/1706.03762",
        "paper_understanding": "Attention mechanism in transformers",
        "technical_verification": "BERT achieves 95% accuracy on GLUE benchmark",
        "interactive_chatbot": "Explain the attention mechanism in simple terms",
        "visualization": "GPU performance: RTX 4090: 100 TFLOPS, RTX 4080: 80 TFLOPS, RTX 4070: 60 TFLOPS",
        "scientific_writing": "Write introduction for machine learning survey",
        "latex_generation": "Generate LaTeX table for experimental results",
        "adversarial_critique": "AI will replace all human jobs within 5 years",
        "hallucination_detection": "GPT-4 has 1 trillion parameters and was trained on 100TB of data",
        "data_scraper": "https://arxiv.org/abs/2023.12345",
        "news": "recent AI breakthroughs 2024",
        "scoring": "evaluate research methodology quality"
    }
    
    def make_handler(agent=agent_instance, slug=agent_slug):
        async def handler(request: ResearchRequest):
            job_id = request.job_id or "test"
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

    # Create endpoint with default input in schema
    default_input = default_inputs.get(agent_slug, "test input")
    
    # Create a custom request model for this agent
    class AgentSpecificRequest(BaseModel):
        task: str = default_input
        paper_url: Optional[str] = None
        depth: str = "deep"
        findings: Optional[Dict[str, Any]] = None
        job_id: Optional[int] = None
        
        model_config = {
            "json_schema_extra": {
                "examples": [{
                    "task": default_input,
                    "depth": "deep"
                }]
            }
        }
    
    # Add the endpoint
    endpoint_func = make_handler()
    endpoint_func.__annotations__['request'] = AgentSpecificRequest
    
    app.post(
        f"/agent/{agent_slug}", 
        tags=["Agents"],
        summary=f"🤖 {agent_instance.name}",
        description=f"Test the {agent_instance.name} agent with default input: '{default_input}'. Click 'Try it out' to test immediately!"
    )(endpoint_func)

def main():
    """Main entry point for console script"""
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
