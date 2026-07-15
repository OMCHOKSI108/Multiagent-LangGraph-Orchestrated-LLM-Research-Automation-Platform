import json
import re

from ..services.llm import call_llm
from ..services.progress import emit_progress
from ..db import RawDocument, ResearchSource
from .types import ResearchState
from .cancel_helpers import check_cancelled

SYSTEM_PROMPT = """You are a research extraction agent. Given raw web content, extract structured information.

Return valid JSON with this structure:
{
  "title": "The full title of the document",
  "author": "Author name or null",
  "published_date": "Date or null",
  "headings": ["Heading 1", "Heading 2"],
  "summary": "2-3 sentence summary of the document",
  "claims": [
    {"claim": "Specific claim made in the text", "confidence": 0.8}
  ],
  "statistics": [
    {"stat": "Specific statistic or data point", "value": "the value mentioned"}
  ],
  "definitions": [
    {"term": "Defined term", "definition": "The definition given"}
  ],
  "methods": [
    {"method": "Method name", "description": "Brief description"}
  ],
  "limitations": [
    "Limitation mentioned in the text"
  ],
  "references": [
    {"title": "Referenced work", "url": "URL if available"}
  ],
  "key_topics": ["topic1", "topic2"]
}

If a field has no data, use an empty array or null. Do not fabricate information."""


async def run_extractor(state: ResearchState) -> ResearchState:
    if state.get("error") or await check_cancelled(state):
        return state

    db = state.get("db")
    job_id = state.get("job_id", "")
    session_id = state["session_id"]
    crawled = state.get("crawled_content", [])

    if not crawled or db is None:
        await emit_progress(job_id, "extractor", "complete", "No content to extract.")
        return state

    await emit_progress(job_id, "extractor", "running", f"Extracting structured data from {len(crawled)} sources...")

    source_map = await _get_source_map(session_id, db)
    all_structured = []

    for i, item in enumerate(crawled):
        if await check_cancelled(state):
            return state
        content = item.get("content", "")
        url = item.get("url", "")
        title = item.get("title", "")
        if not content.strip():
            continue

        await emit_progress(job_id, "extractor", "extracting", f"Extracting source {i + 1}/{len(crawled)}: {title[:60] or url[:60]}...")

        user_prompt = f"Extract structured information from this source.\n\nTitle: {title}\nURL: {url}\n\nContent:\n{content[:8000]}"

        result = call_llm(SYSTEM_PROMPT, user_prompt, temperature=0.1)

        try:
            json_match = re.search(r"\{.*\}", result, re.DOTALL)
            parsed = json.loads(json_match.group()) if json_match else json.loads(result)
        except (json.JSONDecodeError, AttributeError):
            parsed = {"summary": result[:500], "key_topics": [], "claims": []}

        parsed["source_url"] = url
        parsed["source_title"] = title
        all_structured.append(parsed)

        source_id = source_map.get(url)
        if source_id:
            raw_doc = RawDocument(
                source_id=source_id,
                session_id=session_id,
                raw_html=None,
                raw_text=content,
                clean_text=content[:10000],
                structured_json=parsed,
                token_count=len(content.split()),
            )
            db.add(raw_doc)

    await db.commit()
    state["structured_data"] = all_structured
    state["status"] = "extracted"

    await emit_progress(job_id, "extractor", "complete", f"Extracted structured data from {len(all_structured)} sources.")
    return state


async def _get_source_map(session_id: str, db) -> dict[str, str]:
    from sqlalchemy import select
    result = await db.execute(
        select(ResearchSource).where(ResearchSource.session_id == session_id)
    )
    sources = result.scalars().all()
    return {s.url: s.id for s in sources if s.url}