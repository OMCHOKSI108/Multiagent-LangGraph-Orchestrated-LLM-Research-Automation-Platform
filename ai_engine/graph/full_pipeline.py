from typing import TypedDict, Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
import logging
import os

logger = logging.getLogger("ai_engine.pipeline")

# ============================
# State Definition
# ============================
class ResearchState(TypedDict):
    task: str
    paper_url: Optional[str]
    next_step: Optional[str]
    
    # Shared Memory
    research_summary: Optional[str]
    findings: Dict[str, Any]
    
    # Logs & Tracing
    history: List[str]
    _job_id: Optional[str]  # For correlation


# Import agents from registry (already instantiated)
from agents.registry import AGENTS

# ============================
# Node Functions
# ============================
def run_agent(agent_key: str, state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Helper to run an agent and update state.
    Includes error handling and logging.
    """
    agent = AGENTS.get(agent_key)
    job_id = state.get("_job_id", "?")
    
    if not agent:
        logger.error(f"[Job #{job_id}] Agent not found: {agent_key}")
        return state
    
    try:
        logger.info(f"[Job #{job_id}] Running agent: {agent_key}")
        result = agent.run(state)
        
        # Store result in findings
        new_findings = state.get("findings", {}).copy()
        new_findings[agent_key] = result.get("response")
        
        # Update history
        history = list(state.get("history", []))
        exec_time = result.get("execution_time", 0)
        history.append(f"{agent.name}: Completed ({exec_time:.1f}s)")
        
        return {**state, "findings": new_findings, "history": history}
        
    except Exception as e:
        logger.error(f"[Job #{job_id}] Agent {agent_key} failed: {e}")
        history = list(state.get("history", []))
        history.append(f"{agent.name}: FAILED - {str(e)}")
        return {**state, "history": history}


# Orchestrator
def orchestrator_node(state: ResearchState) -> ResearchState:
    result = AGENTS["orchestrator"].run(state)
    # Extract next_step from orchestrator response
    response = result.get("response", {})
    next_step = response.get("next_step") if isinstance(response, dict) else None
    return {**state, "next_step": next_step}

# Pipeline A Nodes
def domain_node(state): return run_agent("domain_intelligence", state)
def historical_node(state): return run_agent("historical_review", state)
def slr_node(state): return run_agent("slr", state)
def gap_node(state): return run_agent("gap_synthesis", state)
def innovation_node(state): return run_agent("innovation_novelty", state)

# Pipeline B Nodes
def decomp_node(state): return run_agent("paper_decomposition", state)
def understanding_node(state): return run_agent("paper_understanding", state)
def verify_node(state): return run_agent("technical_verification", state)
def critique_node(state): return run_agent("reviewer_style_critique", state)

# Shared Nodes
def visualization_node(state): return run_agent("visualization", state)
def multi_stage_report_node(state): return run_agent("multi_stage_report", state)

# Legacy nodes (kept for compatibility)
def write_node(state): return run_agent("scientific_writing", state)
def latex_node(state): return run_agent("latex_generation", state)


# ============================
# Graph Construction
# ============================
workflow = StateGraph(ResearchState)

# Add Nodes
workflow.add_node("orchestrator", orchestrator_node)

# Pipeline A
workflow.add_node("domain_intelligence", domain_node)
workflow.add_node("historical_review", historical_node)
workflow.add_node("slr", slr_node)
workflow.add_node("gap_synthesis", gap_node)
workflow.add_node("innovation", innovation_node)

# Pipeline B
workflow.add_node("paper_decomposition", decomp_node)
workflow.add_node("understanding", understanding_node)
workflow.add_node("technical_verification", verify_node)
workflow.add_node("critique", critique_node)

# Output
workflow.add_node("visualization", visualization_node)
workflow.add_node("multi_stage_report", multi_stage_report_node)

# Keep legacy nodes for backwards compatibility (not used in main flow)
workflow.add_node("writing", write_node)
workflow.add_node("latex", latex_node)

# Routing Logic
workflow.set_entry_point("orchestrator")

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

# Pipeline A Flow
workflow.add_edge("domain_intelligence", "historical_review")
workflow.add_edge("historical_review", "slr")
workflow.add_edge("slr", "gap_synthesis")
workflow.add_edge("gap_synthesis", "innovation")

# Pipeline B Flow
workflow.add_edge("paper_decomposition", "understanding")
workflow.add_edge("understanding", "technical_verification")
workflow.add_edge("technical_verification", "critique")

# Both pipelines converge to visualization
workflow.add_edge("innovation", "visualization")
workflow.add_edge("critique", "visualization")

# Final output - now uses multi-stage report generation
workflow.add_edge("visualization", "multi_stage_report")
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
