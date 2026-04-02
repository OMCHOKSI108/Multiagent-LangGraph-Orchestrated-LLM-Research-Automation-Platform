"""
MARP Router Graph
==================
LangGraph graph that routes queries to the correct research mode:
  - direct : LLM answers from knowledge (no scraping)
  - search : Web search + scrape + synthesize
  - deep   : Full existing multi-agent pipeline (full_pipeline.py)

This is the ENTRY POINT for all user messages.
The full_pipeline.app is invoked for "deep" mode.
"""

from typing import TypedDict, Optional, Dict, Any, List, Annotated
import operator
import logging
import time

from langgraph.graph import StateGraph, END

logger = logging.getLogger("ai_engine.router_graph")


# ============================
# Router State
# ============================
def _merge(a: Dict, b: Dict) -> Dict:
    return {**a, **b}


class RouterState(TypedDict):
    task: str
    mode: Optional[str]           # direct | search | deep
    depth: Optional[str]          # standard | deep | gather
    search_terms: Optional[List[str]]
    direct_answer: Optional[str]
    scraped_data: Optional[Dict]
    final_response: Optional[str]
    workspace_id: Optional[str]
    session_id: Optional[int]
    _job_id: Optional[str]
    findings: Annotated[Dict[str, Any], _merge]
    history: Annotated[List[str], operator.add]


# ============================
# Nodes
# ============================

def plan_node(state: RouterState) -> RouterState:
    """Run QueryPlannerAgent to classify the query."""
    from ai_engine.agents.registry import AGENTS
    agent = AGENTS.get("query_planner")
    if not agent:
        logger.warning("[RouterGraph] query_planner not registered — defaulting to deep mode")
        return {"mode": "deep", "depth": "standard", "search_terms": [state["task"]],
                "history": ["QueryPlanner: skipped (not registered)"]}

    result = agent.run(state)
    plan = result.get("response", {})
    if not isinstance(plan, dict):
        plan = {"mode": "deep", "depth": "standard", "search_terms": [state["task"]]}

    logger.info(f"[RouterGraph] Planned mode={plan.get('mode')} depth={plan.get('depth')}")
    return {
        "mode":         plan.get("mode", "deep"),
        "depth":        plan.get("depth", "standard"),
        "search_terms": plan.get("search_terms", [state["task"]]),
        "history":      [f"QueryPlanner: mode={plan.get('mode')} ({result.get('execution_time', 0)}s)"],
    }


def direct_answer_node(state: RouterState) -> RouterState:
    """Answer directly from LLM knowledge (MODEL_WRITING for quality prose)."""
    from ai_engine.llm.factory import get_llm_provider
    try:
        from ai_engine import config
    except ImportError:
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import config

    from langchain_core.messages import SystemMessage, HumanMessage

    t0 = time.time()
    try:
        provider = get_llm_provider(config.MODEL_WRITING)
        llm = provider.get_langchain_llm()
        messages = [
            SystemMessage(content="You are a knowledgeable research assistant. Answer clearly and concisely."),
            HumanMessage(content=state["task"]),
        ]
        response = llm.invoke(messages)
        answer = response.content.strip()
    except Exception as e:
        logger.error(f"[direct_answer_node] LLM failed: {e}")
        answer = f"I encountered an error answering this question: {e}"

    elapsed = round(time.time() - t0, 2)
    return {
        "direct_answer": answer,
        "final_response": answer,
        "history": [f"DirectAnswer: completed ({elapsed}s)"],
    }


def search_and_answer_node(state: RouterState) -> RouterState:
    """Search web, scrape, synthesize with WebScraperAgent."""
    from ai_engine.agents.registry import AGENTS
    t0 = time.time()

    # Run WebScraperAgent (search + scrape + LLM synthesis)
    agent = AGENTS.get("web_scraper")
    if not agent:
        logger.error("[search_and_answer_node] web_scraper not registered")
        return {"history": ["WebScraper: SKIPPED (not registered)"]}

    # Pass search_terms into state for the agent to use
    enriched_state = {**state, "search_terms": state.get("search_terms", [state["task"]])}
    result = agent.run(enriched_state)
    data = result.get("response", {})

    # Optional: Run DataCleanerAgent to improve quality
    cleaner = AGENTS.get("data_cleaner")
    if cleaner:
        clean_state = {**enriched_state, "findings": {"web_scraper": data}}
        clean_result = cleaner.run(clean_state)
        cleaned = clean_result.get("response", {})
        summary = cleaned.get("cleaned_text") or data.get("summary", "")
    else:
        summary = data.get("summary", str(data)[:2000])

    elapsed = round(time.time() - t0, 2)
    return {
        "scraped_data": data,
        "final_response": summary,
        "findings": {"web_scraper": data},
        "history": [f"SearchAndAnswer: {data.get('source_count', 0)} sources ({elapsed}s)"],
    }


def deep_research_node(state: RouterState) -> RouterState:
    """Invoke the existing full LangGraph research pipeline."""
    from ai_engine.graph.full_pipeline import app as research_app

    # Convert RouterState → ResearchState (full pipeline expects topic fields)
    research_state = {
        "task": state["task"],
        "paper_url": None,
        "next_step": None,
        "workspace_id": state.get("workspace_id"),
        "session_id": state.get("session_id"),
        "_job_id": state.get("_job_id"),
        "topic_locked": False,
        "selected_topic": None,
        "topic_suggestions": [],
        "research_summary": "",
        "findings": state.get("findings", {}),
        "history": state.get("history", []),
    }

    logger.info(f"[RouterGraph] Invoking deep research pipeline for: {state['task'][:60]}")
    try:
        result = research_app.invoke(research_state)
        return {
            "findings":        result.get("findings", {}),
            "final_response":  result.get("research_summary", "Deep research completed."),
            "history":         result.get("history", []),
        }
    except Exception as e:
        logger.error(f"[deep_research_node] Pipeline failed: {e}")
        return {"history": [f"DeepResearch: FAILED - {e}"]}


# ============================
# Routing Logic
# ============================

def route_query(state: RouterState) -> str:
    mode = state.get("mode", "deep")
    if mode == "direct":
        return "direct_answer"
    if mode == "search":
        return "search_and_answer"
    return "deep_research"


# ============================
# Build Graph
# ============================
workflow = StateGraph(RouterState)

workflow.add_node("plan",               plan_node)
workflow.add_node("direct_answer",      direct_answer_node)
workflow.add_node("search_and_answer",  search_and_answer_node)
workflow.add_node("deep_research",      deep_research_node)

workflow.set_entry_point("plan")

workflow.add_conditional_edges("plan", route_query, {
    "direct_answer":     "direct_answer",
    "search_and_answer": "search_and_answer",
    "deep_research":     "deep_research",
})

workflow.add_edge("direct_answer",     END)
workflow.add_edge("search_and_answer", END)
workflow.add_edge("deep_research",     END)

router_app = workflow.compile()

logger.info("[RouterGraph] Router graph compiled successfully.")
