"""
Full Research Pipeline with LangGraph

AGENT ORDERING CONSTRAINTS (from prompt.json):
==============================================
Scraper -> Verifier -> Writer -> Editor -> QA -> Compiler

Critical Rules:
- Editor is the ONLY agent allowed to modify LaTeX
- NO parallel LaTeX writes (use document locking)
- All LaTeX edits MUST be diff-based
- Pipeline A: domain_intelligence -> [historical_review, slr, news] -> gap_synthesis -> innovation
- Pipeline B: paper_decomposition -> understanding -> technical_verification -> critique
- Both converge to: visualization -> scoring -> multi_stage_report
"""

from typing import TypedDict, Dict, Any, List, Optional, Annotated
from langgraph.graph import StateGraph, END
import logging
import os
import operator

logger = logging.getLogger("ai_engine.pipeline")


def merge_dicts(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
    return {**a, **b}


class ResearchState(TypedDict):
    task: str
    paper_url: Optional[str]
    next_step: Optional[str]
    workspace_id: Optional[str]
    session_id: Optional[int]
    topic_locked: bool
    selected_topic: Optional[str]
    topic_suggestions: Optional[List[Dict[str, Any]]]
    research_summary: Optional[str]
    findings: Annotated[Dict[str, Any], merge_dicts]
    failed_agents: Annotated[Dict[str, Any], merge_dicts]
    history: Annotated[List[str], operator.add]
    _job_id: Optional[str]


from agents.registry import AGENTS


async def run_agent(agent_key: str, state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run an agent, validate its contract, and return structured state updates.
    Critical agent failures are surfaced to the pipeline instead of being hidden.
    """
    agent = AGENTS.get(agent_key)
    job_id = state.get("_job_id", "?")

    from utils.event_emitter import emit_error

    if not agent:
        message = f"Agent not found: {agent_key}"
        try:
            emit_error(message, research_id=int(job_id) if str(job_id).isdigit() else None)
        except Exception:
            pass
        logger.error(f"[Job #{job_id}] {message}")
        return {"history": [message], "failed_agents": {agent_key: message}}

    research_id = int(job_id) if str(job_id).isdigit() else None
    critical_agents = {"topic_discovery", "topic_lock", "orchestrator", "multi_stage_report"}

    def validate_result(result: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(result, dict):
            raise TypeError(f"Agent {agent_key} returned non-dict result")
        if result.get("error"):
            raise RuntimeError(str(result["error"]))

        response = result.get("response", {})
        if agent_key == "slr" and isinstance(response, dict) and not response.get("title"):
            raise ValueError("Invalid agent output: title is required for SLR")
        if agent_key == "multi_stage_report":
            if not isinstance(response, dict) or not response.get("markdown_report"):
                raise ValueError("Invalid report output: markdown_report is required")
        return result

    try:
        logger.info(f"[Job #{job_id}] Running agent: {agent_key} (Async)")
        start_time = __import__("time").time()

        arun = getattr(agent, "arun", None)
        if not callable(arun):
            raise TypeError(f"{agent.__class__.__name__} has no attribute 'arun'")

        result = validate_result(await arun(state))
        elapsed = __import__("time").time() - start_time

        findings_update = {}
        if "response" in result:
            findings_update[agent_key] = result.get("response")
        else:
            findings_update[agent_key] = result

        exec_time = result.get("execution_time", 0) if isinstance(result, dict) else elapsed
        history_update = [f"{agent.name}: Completed ({exec_time:.1f}s)"]

        payload = {"findings": findings_update, "history": history_update, "failed_agents": {}}
        if isinstance(result, dict):
            payload.update(result)
        return payload
    except Exception as e:
        logger.error(f"[Job #{job_id}] Agent {agent_key} failed: {e}")
        error_msg = str(e)
        emit_error(error_msg, research_id=research_id)

        history_update = [f"{agent.name}: FAILED - {type(e).__name__}"]
        failure_payload = {"history": history_update, "failed_agents": {agent_key: error_msg}}
        if agent_key in critical_agents:
            raise RuntimeError(f"Critical agent '{agent_key}' failed: {error_msg}") from e
        return failure_payload


async def topic_discovery_node(state: ResearchState) -> ResearchState:
    result = await run_agent("topic_discovery", state)
    response = result.get("response", {}) if isinstance(result.get("response"), dict) else {}
    return {
        "topic_suggestions": result.get("topic_suggestions", response.get("topic_suggestions", [])),
        "topic_locked": result.get("topic_locked", response.get("topic_locked", False)),
        "selected_topic": result.get("selected_topic", response.get("selected_topic")),
        **result,
    }


async def topic_lock_node(state: ResearchState) -> ResearchState:
    result = await run_agent("topic_lock", state)
    response = result.get("response", {}) if isinstance(result.get("response"), dict) else {}
    return {
        "topic_locked": result.get("topic_locked", response.get("topic_locked", False)),
        "selected_topic": result.get("selected_topic", response.get("selected_topic")),
        **result,
    }


async def orchestrator_node(state: ResearchState) -> ResearchState:
    result = await run_agent("orchestrator", state)
    response = result.get("response", {}) if isinstance(result.get("response"), dict) else {}
    next_step = response.get("next_step") if isinstance(response, dict) else None
    return {**result, "next_step": next_step}


async def domain_node(state): return await run_agent("domain_intelligence", state)
async def historical_node(state): return await run_agent("historical_review", state)
async def slr_node(state): return await run_agent("slr", state)
async def news_node(state): return await run_agent("news", state)
async def gap_node(state): return await run_agent("gap_synthesis", state)
async def innovation_node(state): return await run_agent("innovation_novelty", state)

async def decomp_node(state): return await run_agent("paper_decomposition", state)
async def understanding_node(state): return await run_agent("paper_understanding", state)
async def verify_node(state): return await run_agent("technical_verification", state)
async def critique_node(state): return await run_agent("hallucination_detection", state)

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
    logger.error(f"[Job #{job_id}] Failed to acquire document lock for multi_stage_report")
    raise RuntimeError("MultiStageReport: Could not acquire document lock")


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
    logger.error(f"[Job #{job_id}] Failed to acquire document lock for latex_generation")
    raise RuntimeError("LaTeXGeneration: Could not acquire document lock")


workflow = StateGraph(ResearchState)
workflow.add_node("topic_discovery", topic_discovery_node)
workflow.add_node("topic_lock", topic_lock_node)
workflow.add_node("orchestrator", orchestrator_node)
workflow.add_node("domain_intelligence", domain_node)
workflow.add_node("historical_review", historical_node)
workflow.add_node("slr", slr_node)
workflow.add_node("news", news_node)
workflow.add_node("gap_synthesis", gap_node)
workflow.add_node("innovation", innovation_node)
workflow.add_node("paper_decomposition", decomp_node)
workflow.add_node("understanding", understanding_node)
workflow.add_node("technical_verification", verify_node)
workflow.add_node("critique", critique_node)
workflow.add_node("visualization", visualization_node)
workflow.add_node("scoring", scoring_node)
workflow.add_node("multi_stage_report", multi_stage_report_node)
workflow.add_node("writing", write_node)
workflow.add_node("latex", latex_node)
workflow.set_entry_point("topic_discovery")
workflow.add_edge("topic_discovery", "topic_lock")


def topic_gate(state):
    if state.get("topic_locked"):
        return "orchestrator"
    return END


workflow.add_conditional_edges("topic_lock", topic_gate, {
    "orchestrator": "orchestrator",
    "topic_discovery": "topic_discovery",
    END: END,
})


def route_strategy(state):
    step = state.get("next_step")
    if step == "paper_analysis":
        return "paper_decomposition"
    return "domain_intelligence"


workflow.add_conditional_edges("orchestrator", route_strategy, {
    "paper_decomposition": "paper_decomposition",
    "domain_intelligence": "domain_intelligence",
})

workflow.add_edge("domain_intelligence", "historical_review")
workflow.add_edge("domain_intelligence", "slr")
workflow.add_edge("domain_intelligence", "news")
workflow.add_edge("historical_review", "gap_synthesis")
workflow.add_edge("slr", "gap_synthesis")
workflow.add_edge("news", "gap_synthesis")
workflow.add_edge("gap_synthesis", "innovation")
workflow.add_edge("paper_decomposition", "understanding")
workflow.add_edge("understanding", "technical_verification")
workflow.add_edge("technical_verification", "critique")
workflow.add_edge("innovation", "visualization")
workflow.add_edge("critique", "visualization")
workflow.add_edge("visualization", "scoring")
workflow.add_edge("scoring", "multi_stage_report")
workflow.add_edge("multi_stage_report", END)

try:
    import sqlite3
    from langgraph.checkpoint.sqlite import SqliteSaver

    checkpoint_dir = os.path.join(os.path.dirname(__file__), "..", "data", "checkpoints")
    os.makedirs(checkpoint_dir, exist_ok=True)
    checkpoint_path = os.path.join(checkpoint_dir, "pipeline_checkpoints.db")

    sqlite_conn = sqlite3.connect(checkpoint_path, check_same_thread=False)
    checkpointer = SqliteSaver(sqlite_conn)
    app = workflow.compile(checkpointer=checkpointer)
    logger.info(f"[Pipeline] Compiled with checkpointing: {checkpoint_path}")
except ImportError:
    app = workflow.compile()
    logger.warning("[Pipeline] Compiled WITHOUT checkpointing (langgraph.checkpoint not available)")
except Exception as e:
    app = workflow.compile()
    logger.warning(f"[Pipeline] Checkpointing failed, running without: {e}")
