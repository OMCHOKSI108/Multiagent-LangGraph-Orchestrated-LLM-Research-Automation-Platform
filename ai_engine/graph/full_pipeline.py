"""
Full Research Pipeline with LangGraph

AGENT ORDERING CONSTRAINTS (from prompt.json):
==============================================
Scraper → Verifier → Writer → Editor → QA → Compiler

Critical Rules:
- Editor is the ONLY agent allowed to modify LaTeX
- NO parallel LaTeX writes (use document locking)
- All LaTeX edits MUST be diff-based
- Pipeline A: domain_intelligence → [historical_review, slr, news] → gap_synthesis → innovation
- Pipeline B: paper_decomposition → understanding → technical_verification → critique
- Both converge to: visualization → scoring → multi_stage_report
"""

from typing import TypedDict, Dict, Any, List, Optional, Annotated
from langgraph.graph import StateGraph, END
import logging
import os
import operator

logger = logging.getLogger("ai_engine.pipeline")

# ============================
# State Reducers
# ============================
def merge_dicts(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
    return {**a, **b}

# ============================
# State Definition
# ============================
class ResearchState(TypedDict):
    task: str
    paper_url: Optional[str]
    next_step: Optional[str]
    
    # Workspace & Session Isolation (Phase 2)
    workspace_id: Optional[str]   # UUID of the workspace
    session_id: Optional[int]     # research_sessions.id
    
    # PHASE 0: Topic Lock Gate (from prompt.json enhanced rules)
    topic_locked: bool  # Must be True before research proceeds
    selected_topic: Optional[str]  # User's chosen research title
    topic_suggestions: Optional[List[Dict[str, Any]]]  # Generated title options
    
    # Shared Memory with Reducers for Parallel Execution
    research_summary: Optional[str]
    findings: Annotated[Dict[str, Any], merge_dicts]
    
    # Logs & Tracing
    history: Annotated[List[str], operator.add]
    _job_id: Optional[str]  # For correlation


# Import agents from registry (already instantiated)
from agents.registry import AGENTS

# ============================
# Node Functions
# ============================
# ============================
# Node Functions (Async)
# ============================
async def run_agent(agent_key: str, state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Helper to run an agent and update state asynchronously.
    """
    agent = AGENTS.get(agent_key)
    job_id = state.get("_job_id", "?")
    
    from utils.event_emitter import emit_error

    if not agent:
        try:
            emit_error(f"Agent not found: {agent_key}", research_id=int(job_id) if str(job_id).isdigit() else None)
        except:
            pass
        logger.error(f"[Job #{job_id}] Agent not found: {agent_key}")
        return state
    
    research_id = int(job_id) if str(job_id).isdigit() else None
    
    try:
        logger.info(f"[Job #{job_id}] Running agent: {agent_key} (Async)")
        
        start_time = __import__("time").time()
        # USE ASYNC RUN (BaseAgent.arun handles self.run in executor)
        result = await agent.arun(state)
        elapsed = __import__("time").time() - start_time
        
        findings_update = {}
        if isinstance(result, dict) and "response" in result:
            findings_update[agent_key] = result.get("response")
        else:
             findings_update[agent_key] = result
        
        exec_time = result.get("execution_time", 0) if isinstance(result, dict) else elapsed
        history_update = [f"{agent.name}: Completed ({exec_time:.1f}s)"]
        
        if isinstance(result, dict):
             return {**result, "findings": findings_update, "history": history_update}
        else:
             return {"findings": findings_update, "history": history_update}
        
    except Exception as e:
        logger.error(f"[Job #{job_id}] Agent {agent_key} failed: {e}")
        error_msg = str(e)
        emit_error(error_msg, research_id=research_id)
        
        history_update = [f"{agent.name}: FAILED - {type(e).__name__}"]
        return {"history": history_update}


# ============================
# PHASE 0: Topic Discovery Node (Async)
# ============================
async def topic_discovery_node(state: ResearchState) -> ResearchState:
    result = await run_agent("topic_discovery", state)
    return {
        "topic_suggestions": result.get("topic_suggestions", []),
        "topic_locked": result.get("topic_locked", False),
        **result
    }

async def topic_lock_node(state: ResearchState) -> ResearchState:
    result = await run_agent("topic_lock", state)
    return {
        "topic_locked": result.get("topic_locked", False),
        "selected_topic": result.get("selected_topic"),
        **result
    }

# Orchestrator (Async)
async def orchestrator_node(state: ResearchState) -> ResearchState:
    result = await AGENTS["orchestrator"].arun(state)
    response = result.get("response", {})
    next_step = response.get("next_step") if isinstance(response, dict) else None
    return {"next_step": next_step}

# Pipeline A Nodes (Async)
async def domain_node(state): return await run_agent("domain_intelligence", state)
async def historical_node(state): return await run_agent("historical_review", state)
async def slr_node(state): return await run_agent("slr", state)
async def news_node(state): return await run_agent("news", state)
async def gap_node(state): return await run_agent("gap_synthesis", state)
async def innovation_node(state): return await run_agent("innovation_novelty", state)

# Pipeline B Nodes (Async)
async def decomp_node(state): return await run_agent("paper_decomposition", state)
async def understanding_node(state): return await run_agent("paper_understanding", state)
async def verify_node(state): return await run_agent("technical_verification", state)
async def critique_node(state): return await run_agent("hallucination_detection", state)

# Shared Nodes (Async)
async def visualization_node(state): return await run_agent("visualization", state)

async def multi_stage_report_node(state):
    from utils.document_lock import document_lock
    job_id = state.get("_job_id", "default")
    if document_lock.acquire(job_id, owner="multi_stage_report", timeout=60):
        try:
            result = await run_agent("multi_stage_report", state)
            document_lock.increment_version(job_id)
            return result
        finally:
            document_lock.release(job_id, owner="multi_stage_report")
    else:
        logger.error(f"[Job #{job_id}] Failed to acquire document lock for multi_stage_report")
        return {"history": ["MultiStageReport: FAILED - Could not acquire document lock"]}

async def scoring_node(state): return await run_agent("scoring", state)
async def write_node(state): return await run_agent("scientific_writing", state)

async def latex_node(state):
    from utils.document_lock import document_lock
    job_id = state.get("_job_id", "default")
    if document_lock.acquire(job_id, owner="latex_generation", timeout=60):
        try:
            result = await run_agent("latex_generation", state)
            document_lock.increment_version(job_id)
            return result
        finally:
            document_lock.release(job_id, owner="latex_generation")
    else:
        logger.error(f"[Job #{job_id}] Failed to acquire document lock for latex_generation")
        return {"history": ["LaTeXGeneration: FAILED - Could not acquire document lock"]}


# ============================
# Graph Construction
# ============================
workflow = StateGraph(ResearchState)

# PHASE 0: Topic Discovery Gate
workflow.add_node("topic_discovery", topic_discovery_node)
workflow.add_node("topic_lock", topic_lock_node)

# Add Nodes
workflow.add_node("orchestrator", orchestrator_node)

# Pipeline A
workflow.add_node("domain_intelligence", domain_node)
workflow.add_node("historical_review", historical_node)
workflow.add_node("slr", slr_node)
workflow.add_node("news", news_node) # New
workflow.add_node("gap_synthesis", gap_node)
workflow.add_node("innovation", innovation_node)

# Pipeline B
workflow.add_node("paper_decomposition", decomp_node)
workflow.add_node("understanding", understanding_node)
workflow.add_node("technical_verification", verify_node)
workflow.add_node("critique", critique_node)

# Output
workflow.add_node("visualization", visualization_node)
workflow.add_node("scoring", scoring_node)
workflow.add_node("multi_stage_report", multi_stage_report_node)

# Keep legacy nodes for backwards compatibility (not used in main flow)
workflow.add_node("writing", write_node)
workflow.add_node("latex", latex_node)

# Routing Logic
# PHASE 0: Topic Discovery is the entry point
workflow.set_entry_point("topic_discovery")

# Topic Discovery → User selects topic → Topic Lock
workflow.add_edge("topic_discovery", "topic_lock")

def topic_gate(state):
    """
    PHASE 0 Gate: Check if topic is locked.
    NO agent proceeds until topic_locked = True.
    """
    if state.get("topic_locked"):
        return "orchestrator"
    else:
        # Topic not locked - END the graph and wait for user selection
        return END

workflow.add_conditional_edges("topic_lock", topic_gate, {
    "orchestrator": "orchestrator",
    "topic_discovery": "topic_discovery",
    END: END
})

def route_strategy(state):
    """Route based on orchestrator decision."""
    step = state.get("next_step")
    if step == "paper_analysis":
        return "paper_decomposition"
    else:
        return "domain_intelligence"

workflow.add_conditional_edges("orchestrator", route_strategy, {
    "paper_decomposition": "paper_decomposition",
    "domain_intelligence": "domain_intelligence"
})

# Pipeline A Flow (Parallelized)
workflow.add_edge("domain_intelligence", "historical_review")
workflow.add_edge("domain_intelligence", "slr")
workflow.add_edge("domain_intelligence", "news")

# All three converge to gap_synthesis
workflow.add_edge("historical_review", "gap_synthesis")
workflow.add_edge("slr", "gap_synthesis")
workflow.add_edge("news", "gap_synthesis")

workflow.add_edge("gap_synthesis", "innovation")

# Pipeline B Flow
workflow.add_edge("paper_decomposition", "understanding")
workflow.add_edge("understanding", "technical_verification")
workflow.add_edge("technical_verification", "critique")

# Both pipelines converge to visualization
workflow.add_edge("innovation", "visualization")
workflow.add_edge("critique", "visualization")

# Visualization -> Scoring -> MultiStageReport
workflow.add_edge("visualization", "scoring")
workflow.add_edge("scoring", "multi_stage_report")
workflow.add_edge("multi_stage_report", END)

# ============================
# Compile with Checkpointing (if available)
# ============================
try:
    from langgraph.checkpoint.sqlite import SqliteSaver
    
    # Create checkpoints directory
    checkpoint_dir = os.path.join(os.path.dirname(__file__), "..", "data", "checkpoints")
    os.makedirs(checkpoint_dir, exist_ok=True)
    checkpoint_path = os.path.join(checkpoint_dir, "pipeline_checkpoints.db")
    
    checkpointer = SqliteSaver.from_conn_string(checkpoint_path)
    app = workflow.compile(checkpointer=checkpointer)
    logger.info(f"[Pipeline] Compiled with checkpointing: {checkpoint_path}")
    
except ImportError:
    # Fallback without checkpointing
    app = workflow.compile()
    logger.warning("[Pipeline] Compiled WITHOUT checkpointing (langgraph.checkpoint not available)")
except Exception as e:
    app = workflow.compile()
    logger.warning(f"[Pipeline] Checkpointing failed, running without: {e}")
