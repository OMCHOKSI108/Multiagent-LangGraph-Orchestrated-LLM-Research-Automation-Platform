import json
import re

from ..services.llm import call_llm
from ..services.progress import emit_progress
from ..services.rag import enhanced_rag_search
from ..db import KeyFinding
from .types import ResearchState

SYSTEM_PROMPT = """You are a research reasoning agent. Given a research question and a collection of evidence from multiple sources, synthesize key findings.

Return valid JSON with this structure:
{
  "key_findings": [
    {
      "title": "Short title of the finding",
      "finding": "Detailed description of the finding",
      "confidence": 0.85,
      "supporting_claims": ["Specific claim 1", "Specific claim 2"],
      "contradictions": ["Any contradicting claim or null"]
    }
  ],
  "contradictions_detected": [
    {"claim_a": "Claim from source A", "claim_b": "Claim from source B", "resolution": "How to reconcile"}
  ],
  "research_gaps": [
    "Aspect not covered by available sources"
  ],
  "comparison_table": [
    {"aspect": "Topic", "source_a": "View from A", "source_b": "View from B"}
  ]
}

Focus on clustering similar claims, detecting contradictions, and ranking by source reliability. Be thorough."""


async def run_reasoning(state: ResearchState) -> ResearchState:
    if state.get("error"):
        return state

    db = state.get("db")
    job_id = state.get("job_id", "")
    session_id = state["session_id"]
    question = state["question"]

    await emit_progress(job_id, "reasoning", "running", "Synthesizing evidence and generating key findings...")

    rag_evidence = ""
    if db is not None:
        rag_evidence = await enhanced_rag_search(question, session_id, db, top_k=12, min_score=0.2)

    structured = state.get("structured_data", [])
    claims_text = ""
    for i, item in enumerate(structured):
        claims = item.get("claims", [])
        for c in claims:
            claims_text += f"- {c.get('claim', '')}\n"

    user_prompt = (
        f"Research Question: {question}\n\n"
        f"Extracted Claims:\n{claims_text}\n\n"
        f"Retrieved & Compressed Evidence:\n{rag_evidence}\n\n"
        f"Synthesize key findings from this evidence."
    )

    result = call_llm(SYSTEM_PROMPT, user_prompt, temperature=0.2)

    try:
        json_match = re.search(r"\{.*\}", result, re.DOTALL)
        data = json.loads(json_match.group()) if json_match else json.loads(result)
    except (json.JSONDecodeError, AttributeError):
        data = {"key_findings": [{"title": "Summary", "finding": result[:1000], "confidence": 0.5, "supporting_claims": [], "contradictions": []}]}

    findings = data.get("key_findings", [])
    state["key_findings"] = findings
    state["analysis"] = json.dumps(data, indent=2)
    state["status"] = "reasoned"

    if db is not None:
        for f in findings:
            kf = KeyFinding(
                session_id=session_id,
                finding_title=f.get("title", "Finding")[:200],
                finding_text=f.get("finding", ""),
                confidence_score=f.get("confidence", 0.5),
                evidence_item_ids=f.get("supporting_claims", []),
            )
            db.add(kf)
        await db.commit()

    await emit_progress(job_id, "reasoning", "complete", f"Generated {len(findings)} key findings from evidence.")
    return state
