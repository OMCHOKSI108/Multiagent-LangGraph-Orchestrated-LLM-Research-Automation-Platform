import json
import re

from ..services.llm import call_llm
from ..services.progress import emit_progress
from ..services.rag import hybrid_search
from ..db import Citation, DocumentChunk, ResearchSource
from .types import ResearchState
from .cancel_helpers import check_cancelled

SYSTEM_PROMPT = """You are a citation verification agent. Given a paper section and the original source evidence, map each claim in the paper to its supporting evidence.

Return valid JSON with this structure:
{
  "citations": [
    {
      "claim": "The exact claim from the paper",
      "citation_number": 1,
      "source_url": "URL of the supporting source",
      "source_title": "Title of the source",
      "supporting_text": "The exact text from the source that supports this claim",
      "confidence": 0.9
    }
  ]
}

Every claim in the paper that makes a factual assertion MUST have a citation. Claims without supporting evidence should have confidence 0 and note "unsupported". Be strict - do not fabricate citations."""


async def run_citation(state: ResearchState) -> ResearchState:
    if state.get("error") or await check_cancelled(state):
        return state

    db = state.get("db")
    job_id = state.get("job_id", "")
    session_id = state["session_id"]
    report = state.get("report", "")

    if not report or db is None:
        await emit_progress(job_id, "citation", "complete", "No report to cite.")
        return state

    await emit_progress(job_id, "citation", "running", "Mapping claims to source evidence...")

    sections = re.split(r"(?=^## )", report, flags=re.MULTILINE)
    section_text = ""
    for i, sec in enumerate(sections[:6]):
        section_text += f"\n--- Section {i + 1} ---\n{sec[:2000]}"

    rag_results = await hybrid_search(report[:500], session_id, db, top_k=10, min_score=0.2)

    if await check_cancelled(state):
        return state

    source_text = ""
    for i, r in enumerate(rag_results, 1):
        source_text += f"[Source {i}] URL: {r['metadata'].get('source_url', 'N/A')}\nTitle: {r['section_title']}\nText: {r['chunk_text'][:800]}\n---\n"

    user_prompt = (
        f"Paper Sections:\n{section_text}\n\n"
        f"Retrieved Source Evidence:\n{source_text}\n\n"
        f"Map each claim in the paper to its supporting source."
    )

    result = call_llm(SYSTEM_PROMPT, user_prompt, temperature=0.1)

    try:
        json_match = re.search(r"\{.*\}", result, re.DOTALL)
        data = json.loads(json_match.group()) if json_match else json.loads(result)
    except (json.JSONDecodeError, AttributeError):
        data = {"citations": []}

    citations = data.get("citations", [])
    state["citations"] = citations
    state["status"] = "cited"

    source_map = await _get_source_map(session_id, db)
    chunk_map = await _get_chunk_map(session_id, db)
    paper = await _get_paper(session_id, db)

    if paper and db is not None:
        for i, c in enumerate(citations, 1):
            source_id = source_map.get(c.get("source_url", ""))
            chunk_id = None
            if source_id:
                chunk_id = chunk_map.get(source_id)
            citation = Citation(
                paper_id=paper.id,
                session_id=session_id,
                section_name=None,
                source_id=source_id,
                chunk_id=chunk_id,
                citation_number=c.get("citation_number", i),
                claim_text=c.get("claim", ""),
                citation_text=c.get("supporting_text", ""),
                url=c.get("source_url", ""),
                confidence_score=c.get("confidence", 0.5),
            )
            db.add(citation)
        await db.commit()

    await emit_progress(job_id, "citation", "complete", f"Generated {len(citations)} citations.")
    return state


async def _get_source_map(session_id: str, db) -> dict[str, str]:
    from sqlalchemy import select
    result = await db.execute(
        select(ResearchSource).where(ResearchSource.session_id == session_id)
    )
    sources = result.scalars().all()
    return {s.url: s.id for s in sources if s.url}


async def _get_chunk_map(session_id: str, db) -> dict[str, str]:
    from sqlalchemy import select
    result = await db.execute(
        select(DocumentChunk).where(DocumentChunk.session_id == session_id)
    )
    chunks = result.scalars().all()
    return {str(ch.source_id): ch.id for ch in chunks if ch.source_id}


async def _get_paper(session_id: str, db):
    from sqlalchemy import select
    from ..db import Paper
    result = await db.execute(
        select(Paper).where(Paper.session_id == session_id)
    )
    return result.scalar_one_or_none()