from ..services.llm import call_llm_stream
from ..services.progress import emit_progress, emit_token
from ..services.rag import hybrid_search, validate_citations
from ..services.token_budget import count_tokens, truncate_to_token_budget
from .types import ResearchState

MAX_EVIDENCE_TOKENS = 2500

SYSTEM_PROMPT = """You are a professional research report writer. Write a comprehensive, well-structured research report based on the provided research question, plan, and retrieved evidence.

Requirements:
- The report must be in Markdown format
- Start with a title (##) and an executive summary
- Include 4-6 sections with clear headings
- Cite sources in brackets like [1], [2] etc. based on the source order from the evidence
- Include a Sources section at the end listing all URLs
- Use professional academic/technical language
- Be thorough but concise
- Include specific facts, data points, and findings from the retrieved evidence
- End with a conclusion section"""


async def run_writer(state: ResearchState) -> ResearchState:
    if state.get("error"):
        return state

    job_id = state.get("job_id", "")
    await emit_progress(job_id, "writer", "running", "Retrieving relevant evidence via RAG...")

    question = state["question"]
    session_id = state["session_id"]
    plan = state.get("plan", "No plan available")

    db = state.get("db")
    rag_results = []
    if db is not None:
        rag_results = await hybrid_search(question, session_id, db, top_k=8, min_score=0.25)

    evidence_text = ""
    for i, r in enumerate(rag_results[:5], 1):
        text = r["chunk_text"][:800]
        sec = r["section_title"] or "General"
        evidence_text += f"[Evidence {i}] Section: {sec}\n{text}\n---\n"
    evidence_text = truncate_to_token_budget(evidence_text, MAX_EVIDENCE_TOKENS)

    sources_text = ""
    for i, item in enumerate(state.get("crawled_content", []), 1):
        title = item.get("title", "Untitled")
        url = item.get("url", "")
        sources_text += f"[{i}] {title} - {url}\n"

    if not rag_results:
        await emit_progress(job_id, "writer", "rag_fallback", "No RAG results found, using full analysis.")
        analysis = state.get("analysis", "No analysis available")
        evidence_text = truncate_to_token_budget(analysis, MAX_EVIDENCE_TOKENS)

        for i, item in enumerate(state.get("search_results", []), 1):
            title = item.get("title", "Untitled")
            url = item.get("url", "")
            if url and url not in "".join(
                s.get("url", "") for s in state.get("crawled_content", [])
            ):
                sources_text += f"[{len(state.get('crawled_content', [])) + i}] {title} - {url}\n"

    source_list = [item.get("url", "") for item in state.get("crawled_content", [])]
    source_count = len(source_list)
    source_index_text = "\n".join(f"[{i+1}] {item.get('title', 'Untitled')} - {item.get('url', '')}" for i, item in enumerate(state.get("crawled_content", [])))

    user_prompt = (
        f"Research Question: {question}\n\n"
        f"Research Plan: {plan}\n\n"
        f"Retrieved Evidence:\n{evidence_text}\n\n"
        f"Available Sources (numbered list — ONLY cite from these):\n{source_index_text}\n\n"
        f"IMPORTANT: You may ONLY cite sources from the numbered list above. "
        f"Do NOT invent or fabricate citations. Every [N] reference must match a source above.\n\n"
        f"Write the research report."
    )

    await emit_progress(job_id, "writer", "generating", "Generating report from evidence...")
    rag_count = len(rag_results)

    async def on_token(token: str):
        await emit_token(job_id, token)

    state["report"] = await call_llm_stream(SYSTEM_PROMPT, user_prompt, temperature=0.5, token_callback=on_token)

    state["report"], citation_violations = validate_citations(state["report"], source_count)
    if citation_violations:
        await emit_progress(job_id, "writer", "warning",
            f"Removed {len(citation_violations)} invalid citation(s) referencing non-existent sources: [{', '.join(citation_violations)}]")

    state["status"] = "written"

    await emit_progress(job_id, "writer", "complete", f"Report written using {rag_count} RAG evidence items.", {"report_length": len(state["report"]), "rag_items": rag_count})
    return state
