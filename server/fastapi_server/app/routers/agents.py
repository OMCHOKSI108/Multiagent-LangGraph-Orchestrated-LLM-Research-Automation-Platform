from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..agents.chat_with_paper import chat_with_paper as _chat_with_paper
from ..agents.chunker import run_chunker as _run_chunker
from ..agents.citation import run_citation as _run_citation
from ..agents.crawler import run_crawler as _run_crawler
from ..agents.extractor import run_extractor as _run_extractor
from ..agents.image_searcher import search_images as _search_images
from ..agents.paper_editor import edit_paper as _edit_paper
from ..agents.paper_writer import run_paper_writer as _run_paper_writer
from ..agents.planner import run_planner as _run_planner
from ..agents.reasoning import run_reasoning as _run_reasoning
from ..agents.reviewer import run_reviewer as _run_reviewer, run_revise as _run_revise
from ..agents.searcher import run_searcher as _run_searcher
from ..agents.writer import run_writer as _run_writer
from ..agents.types import ResearchState
from ..db import get_db

router = APIRouter(prefix="/internal/agents", tags=["agents"])


_DEFAULT_STATE: dict[str, Any] = {
    "question": "",
    "session_id": "",
    "job_id": "",
    "plan": "",
    "search_queries": [],
    "search_results": [],
    "crawled_content": [],
    "analysis": "",
    "report": "",
    "review": "",
    "revision_count": 0,
    "max_revisions": 2,
    "status": "started",
    "error": None,
    "chunk_count": 0,
    "db": None,
    "structured_data": [],
    "key_findings": [],
    "citations": [],
    "paper_id": "",
    "paper_title": "",
    "paper_abstract": "",
    "paper_sections": [],
}


def _make_state(**kwargs: Any) -> ResearchState:
    merged = dict(_DEFAULT_STATE)
    merged.update(kwargs)
    return ResearchState(**merged)


# ─── Request Models ──────────────────────────────────────────────────────────


class PlannerRequest(BaseModel):
    question: str = Field(..., examples=["How do quantum computing algorithms improve drug discovery?如何看待目前的量子计算"])


class SearcherRequest(BaseModel):
    question: str = Field(..., examples=["Quantum computing drug discovery 2024"])
    search_queries: list[str] = Field(..., examples=[["quantum computing drug discovery machine learning", "quantum algorithms pharmaceutical research", "quantum computing molecular simulation drugs", "quantum machine learning drug design", "quantum computing chemistry pharmaceutical"]])


class CrawlerRequest(BaseModel):
    question: str = Field(..., examples=["Quantum computing drug discovery"])
    search_results: list[dict] = Field(
        ...,
        examples=[[
            {"url": "https://example.com/quantum-drug-discovery", "title": "Quantum Computing in Drug Discovery"},
            {"url": "https://example.com/quantum-algorithms", "title": "Quantum Algorithms for Pharma"},
        ]],
    )


class ExtractorRequest(BaseModel):
    session_id: str = Field(..., examples=["550e8400-e29b-41d4-a716-446655440000"])
    crawled_content: list[dict] = Field(
        ...,
        examples=[[
            {"url": "https://example.com/article", "title": "Quantum Computing Overview", "content": "Quantum computing leverages qubits to perform computations that are infeasible for classical computers. In drug discovery, quantum algorithms can simulate molecular interactions at unprecedented scale. Recent advances in variational quantum eigensolvers have enabled accurate modeling of molecular ground states. Pharmaceutical companies are investing heavily in quantum-classical hybrid approaches."},
        ]],
    )


class ChunkerRequest(BaseModel):
    session_id: str = Field(..., examples=["550e8400-e29b-41d4-a716-446655440000"])
    crawled_content: list[dict] = Field(
        ...,
        examples=[[
            {"url": "https://example.com/article", "title": "Quantum Computing Overview", "content": "Quantum computing leverages qubits to perform computations that are infeasible for classical computers..."},
        ]],
    )


class ReasoningRequest(BaseModel):
    question: str = Field(..., examples=["How do quantum computing algorithms improve drug discovery?"])
    session_id: str = Field(..., examples=["550e8400-e29b-41d4-a716-446655440000"])
    structured_data: list[dict] = Field(
        ...,
        examples=[[
            {"source_url": "https://example.com/article", "source_title": "Quantum Computing Overview", "summary": "Quantum algorithms can simulate molecular interactions", "claims": [{"claim": "Quantum computers can model molecular ground states", "confidence": 0.9}], "key_topics": ["quantum computing", "drug discovery"]},
        ]],
    )


class PaperWriterRequest(BaseModel):
    question: str = Field(..., examples=["How do quantum computing algorithms improve drug discovery?"])
    session_id: str = Field(..., examples=["550e8400-e29b-41d4-a716-446655440000"])
    key_findings: list[dict] = Field(
        ...,
        examples=[[
            {"title": "Quantum Speedup for Molecular Simulation", "finding": "Quantum computers can simulate molecular ground states exponentially faster than classical computers using VQE algorithms.", "confidence": 0.85, "supporting_claims": ["VQE enables accurate ground state estimation"], "contradictions": []},
        ]],
    )
    crawled_content: list[dict] = Field(
        ...,
        examples=[[
            {"url": "https://example.com/article", "title": "Quantum Computing Overview", "content": "Quantum computing leverages qubits..."},
        ]],
    )


class CitationRequest(BaseModel):
    session_id: str = Field(..., examples=["550e8400-e29b-41d4-a716-446655440000"])
    report: str = Field(
        ...,
        examples=["# Quantum Computing in Drug Discovery\n\n## Abstract\nThis paper explores quantum computing applications in pharmaceutical research...\n\n## I. Introduction\nQuantum computing offers transformative potential for drug discovery [1]."],
    )


class ReviewerRequest(BaseModel):
    question: str = Field(..., examples=["How do quantum computing algorithms improve drug discovery?"])
    report: str = Field(
        ...,
        examples=["# Quantum Computing in Drug Discovery\n\n## Abstract\n...\n\n## I. Introduction\n..."],
    )
    citations: list[dict] = Field(
        ...,
        examples=[[{"citation_number": 1, "claim": "Quantum computers can model molecular ground states", "confidence": 0.9, "source_url": "https://example.com/article"}]],
    )


class ReviseRequest(BaseModel):
    question: str = Field(..., examples=["How do quantum computing algorithms improve drug discovery?"])
    report: str = Field(
        ...,
        examples=["# Quantum Computing in Drug Discovery\n\n## Abstract\n..."],
    )
    review: str = Field(
        ...,
        examples=["Score: 5/10. Issues: The paper lacks specific technical depth. Citations need verification. Add more implementation details."],
    )


class WriterRequest(BaseModel):
    question: str = Field(..., examples=["How do quantum computing algorithms improve drug discovery?"])
    session_id: str = Field(..., examples=["550e8400-e29b-41d4-a716-446655440000"])
    plan: str = Field(..., examples=["Research the current state of quantum computing in drug discovery, focusing on key algorithms like VQE and QAOA, and evaluate their impact on molecular simulation and pharmaceutical development."])
    crawled_content: list[dict] = Field(
        ...,
        examples=[[
            {"url": "https://example.com/article", "title": "Quantum Computing Overview", "content": "Quantum computing leverages qubits..."},
        ]],
    )


class ChatPaperRequest(BaseModel):
    session_id: str = Field(..., examples=["550e8400-e29b-41d4-a716-446655440000"])
    question: str = Field(..., examples=["What is the main contribution of this paper?"])


class SearchImagesRequest(BaseModel):
    session_id: str = Field(..., examples=["550e8400-e29b-41d4-a716-446655440000"])
    query: str = Field(..., examples=["quantum computing architecture diagram"])


class EditPaperRequest(BaseModel):
    session_id: str = Field(..., examples=["550e8400-e29b-41d4-a716-446655440000"])
    section_name: str | None = Field(None, examples=["Introduction"])
    edit_request: str = Field(..., examples=["Add more technical depth about VQE algorithm implementation"])


# ─── Agent Endpoints ─────────────────────────────────────────────────────────


@router.post("/planner")
async def agent_planner(req: PlannerRequest):
    state = _make_state(question=req.question, job_id="test-planner")
    result = await _run_planner(state)
    return {
        "plan": result["plan"],
        "search_queries": result["search_queries"],
        "status": result["status"],
    }


@router.post("/searcher")
async def agent_searcher(req: SearcherRequest):
    state = _make_state(question=req.question, search_queries=req.search_queries, job_id="test-searcher")
    result = await _run_searcher(state)
    return {
        "search_results": result["search_results"],
        "status": result["status"],
        "result_count": len(result["search_results"]),
    }


@router.post("/crawler")
async def agent_crawler(req: CrawlerRequest):
    state = _make_state(question=req.question, search_results=req.search_results, job_id="test-crawler")
    result = await _run_crawler(state)
    return {
        "crawled_content": result.get("crawled_content", []),
        "analysis": result.get("analysis", ""),
        "status": result["status"],
    }


@router.post("/extractor")
async def agent_extractor(req: ExtractorRequest, db: AsyncSession = Depends(get_db)):
    state = _make_state(
        session_id=req.session_id,
        crawled_content=req.crawled_content,
        db=db,
        job_id="test-extractor",
    )
    result = await _run_extractor(state)
    return {
        "structured_data": result.get("structured_data", []),
        "status": result["status"],
    }


@router.post("/chunker")
async def agent_chunker(req: ChunkerRequest, db: AsyncSession = Depends(get_db)):
    state = _make_state(
        session_id=req.session_id,
        crawled_content=req.crawled_content,
        db=db,
        job_id="test-chunker",
    )
    result = await _run_chunker(state)
    return {
        "chunk_count": result.get("chunk_count", 0),
        "status": result["status"],
    }


@router.post("/reasoning")
async def agent_reasoning(req: ReasoningRequest, db: AsyncSession = Depends(get_db)):
    state = _make_state(
        question=req.question,
        session_id=req.session_id,
        structured_data=req.structured_data,
        db=db,
        job_id="test-reasoning",
    )
    result = await _run_reasoning(state)
    return {
        "key_findings": result.get("key_findings", []),
        "analysis": result.get("analysis", ""),
        "status": result["status"],
        "finding_count": len(result.get("key_findings", [])),
    }


@router.post("/paper-writer")
async def agent_paper_writer(req: PaperWriterRequest, db: AsyncSession = Depends(get_db)):
    state = _make_state(
        question=req.question,
        session_id=req.session_id,
        key_findings=req.key_findings,
        crawled_content=req.crawled_content,
        db=db,
        job_id="test-paper-writer",
    )
    result = await _run_paper_writer(state)
    return {
        "report": result.get("report", ""),
        "paper_title": result.get("paper_title", ""),
        "paper_abstract": result.get("paper_abstract", ""),
        "paper_sections": result.get("paper_sections", []),
        "paper_id": result.get("paper_id", ""),
        "status": result["status"],
        "report_length": len(result.get("report", "")),
    }


@router.post("/citation")
async def agent_citation(req: CitationRequest, db: AsyncSession = Depends(get_db)):
    state = _make_state(
        session_id=req.session_id,
        report=req.report,
        db=db,
        job_id="test-citation",
    )
    result = await _run_citation(state)
    return {
        "citations": result.get("citations", []),
        "status": result["status"],
        "citation_count": len(result.get("citations", [])),
    }


@router.post("/reviewer")
async def agent_reviewer(req: ReviewerRequest):
    state = _make_state(
        question=req.question,
        report=req.report,
        citations=req.citations,
        job_id="test-reviewer",
    )
    result = await _run_reviewer(state)
    return {
        "review": result.get("review", ""),
        "status": result["status"],
        "revision_count": result.get("revision_count", 0),
    }


@router.post("/revise")
async def agent_revise(req: ReviseRequest):
    state = _make_state(
        question=req.question,
        report=req.report,
        review=req.review,
        revision_count=1,
        job_id="test-revise",
    )
    result = await _run_revise(state)
    return {
        "report": result.get("report", ""),
        "status": result["status"],
        "report_length": len(result.get("report", "")),
    }


@router.post("/writer")
async def agent_writer(req: WriterRequest, db: AsyncSession = Depends(get_db)):
    state = _make_state(
        question=req.question,
        session_id=req.session_id,
        plan=req.plan,
        crawled_content=req.crawled_content,
        db=db,
        job_id="test-writer",
    )
    result = await _run_writer(state)
    return {
        "report": result.get("report", ""),
        "status": result["status"],
        "report_length": len(result.get("report", "")),
    }


@router.post("/chat-with-paper")
async def agent_chat_paper(req: ChatPaperRequest, db: AsyncSession = Depends(get_db)):
    result = await _chat_with_paper(req.question, req.session_id, db)
    return result


@router.post("/search-images")
async def agent_search_images(req: SearchImagesRequest, db: AsyncSession = Depends(get_db)):
    images = await _search_images(req.query, req.session_id, db)
    return {"images": images, "count": len(images)}


@router.post("/edit-paper")
async def agent_edit_paper(req: EditPaperRequest, db: AsyncSession = Depends(get_db)):
    result = await _edit_paper(req.session_id, req.section_name, req.edit_request, db)
    return result
