from typing import Literal

from langgraph.graph import StateGraph, END
from sqlalchemy.ext.asyncio import AsyncSession

from .agents.types import ResearchState
from .agents.planner import run_planner
from .agents.searcher import run_searcher
from .agents.crawler import run_crawler
from .agents.extractor import run_extractor
from .agents.chunker import run_chunker
from .agents.reasoning import run_reasoning
from .agents.paper_writer import run_paper_writer
from .agents.citation import run_citation
from .agents.reviewer import run_reviewer, run_revise
from .services.progress import emit_progress
from .services.llm import LLMError, USER_FRIENDLY_ERROR


def router_planner(state: ResearchState) -> Literal["searcher", "end"]:
    if state.get("error") or state.get("cancelled"):
        return "end"
    return "searcher"


def router_searcher(state: ResearchState) -> Literal["crawler", "end"]:
    if state.get("error") or state.get("cancelled"):
        return "end"
    return "crawler"


def router_crawler(state: ResearchState) -> Literal["extractor", "end"]:
    if state.get("error") or state.get("cancelled"):
        return "end"
    return "extractor"


def router_extractor(state: ResearchState) -> Literal["chunker", "end"]:
    if state.get("error") or state.get("cancelled"):
        return "end"
    return "chunker"


def router_chunker(state: ResearchState) -> Literal["reasoning", "end"]:
    if state.get("error") or state.get("cancelled"):
        return "end"
    return "reasoning"


def router_reasoning(state: ResearchState) -> Literal["paper_writer", "end"]:
    if state.get("error") or state.get("cancelled"):
        return "end"
    return "paper_writer"


def router_paper_writer(state: ResearchState) -> Literal["citation", "end"]:
    if state.get("error") or state.get("cancelled"):
        return "end"
    return "citation"


def router_citation(state: ResearchState) -> Literal["reviewer", "end"]:
    if state.get("error") or state.get("cancelled"):
        return "end"
    return "reviewer"


def router_reviewer(state: ResearchState) -> Literal["revise", "end"]:
    if state.get("error") or state.get("cancelled"):
        return "end"
    if state.get("status") == "approved":
        return "end"
    if state.get("revision_count", 0) >= state.get("max_revisions", 2):
        return "end"
    return "revise"


def build_research_graph() -> StateGraph:
    builder = StateGraph(ResearchState)

    builder.add_node("planner", run_planner)
    builder.add_node("searcher", run_searcher)
    builder.add_node("crawler", run_crawler)
    builder.add_node("extractor", run_extractor)
    builder.add_node("chunker", run_chunker)
    builder.add_node("reasoning", run_reasoning)
    builder.add_node("paper_writer", run_paper_writer)
    builder.add_node("citation", run_citation)
    builder.add_node("reviewer", run_reviewer)
    builder.add_node("revise", run_revise)

    builder.set_entry_point("planner")

    builder.add_conditional_edges("planner", router_planner, {
        "searcher": "searcher",
        "end": END,
    })
    builder.add_conditional_edges("searcher", router_searcher, {
        "crawler": "crawler",
        "end": END,
    })
    builder.add_conditional_edges("crawler", router_crawler, {
        "extractor": "extractor",
        "end": END,
    })
    builder.add_conditional_edges("extractor", router_extractor, {
        "chunker": "chunker",
        "end": END,
    })
    builder.add_conditional_edges("chunker", router_chunker, {
        "reasoning": "reasoning",
        "end": END,
    })
    builder.add_conditional_edges("reasoning", router_reasoning, {
        "paper_writer": "paper_writer",
        "end": END,
    })
    builder.add_conditional_edges("paper_writer", router_paper_writer, {
        "citation": "citation",
        "end": END,
    })
    builder.add_conditional_edges("citation", router_citation, {
        "reviewer": "reviewer",
        "end": END,
    })
    builder.add_conditional_edges("reviewer", router_reviewer, {
        "revise": "revise",
        "end": END,
    })
    builder.add_edge("revise", "reviewer")

    return builder.compile()


async def run_research(
    question: str,
    session_id: str,
    job_id: str = "",
    max_revisions: int = 2,
    db: AsyncSession | None = None,
) -> dict:
    # Check if job was cancelled before starting
    from .services.progress import is_job_cancelled
    if await is_job_cancelled(job_id):
        return {
            "report": "Research cancelled by user.",
            "sources": [],
            "status": "cancelled",
            "error": "cancelled",
            "revision_count": 0,
            "chunk_count": 0,
            "paper_id": "",
            "paper_title": "",
            "citation_count": 0,
            "finding_count": 0,
        }

    initial_state: ResearchState = {
        "question": question,
        "session_id": session_id,
        "job_id": job_id,
        "plan": "",
        "search_queries": [],
        "search_results": [],
        "crawled_content": [],
        "analysis": "",
        "report": "",
        "review": "",
        "revision_count": 0,
        "max_revisions": max_revisions,
        "status": "started",
        "error": None,
        "cancelled": False,
        "chunk_count": 0,
        "db": db,
        "structured_data": [],
        "key_findings": [],
        "citations": [],
        "paper_id": "",
        "paper_title": "",
        "paper_abstract": "",
        "paper_sections": [],
    }

    graph = build_research_graph()
    try:
        final_state = await graph.ainvoke(initial_state)
    except LLMError as e:
        msg = e.user_message
        await emit_progress(job_id, "pipeline", "failed", msg)
        return {
            "report": msg,
            "sources": [],
            "status": "failed",
            "error": msg,
            "revision_count": 0,
            "chunk_count": 0,
            "paper_id": "",
            "paper_title": "",
            "citation_count": 0,
            "finding_count": 0,
        }
    except Exception as e:
        msg = f"Research pipeline encountered an unexpected error. {USER_FRIENDLY_ERROR}"
        await emit_progress(job_id, "pipeline", "failed", msg)
        return {
            "report": msg,
            "sources": [],
            "status": "failed",
            "error": msg,
            "revision_count": 0,
            "chunk_count": 0,
            "paper_id": "",
            "paper_title": "",
            "citation_count": 0,
            "finding_count": 0,
        }

    return {
        "report": final_state.get("report", ""),
        "sources": [
            {"title": s.get("title", ""), "url": s.get("url", "")}
            for s in final_state.get("crawled_content", [])
        ],
        "status": final_state.get("status", "failed"),
        "revision_count": final_state.get("revision_count", 0),
        "chunk_count": final_state.get("chunk_count", 0),
        "paper_id": final_state.get("paper_id", ""),
        "paper_title": final_state.get("paper_title", ""),
        "citation_count": len(final_state.get("citations", [])),
        "finding_count": len(final_state.get("key_findings", [])),
    }
