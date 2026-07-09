import json
import re
import logging

import numpy as np
from sqlalchemy import select, text, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pgvector.sqlalchemy import Vector

from ..db import DocumentChunk
from ..config import settings
from .embeddings import embed_text
from .llm import call_llm

logger = logging.getLogger(__name__)

_reranker = None


def _get_reranker():
    global _reranker
    if _reranker is None:
        try:
            from sentence_transformers import CrossEncoder
            _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
            logger.info("Loaded reranker model: cross-encoder/ms-marco-MiniLM-L-6-v2")
        except Exception:
            _reranker = None
    return _reranker


async def hybrid_search(
    query: str,
    session_id: str,
    db: AsyncSession,
    top_k: int | None = None,
    min_score: float | None = None,
    source_type: str | None = None,
    min_trust_score: float | None = None,
) -> list[dict]:
    top_k = top_k or settings.top_k_retrieval
    min_score = min_score or settings.min_retrieval_score

    query_vec = await embed_text(query)

    vector_results = await _vector_search(query_vec, session_id, db, top_k * 2)
    keyword_results = await _keyword_search(query, session_id, db, top_k * 2)

    merged = _merge_results(vector_results, keyword_results, top_k)
    reranked = _rerank(query, merged)

    final = [r for r in reranked if r["score"] >= min_score]

    if source_type:
        final = [r for r in final if r.get("metadata", {}).get("source_type") == source_type]
    if min_trust_score is not None:
        final = [r for r in final if (r.get("metadata", {}).get("trust_score") or 0) >= min_trust_score]

    if final:
        chunk_ids = [r["id"] for r in final]
        scores = await fetch_source_scores(chunk_ids, session_id, db)
        for r in final:
            sid = r["id"]
            if sid in scores:
                r["source_scores"] = scores[sid]

    return final[:top_k]


async def fetch_source_scores(chunk_ids: list[str], session_id: str, db: AsyncSession) -> dict:
    if not chunk_ids:
        return {}
    stmt = text("""
        SELECT dc.id, s.trust_score, s.relevance_score, s.freshness_score
        FROM document_chunks dc
        LEFT JOIN sources s ON dc.source_id = s.id
        WHERE dc.id = ANY(:ids::uuid[])
          AND dc.session_id = :session_id::uuid
    """)
    result = await db.execute(stmt, {"ids": chunk_ids, "session_id": session_id})
    rows = result.fetchall()
    return {str(r[0]): {"trust_score": float(r[1] or 0), "relevance_score": float(r[2] or 0), "freshness_score": float(r[3] or 0)} for r in rows}


def rewrite_query(query: str) -> str:
    result = call_llm(
        "You rewrite user questions into precise, self-contained search queries for a RAG system. "
        "Remove ambiguity, add technical terms, keep it a single sentence.",
        f"Original: {query}\n\nRewritten query:",
        temperature=0.2,
    )
    return result.strip()


def sub_question_generation(query: str) -> list[str]:
    result = call_llm(
        "Break the following research question into 2-3 specific sub-questions. "
        "Return as a JSON list of strings only. Example: [\"sub question 1\", \"sub question 2\"]",
        f"Question: {query}\n\nSub-questions (JSON list):",
        temperature=0.2,
    )
    try:
        json_match = re.search(r"\[.*?\]", result, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group())
            if parsed and isinstance(parsed, list) and isinstance(parsed[0], dict):
                return [list(d.values())[0] for d in parsed]
            return parsed
        return [query]
    except (json.JSONDecodeError, IndexError):
        return [query]


def context_compress(chunks: list[dict], query: str, max_chars: int = 3000) -> str:
    raw_ctx = "\n\n---\n\n".join(
        f"[{r['section_title'] or 'Untitled'}] {r['chunk_text']}"
        for r in chunks
    )
    if not raw_ctx.strip():
        return ""

    compressed = call_llm(
        "You are a context compression system. Extract ONLY the sentences and facts "
        "from the provided context that are directly relevant to answering the question. "
        "Remove irrelevant information. Preserve exact wording of relevant sentences. "
        "Keep all technical terms, numbers, and proper names intact.",
        f"Question: {query}\n\nContext:\n{raw_ctx}\n\nCompressed relevant context:",
        temperature=0.1,
    )
    if len(compressed) > max_chars:
        compressed = compressed[:max_chars]
    return compressed.strip()


def validate_citations(text: str, source_count: int) -> tuple[str, list[str]]:
    """Strict validation: ensure all [N] citations reference existing sources.

    Returns (cleaned_text, violations) where violations lists any
    citation numbers that exceed the available source count.
    """
    violations = []
    refs = re.findall(r'\[(\d+)\]', text)
    for ref in refs:
        num = int(ref)
        if num < 1 or num > source_count:
            violations.append(ref)
    if violations:
        for v in violations:
            text = text.replace(f"[{v}]", "")
    return text, violations


async def enhanced_rag_search(
    query: str,
    session_id: str,
    db: AsyncSession,
    top_k: int = 10,
    min_score: float = 0.2,
) -> str:
    rewritten = rewrite_query(query)
    sub_questions = sub_question_generation(rewritten)

    all_chunks = []
    seen_ids = set()

    for q in [rewritten] + sub_questions:
        results = await hybrid_search(q, session_id, db, top_k=top_k, min_score=min_score)
        for r in results:
            if r["id"] not in seen_ids:
                seen_ids.add(r["id"])
                all_chunks.append(r)

    all_chunks.sort(key=lambda x: x["score"], reverse=True)
    compressed = context_compress(all_chunks[:15], rewritten)
    return compressed


def faithfulness_check(answer: str, query: str, compressed_ctx: str) -> dict:
    if not compressed_ctx.strip():
        return {"faithful": True, "unsupported_claims": [], "score": 10}

    result = call_llm(
        "You are a faithfulness verifier. Given an answer and the source context, "
        "identify any claims in the answer that are NOT supported by the context. "
        "Return JSON: {\"faithful\": true/false, \"unsupported_claims\": [\"...\"], \"score\": 0-10}",
        f"Context:\n{compressed_ctx}\n\nAnswer:\n{answer}\n\nVerification:",
        temperature=0.1,
    )
    try:
        json_match = re.search(r"\{.*\}", result, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return {"faithful": True, "unsupported_claims": [], "score": 10}
    except (json.JSONDecodeError, AttributeError):
        return {"faithful": True, "unsupported_claims": [], "score": 10}


def reflexion_revise(
    answer: str, query: str, compressed_ctx: str, unsupported_claims: list[str]
) -> str:
    revised = call_llm(
        "You are a research assistant. Your previous answer contained unsupported claims. "
        "Revise it to ONLY include information supported by the provided context. "
        "Cite section names. If the context doesn't fully answer the question, say so explicitly.",
        f"Question: {query}\n\nSupported Context:\n{compressed_ctx}\n\n"
        f"Previous Answer:\n{answer}\n\nUnsupported Claims:\n"
        f"{chr(10).join(unsupported_claims)}\n\nRevised Answer:",
        temperature=0.2,
    )
    return revised.strip()


async def fetch_citations_for_chunks(
    chunk_ids: list[str], session_id: str, db: AsyncSession
) -> list[dict]:
    if not chunk_ids:
        return []
    stmt = text("""
        SELECT c.id, c.claim_text, c.citation_text, c.citation_number, c.url, c.section_name, c.confidence_score
        FROM citations c
        WHERE c.chunk_id = ANY(:ids::uuid[])
          AND c.session_id = :session_id::uuid
        ORDER BY c.citation_number
        LIMIT 30
    """)
    result = await db.execute(stmt, {"ids": chunk_ids, "session_id": session_id})
    rows = result.fetchall()
    return [
        {
            "citation_number": r[3],
            "claim_text": r[1],
            "citation_text": r[2],
            "url": r[4],
            "section_name": r[5],
            "confidence_score": float(r[6] or 0),
        }
        for r in rows
    ]


async def rag_answer_with_verification(
    query: str,
    session_id: str,
    db: AsyncSession,
    top_k: int = 10,
    min_score: float = 0.2,
) -> dict:
    rewritten = rewrite_query(query)
    sub_questions = sub_question_generation(rewritten)

    all_chunks = []
    seen_ids = set()

    for q in [rewritten] + sub_questions:
        results = await hybrid_search(q, session_id, db, top_k=top_k, min_score=min_score)
        for r in results:
            if r["id"] not in seen_ids:
                seen_ids.add(r["id"])
                all_chunks.append(r)

    all_chunks.sort(key=lambda x: x["score"], reverse=True)
    top_chunks = all_chunks[:15]

    compressed_ctx = context_compress(top_chunks, rewritten)

    citations = await fetch_citations_for_chunks([c["id"] for c in top_chunks], session_id, db)
    citation_text = ""
    if citations:
        citation_lines = []
        for c in citations[:10]:
            citation_lines.append(f"[{c['citation_number']}] {c['claim_text'][:200]} — {c['url']}")
        citation_text = "\nCitations from source:\n" + "\n".join(citation_lines)

    answer = call_llm(
        "You are a research assistant. Answer based only on the context provided. "
        "Cite the section name and citation number for each claim. "
        "If the context doesn't contain the answer, say so.",
        f"Context:\n{compressed_ctx}\n{citation_text}\n\nQuestion: {query}\n\nAnswer:",
        temperature=0.3,
    )

    verdict = faithfulness_check(answer, query, compressed_ctx)
    unsupported = verdict.get("unsupported_claims", [])

    if not verdict.get("faithful", True) and unsupported:
        answer = reflexion_revise(answer, query, compressed_ctx, unsupported)
        final_verdict = faithfulness_check(answer, query, compressed_ctx)
    else:
        final_verdict = verdict

    return {
        "answer": answer,
        "faithful": final_verdict.get("faithful", True),
        "faithfulness_score": final_verdict.get("score", 10),
        "unsupported_claims": final_verdict.get("unsupported_claims", []),
        "compressed_context_length": len(compressed_ctx),
        "citations": citations[:10] if citations else [],
        "chunks_used": len(top_chunks),
    }


async def _vector_search(
    query_vec: list[float],
    session_id: str,
    db: AsyncSession,
    top_k: int,
) -> list[dict]:
    vec = Vector(query_vec)
    stmt = (
        select(
            DocumentChunk,
            DocumentChunk.embedding.cosine_distance(vec).label("distance"),
        )
        .where(
            and_(
                DocumentChunk.session_id == session_id,
                DocumentChunk.embedding.isnot(None),
            )
        )
        .order_by(text("distance ASC"))
        .limit(top_k)
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "id": str(r.DocumentChunk.id),
            "chunk_text": r.DocumentChunk.chunk_text,
            "section_title": r.DocumentChunk.section_title or "",
            "metadata": r.DocumentChunk.meta_json or {},
            "score": float(max(0, 1 - r.distance)),
            "source": "vector",
        }
        for r in rows
    ]


async def _keyword_search(
    query: str,
    session_id: str,
    db: AsyncSession,
    top_k: int,
) -> list[dict]:
    tsquery = " & ".join(query.split()[:10])
    if not tsquery:
        return []

    stmt = text("""
        SELECT
            id, chunk_text, section_title, meta_json,
            ts_rank(to_tsvector('english', chunk_text), to_tsquery('english', :query)) AS rank
        FROM document_chunks
        WHERE session_id = :session_id::uuid
          AND to_tsvector('english', chunk_text) @@ to_tsquery('english', :query)
        ORDER BY rank DESC
        LIMIT :top_k
    """)
    result = await db.execute(stmt, {"query": tsquery, "session_id": session_id, "top_k": top_k})
    rows = result.fetchall()

    return [
        {
            "id": str(r[0]),
            "chunk_text": r[1],
            "section_title": r[2] or "",
            "metadata": r[3] or {},
            "score": float(r[4]),
            "source": "keyword",
        }
        for r in rows
    ]


def _merge_results(
    vector_results: list[dict],
    keyword_results: list[dict],
    top_k: int,
) -> list[dict]:
    seen_ids = set()
    merged = []

    for r in vector_results + keyword_results:
        if r["id"] not in seen_ids:
            seen_ids.add(r["id"])
            merged.append(r)

    return merged[:top_k * 2]


def _rerank(query: str, results: list[dict]) -> list[dict]:
    reranker = _get_reranker()
    if reranker is None or not results:
        return results

    pairs = [(query, r["chunk_text"]) for r in results]
    try:
        scores = reranker.predict(pairs)
        scores = scores.tolist() if hasattr(scores, "tolist") else list(scores)
    except Exception:
        return results

    for r, s in zip(results, scores):
        r["score"] = float(s)
        r["source"] = "reranked"

    results.sort(key=lambda x: x["score"], reverse=True)
    return results
