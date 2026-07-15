import json
import re

from ..services.llm import call_llm_stream
from ..services.progress import emit_progress, emit_token
from ..services.rag import hybrid_search, validate_citations
from ..services.token_budget import count_tokens, truncate_to_token_budget
from ..db import Paper, PaperVersion, PaperSection
from .types import ResearchState

MAX_EVIDENCE_TOKENS = 2500

IEEE_SYSTEM_PROMPT = """You are an IEEE paper writer agent. Given a research question, key findings, and evidence, write a professional IEEE-style research paper.

The paper must have these sections in order:
1. Title (as # at the top)
2. Abstract
3. Keywords
4. I. Introduction
5. II. Literature Review
6. III. Proposed Architecture / Approach
7. IV. Methodology
8. V. System Implementation
9. VI. Evaluation
10. VII. Results and Discussion
11. VIII. Limitations
12. IX. Conclusion
13. References

Requirements:
- Use proper IEEE citation format [1], [2] etc.
- Every factual claim must cite a source
- Write in formal academic language
- Include specific technical details from the evidence
- The References section must list actual URLs from the sources
- Be comprehensive (1500-3000 words)
- Do NOT fabricate citations or references"""


async def run_paper_writer(state: ResearchState) -> ResearchState:
    if state.get("error"):
        return state

    db = state.get("db")
    job_id = state.get("job_id", "")
    session_id = state["session_id"]
    question = state["question"]

    await emit_progress(job_id, "paper_writer", "running", "Writing IEEE paper from evidence...")

    rag_results = []
    if db is not None:
        rag_results = await hybrid_search(question, session_id, db, top_k=10, min_score=0.2)

    key_findings = state.get("key_findings", [])
    findings_text = ""
    for i, f in enumerate(key_findings, 1):
        findings_text += f"[Finding {i}] {f.get('title', '')}: {f.get('finding', '')}\n"

    evidence_text = ""
    for i, r in enumerate(rag_results[:5], 1):
        evidence_text += f"[Evidence {i}] {r['chunk_text'][:800]}\n---\n"
    evidence_text = truncate_to_token_budget(evidence_text, MAX_EVIDENCE_TOKENS)

    sources_text = ""
    for i, item in enumerate(state.get("crawled_content", []), 1):
        sources_text += f"[{i}] {item.get('title', 'Untitled')} - {item.get('url', '')}\n"

    if not findings_text.strip():
        findings_text = "No structured findings available."
    if not evidence_text.strip():
        analysis = state.get("analysis", "No evidence available.")
        evidence_text = truncate_to_token_budget(analysis, MAX_EVIDENCE_TOKENS)

    source_list = [item.get("url", "") for item in state.get("crawled_content", [])]
    source_count = len(source_list)
    source_index_text = "\n".join(f"[{i+1}] {item.get('title', 'Untitled')} - {item.get('url', '')}" for i, item in enumerate(state.get("crawled_content", [])))

    user_prompt = (
        f"Research Question: {question}\n\n"
        f"Key Findings:\n{findings_text}\n\n"
        f"Evidence:\n{evidence_text}\n\n"
        f"Available Sources (numbered list — ONLY cite from these):\n{source_index_text}\n\n"
        f"IMPORTANT: You may ONLY cite sources from the numbered list above. "
        f"Do NOT invent or fabricate citations. Every [N] reference must match a source above.\n\n"
        f"Write a complete IEEE-style research paper."
    )

    await emit_progress(job_id, "paper_writer", "generating", "Generating IEEE paper sections...")

    async def on_token(token: str):
        await emit_token(job_id, token)

    report = await call_llm_stream(IEEE_SYSTEM_PROMPT, user_prompt, temperature=0.4, token_callback=on_token)

    report, citation_violations = validate_citations(report, source_count)
    if citation_violations:
        await emit_progress(job_id, "paper_writer", "warning",
            f"Removed {len(citation_violations)} invalid citation(s) that referenced non-existent sources: [{', '.join(citation_violations)}]")

    state["report"] = report
    state["status"] = "paper_written"

    title = _extract_title(report)
    abstract = _extract_abstract(report)
    sections = _extract_sections(report)

    state["paper_title"] = title
    state["paper_abstract"] = abstract
    state["paper_sections"] = sections

    if db is not None:
        existing = await _get_existing_paper(session_id, db)
        if existing:
            paper = existing
        else:
            paper = Paper(
                session_id=session_id,
                title=title or question[:100],
                abstract=abstract or "",
                status="draft",
            )
            db.add(paper)
            await db.flush()

        version = PaperVersion(
            paper_id=paper.id,
            version_number=1,
            full_markdown=report,
            change_summary="Initial IEEE paper",
        )
        db.add(version)
        await db.flush()

        paper.active_version_id = version.id

        for i, sec in enumerate(sections):
            ps = PaperSection(
                paper_id=paper.id,
                version_id=version.id,
                section_name=sec.get("name", ""),
                section_order=i,
                content_markdown=sec.get("content", ""),
            )
            db.add(ps)

        await db.commit()
        state["paper_id"] = str(paper.id)

    await emit_progress(
        job_id, "paper_writer", "complete",
        f"IEEE paper written: {title or question[:60]}",
        {"report_length": len(report), "sections": len(sections)}
    )
    return state


def _extract_title(report: str) -> str:
    lines = report.strip().split("\n")
    for line in lines:
        if line.startswith("# ") or line.startswith("## "):
            return line.lstrip("#").strip()
    return ""


def _extract_abstract(report: str) -> str:
    match = re.search(r"(?i)abstract\s*\n(.*?)(?=\n\s*(?:Keywords|I\.|##))", report, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ""


def _extract_sections(report: str) -> list[dict]:
    sections = []
    pattern = re.compile(r"^(#{1,3}\s+|(?:I{1,3}|IV|V|VI{1,3}|VII|VIII|IX|X)\.\s+)(.+)$", re.MULTILINE)

    matches = list(pattern.finditer(report))
    if not matches:
        return [{"name": "Full Report", "content": report}]

    for i, match in enumerate(matches):
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(report)
        content = report[start:end].strip()
        name = match.group(2).strip()
        sections.append({"name": name, "content": content})

    return sections


async def _get_existing_paper(session_id: str, db):
    from sqlalchemy import select
    result = await db.execute(
        select(Paper).where(Paper.session_id == session_id)
    )
    return result.scalar_one_or_none()
