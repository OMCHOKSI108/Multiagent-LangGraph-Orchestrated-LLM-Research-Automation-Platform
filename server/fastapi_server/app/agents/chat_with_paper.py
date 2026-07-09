from sqlalchemy import select

from ..services.llm import call_llm
from ..db import DocumentChunk, Citation, KeyFinding, Paper, PaperSection, PaperVersion
from ..services.rag import enhanced_rag_search, faithfulness_check

SYSTEM_PROMPT = """You are a research paper assistant. You help users understand and work with a generated IEEE research paper.

You have access to:
1. The paper's sections and content
2. The original sources and evidence chunks the paper was built from
3. Citation mappings (which claims map to which sources)
4. Key findings extracted during research

Rules:
- Always cite sources when making claims about the paper's content
- If asked about a specific section, quote the relevant part and explain it
- If asked to add technical depth, suggest specific additions with supporting citations
- If asked to find weak citations, identify claims with low confidence scores
- Be honest if you don't have enough information
- Keep answers concise and technical"""


async def chat_with_paper(
    question: str,
    session_id: str,
    db,
) -> dict:
    paper_sections = await _get_paper_context(session_id, db)
    rag_evidence = await enhanced_rag_search(question, session_id, db, top_k=6, min_score=0.2)
    citations_list = await _get_citations_context(session_id, db)
    findings = await _get_findings_context(session_id, db)

    context = f"Paper Sections:\n{paper_sections}\n\n"
    if rag_evidence:
        context += f"Relevant Evidence:\n{rag_evidence}\n"
    if citations_list:
        context += f"\nCitations:\n{citations_list}\n"
    if findings:
        context += f"\nKey Findings:\n{findings}\n"

    user_prompt = (
        f"User Question about the paper: {question}\n\n"
        f"Available Context:\n{context}\n\n"
        f"Answer the user's question based on the paper and its sources."
    )

    answer = call_llm(SYSTEM_PROMPT, user_prompt, temperature=0.3)

    verdict = faithfulness_check(answer, question, rag_evidence)
    if not verdict.get("faithful", True) and verdict.get("unsupported_claims"):
        from ..services.rag import reflexion_revise
        answer = reflexion_revise(answer, question, rag_evidence, verdict["unsupported_claims"])

    return {"answer": answer, "faithful": verdict.get("faithful", True)}


async def _get_paper_context(session_id: str, db) -> str:
    paper_result = await db.execute(
        select(Paper).where(Paper.session_id == session_id)
    )
    paper = paper_result.scalar_one_or_none()
    if not paper:
        return "No paper found."

    sections_result = await db.execute(
        select(PaperSection)
        .where(PaperSection.paper_id == paper.id)
        .order_by(PaperSection.section_order)
    )
    sections = sections_result.scalars().all()

    context = f"Title: {paper.title}\nAbstract: {paper.abstract or 'N/A'}\n\n"
    for sec in sections:
        context += f"### {sec.section_name}\n{sec.content_markdown[:500]}...\n\n"
    return context


async def _get_citations_context(session_id: str, db) -> str:
    result = await db.execute(
        select(Citation).where(Citation.session_id == session_id).limit(15)
    )
    citations = result.scalars().all()
    if not citations:
        return ""
    lines = []
    for c in citations:
        lines.append(f"[{c.citation_number}] Claim: {c.claim_text[:100]} | Confidence: {c.confidence_score}")
    return "\n".join(lines)


async def _get_findings_context(session_id: str, db) -> str:
    result = await db.execute(
        select(KeyFinding).where(KeyFinding.session_id == session_id).limit(10)
    )
    findings = result.scalars().all()
    if not findings:
        return ""
    lines = []
    for f in findings:
        lines.append(f"- {f.finding_title}: {f.finding_text[:200]} (confidence: {f.confidence_score})")
    return "\n".join(lines)
