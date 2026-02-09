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

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from config import SEARCH_PROVIDERS

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

app = FastAPI(
    title="Deep Research Engine API",
    description="""
    🔬 **Multi-Agent Research Platform** 

    This API provides access to specialized AI agents for comprehensive research analysis.
    Each agent can be tested individually with custom inputs through the `/agents/{agent_slug}/test` endpoints.

    ## Features
    - 🕵️ **Individual Agent Testing**: Test each research agent separately
    - 🔍 **Provider Configuration**: Configure and test search providers
    - 📊 **Real-time Processing**: Stream research progress and results
    - 🎯 **Specialized Agents**: Discovery, Scraping, Synthesis, Critique, Visualization, Verification

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

@app.get("/health", tags=["Health"])
async def health_check():
    """
    🟢 **Health Check**
    
    Returns the current status of the AI Engine service.
    Use this endpoint to verify the service is running and operational.
    """
    return {"status": "ok", "service": "ai_engine", "version": "2.1.0"}

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