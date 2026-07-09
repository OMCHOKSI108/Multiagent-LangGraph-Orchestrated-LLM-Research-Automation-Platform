from sqlalchemy import select

from ..services.chunking import chunk_text
from ..services.embeddings import embed_batch
from ..services.progress import emit_progress
from ..db import DocumentChunk, ResearchSource
from .types import ResearchState


async def run_chunker(state: ResearchState) -> ResearchState:
    if state.get("error"):
        return state

    db = state.get("db")
    job_id = state.get("job_id", "")
    session_id = state["session_id"]
    crawled = state.get("crawled_content", [])

    if not crawled or db is None:
        await emit_progress(job_id, "chunker", "complete", "No content to chunk or no DB session.")
        return state

    await emit_progress(job_id, "chunker", "running", f"Chunking {len(crawled)} documents...")

    all_chunks = []
    for item in crawled:
        content = item.get("content", item.get("clean_text", ""))
        url = item.get("url", "")
        title = item.get("title", "")
        if not content.strip():
            continue

        chunks = chunk_text(content, source_url=url, source_title=title)
        all_chunks.extend(chunks)

    if not all_chunks:
        await emit_progress(job_id, "chunker", "complete", "No chunks generated.")
        return state

    await emit_progress(job_id, "chunker", "embedding", f"Generating embeddings for {len(all_chunks)} chunks...")

    texts = [c["chunk_text"] for c in all_chunks]
    embeddings = await embed_batch(texts)

    source_map = await _get_source_map(session_id, db)

    for chunk_data, vec in zip(all_chunks, embeddings):
        source_id = source_map.get(chunk_data["metadata"].get("source_url", ""))
        chunk = DocumentChunk(
            session_id=session_id,
            source_id=source_id,
            chunk_index=chunk_data["chunk_index"],
            section_title=chunk_data["section_title"],
            chunk_text=chunk_data["chunk_text"],
            embedding=vec,
            meta_json=chunk_data["metadata"],
        )
        db.add(chunk)

    await db.commit()
    state["chunk_count"] = len(all_chunks)
    state["status"] = "chunked"

    await emit_progress(job_id, "chunker", "complete", f"Stored {len(all_chunks)} chunks with embeddings.")
    return state


async def _get_source_map(session_id: str, db) -> dict[str, str]:
    result = await db.execute(
        select(ResearchSource).where(ResearchSource.session_id == session_id)
    )
    sources = result.scalars().all()
    return {s.url: s.id for s in sources if s.url}
