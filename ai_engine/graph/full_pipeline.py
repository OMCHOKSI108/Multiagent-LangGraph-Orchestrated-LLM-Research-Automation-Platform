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
    depth: str
    _job_id: Optional[str]
    # 🧠 Brain context — accumulates across all 3 brain invocations
    brain_context: Annotated[Dict[str, Any], merge_dicts]


from agents.registry import AGENTS


async def run_agent(agent_key: str, state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run an agent, validate its contract, and return structured state updates.
    Critical agent failures are surfaced to the pipeline instead of being hidden.
    """
    from state_store import get_state

    agent = AGENTS.get(agent_key)
    job_id = state.get("_job_id", "?")
    research_id = int(job_id) if str(job_id).isdigit() else None

    from ai_engine.utils.event_emitter import emit_error, emit_stage_change

    stage_by_agent = {
        "topic_discovery": "searching",
        "topic_lock": "searching",
        "orchestrator": "planning",
        "domain_intelligence": "gathering_papers",
        "slr": "gathering_surveys",
        "news": "gathering_data",
        "historical_review": "gathering_data",
        "image_intelligence": "gathering_data",
        "gap_synthesis": "synthesizing",
        "innovation_novelty": "synthesizing",
        "paper_decomposition": "analyzing",
        "paper_understanding": "analyzing",
        "technical_verification": "verifying",
        "hallucination_detection": "verifying",
        "visualization": "visualizing",
        "scoring": "scoring",
        "central_brain": "planning",
        "scientific_writing": "writing",
        "multi_stage_report": "writing",
        "latex_generation": "finalizing",
    }

    # Check for cancellation before running
    if research_id:
        current_state = get_state(research_id)
        if current_state.get("cancelled"):
            logger.info(f"[Job #{job_id}] Research cancelled, stopping pipeline")
            return {
                "history": [f"Cancelled by user"],
                "failed_agents": {"cancelled": "Research cancelled by user"},
            }

    if not agent:
        message = f"Agent not found: {agent_key}"
        try:
            emit_error(message, research_id=research_id)
        except Exception:
            pass
        logger.error(f"[Job #{job_id}] {message}")
        return {"history": [message], "failed_agents": {agent_key: message}}

    critical_agents = {
        "topic_discovery",
        "topic_lock",
        "orchestrator",
        "multi_stage_report",
    }

    def validate_result(result: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(result, dict):
            raise TypeError(f"Agent {agent_key} returned non-dict result")
        if result.get("error"):
            raise RuntimeError(str(result["error"]))

        response = result.get("response", {})
        if (
            agent_key == "slr"
            and isinstance(response, dict)
            and not response.get("title")
        ):
            raise ValueError("Invalid agent output: title is required for SLR")
        if agent_key == "multi_stage_report":
            if not isinstance(response, dict) or not response.get("markdown_report"):
                raise ValueError("Invalid report output: markdown_report is required")
        return result

    try:
        stage_name = stage_by_agent.get(agent_key)
        if stage_name:
            emit_stage_change(stage_name, research_id=research_id)

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

        exec_time = (
            result.get("execution_time", 0) if isinstance(result, dict) else elapsed
        )
        history_update = [f"{agent.name}: Completed ({exec_time:.1f}s)"]

        payload = {
            "findings": findings_update,
            "history": history_update,
            "failed_agents": {},
        }
        if isinstance(result, dict):
            payload.update(result)
        return payload
    except Exception as e:
        logger.error(f"[Job #{job_id}] Agent {agent_key} failed: {e}")
        error_msg = str(e)
        emit_error(error_msg, research_id=research_id)

        history_update = [f"{agent.name}: FAILED - {type(e).__name__}"]
        failure_payload = {
            "history": history_update,
            "failed_agents": {agent_key: error_msg},
        }
        if agent_key in critical_agents:
            raise RuntimeError(
                f"Critical agent '{agent_key}' failed: {error_msg}"
            ) from e
        return failure_payload


async def topic_discovery_node(state: ResearchState) -> ResearchState:
    result = await run_agent("topic_discovery", state)
    response = (
        result.get("response", {}) if isinstance(result.get("response"), dict) else {}
    )
    return {
        "topic_suggestions": result.get(
            "topic_suggestions", response.get("topic_suggestions", [])
        ),
        "topic_locked": result.get("topic_locked", response.get("topic_locked", False)),
        "selected_topic": result.get("selected_topic", response.get("selected_topic")),
        **result,
    }


async def topic_lock_node(state: ResearchState) -> ResearchState:
    result = await run_agent("topic_lock", state)
    response = (
        result.get("response", {}) if isinstance(result.get("response"), dict) else {}
    )
    return {
        "topic_locked": result.get("topic_locked", response.get("topic_locked", False)),
        "selected_topic": result.get("selected_topic", response.get("selected_topic")),
        **result,
    }


async def orchestrator_node(state: ResearchState) -> ResearchState:
    result = await run_agent("orchestrator", state)
    response = (
        result.get("response", {}) if isinstance(result.get("response"), dict) else {}
    )
    next_step = response.get("next_step") if isinstance(response, dict) else None
    return {**result, "next_step": next_step}


async def domain_node(state):
    return await run_agent("domain_intelligence", state)


async def historical_node(state):
    return await run_agent("historical_review", state)


async def slr_node(state):
    return await run_agent("slr", state)


async def news_node(state):
    return await run_agent("news", state)


async def gap_node(state):
    return await run_agent("gap_synthesis", state)


async def innovation_node(state):
    return await run_agent("innovation_novelty", state)


async def decomp_node(state):
    return await run_agent("paper_decomposition", state)


async def understanding_node(state):
    return await run_agent("paper_understanding", state)


async def verify_node(state):
    return await run_agent("technical_verification", state)


async def critique_node(state):
    return await run_agent("hallucination_detection", state)


async def visualization_node(state):
    return await run_agent("visualization", state)


async def central_brain_node(state):
    """
    Brain Mode 1: INIT — Strategic planning before research begins.
    Runs once after orchestrator. Sets research direction.
    """
    return await run_agent("central_brain", state)


async def brain_synthesize_node(state):
    """
    Brain Mode 2: SYNTHESIZE — Reads all gathered findings and forms thesis.
    Runs after gap_synthesis. Pivots or confirms research direction.
    Injects: synthesis, core_thesis, adjusted focus into brain_context.
    """
    # Force mode to synthesize by temporarily injecting marker
    inject = {**state, "findings": {**state.get("findings", {})}}
    # The brain auto-detects mode from findings (has gap_synthesis = synthesize)
    return await run_agent("central_brain", inject)


async def brain_direct_node(state):
    """
    Brain Mode 3: DIRECT — Editor-in-chief before paper writing.
    Runs after scoring. Defines thesis, narrative, paper directive.
    """
    return await run_agent("central_brain", state)


async def image_intelligence_node(state):
    """
    Evaluates web-sourced images for academic suitability.
    Only approved images (score >= 7) flow into the paper generator.
    """
    return await run_agent("image_intelligence", state)


async def multi_stage_report_node(state):
    from ai_engine.utils.document_lock import document_lock

    job_id = state.get("_job_id", "default")
    if document_lock.acquire(job_id, owner="multi_stage_report", timeout=60):
        try:
            result = await run_agent("multi_stage_report", state)
            document_lock.increment_version(job_id)
            return result
        finally:
            document_lock.release(job_id, owner="multi_stage_report")
    logger.error(
        f"[Job #{job_id}] Failed to acquire document lock for multi_stage_report"
    )
    raise RuntimeError("MultiStageReport: Could not acquire document lock")


async def scoring_node(state):
    return await run_agent("scoring", state)


async def write_node(state):
    return await run_agent("scientific_writing", state)


async def latex_node(state):
    from ai_engine.utils.document_lock import document_lock

    job_id = state.get("_job_id", "default")
    if document_lock.acquire(job_id, owner="latex_generation", timeout=60):
        try:
            result = await run_agent("latex_generation", state)
            document_lock.increment_version(job_id)
            return result
        finally:
            document_lock.release(job_id, owner="latex_generation")
    logger.error(
        f"[Job #{job_id}] Failed to acquire document lock for latex_generation"
    )
    raise RuntimeError("LaTeXGeneration: Could not acquire document lock")


workflow = StateGraph(ResearchState)
workflow.add_node("topic_discovery", topic_discovery_node)
workflow.add_node("topic_lock", topic_lock_node)
workflow.add_node("orchestrator", orchestrator_node)

# 🧠 Brain Node 1: INIT — strategic planning
workflow.add_node("brain_init", central_brain_node)
# 🧠 Brain Node 2: SYNTHESIZE — interprets all findings
workflow.add_node("brain_synthesize", brain_synthesize_node)
# 🧠 Brain Node 3: DIRECT — directs the paper before writing
workflow.add_node("brain_direct", brain_direct_node)

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
workflow.add_node("image_intelligence", image_intelligence_node)  # 📸 Image scoring
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


workflow.add_conditional_edges(
    "topic_lock",
    topic_gate,
    {
        "orchestrator": "orchestrator",
        "topic_discovery": "topic_discovery",
        END: END,
    },
)

# After orchestrator → Brain INIT (strategic planning)
workflow.add_conditional_edges(
    "orchestrator",
    lambda s: "brain_init",
    {
        "brain_init": "brain_init",
    },
)


def route_after_brain_init(state):
    """Route from brain_init to domain or paper analysis."""
    step = state.get("next_step")
    if step == "paper_analysis":
        return "paper_decomposition"
    return "domain_intelligence"


workflow.add_conditional_edges(
    "brain_init",
    route_after_brain_init,
    {
        "paper_decomposition": "paper_decomposition",
        "domain_intelligence": "domain_intelligence",
    },
)

# Domain research pipeline
workflow.add_edge("domain_intelligence", "historical_review")
workflow.add_edge("domain_intelligence", "slr")
workflow.add_edge("domain_intelligence", "news")
workflow.add_edge("slr", "image_intelligence")
workflow.add_edge("news", "image_intelligence")
workflow.add_edge(["historical_review", "image_intelligence"], "gap_synthesis")

# After gap_synthesis → Brain SYNTHESIZE (interprets all findings)
workflow.add_edge("gap_synthesis", "brain_synthesize")
workflow.add_edge("brain_synthesize", "innovation")

# Paper analysis pipeline
workflow.add_edge("paper_decomposition", "understanding")
workflow.add_edge("understanding", "technical_verification")
workflow.add_edge("technical_verification", "critique")

# Both pipelines converge at visualization
workflow.add_edge("innovation", "visualization")
workflow.add_edge("critique", "visualization")
workflow.add_edge("visualization", "scoring")

# After scoring → Brain DIRECT (editor-in-chief before writing)
workflow.add_edge("scoring", "brain_direct")
# Ensure writer consumes all gathered findings + brain directives first.
workflow.add_edge("brain_direct", "writing")
workflow.add_edge("writing", "multi_stage_report")
workflow.add_edge("multi_stage_report", "latex")
workflow.add_edge("latex", END)

# NOTE:
# This workflow is fully async (all nodes are async coroutines), so it must be
# executed via `ainvoke`. A synchronous SqliteSaver checkpointer is incompatible
# with async execution and causes deterministic runtime failures.
# Compile without a checkpointer to keep the pipeline stable.
app = workflow.compile()
logger.warning("[Pipeline] Compiled WITHOUT checkpointing (async-safe mode)")
