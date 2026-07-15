import json
import re

from ..services.llm import call_llm
from ..services.progress import emit_progress
from .types import ResearchState
from .cancel_helpers import check_cancelled

SYSTEM_PROMPT = """You are an IEEE paper reviewer. Evaluate the paper against these criteria:

1. **Citation verification** - Are all claims cited? Are references real/plausible?
2. **Logical flow** - Are sections logically connected? Does the abstract match the conclusion?
3. **Depth** - Is the paper too generic? Does it have sufficient technical depth?
4. **Unsupported statements** - Are there factual statements without evidence?
5. **Structure** - Does it follow IEEE format (Abstract, Keywords, I-IX)?
6. **Clarity** - Is the writing clear, professional, and precise?

Respond with valid JSON:
{
  "score": <1-10>,
  "approved": <true if score >= 7, else false>,
  "issues": [
    {"category": "citations|logic|depth|unsupported|structure|clarity", "issue": "description", "severity": "high|medium|low"}
  ],
  "feedback": "Detailed review feedback with specific revision instructions",
  "citation_issues": ["List any citation problems found"],
  "missing_sections": ["List any IEEE sections that are missing or weak"]
}

If score >= 7, set approved: true. Otherwise include specific revision instructions."""


async def run_reviewer(state: ResearchState) -> ResearchState:
    if state.get("error") or await check_cancelled(state):
        return state

    job_id = state.get("job_id", "")
    await emit_progress(job_id, "reviewer", "running", "Reviewing paper against IEEE standards...")

    question = state["question"]
    report = state.get("report", "")
    citations = state.get("citations", [])

    citation_summary = ""
    if citations:
        for i, c in enumerate(citations[:10], 1):
            citation_summary += f"[{c.get('citation_number', i)}] Claim: {c.get('claim', '')[:100]}... → Score: {c.get('confidence', 0)}\n"

    user_prompt = (
        f"Research Question: {question}\n\n"
        f"Paper:\n{report}\n\n"
        f"Citation Check Results:\n{citation_summary or 'No citations mapped yet'}\n\n"
        f"Review this IEEE paper."
    )

    result = call_llm(SYSTEM_PROMPT, user_prompt, temperature=0.2)

    try:
        json_match = re.search(r"\{.*\}", result, re.DOTALL)
        data = json.loads(json_match.group()) if json_match else json.loads(result)

        if data.get("approved"):
            state["review"] = data.get("feedback", "")
            state["status"] = "approved"
            await emit_progress(job_id, "reviewer", "approved", f"Paper approved (score: {data.get('score', 'N/A')}/10).")
            return state

        issues = data.get("issues", [])
        issue_summary = "; ".join(f"{i.get('category', '')}: {i.get('issue', '')}" for i in issues[:5])
        state["review"] = data.get("feedback", result)
        state["revision_count"] = state.get("revision_count", 0) + 1
        state["status"] = "needs_revision"
        await emit_progress(
            job_id, "reviewer", "needs_revision",
            f"Score: {data.get('score', 'N/A')}/10. Issues: {issue_summary}. Revision {state['revision_count']}."
        )
    except (json.JSONDecodeError, KeyError):
        state["review"] = result
        state["status"] = "approved"
        await emit_progress(job_id, "reviewer", "approved", "Paper approved by reviewer.")

    return state


async def run_revise(state: ResearchState) -> ResearchState:
    if state.get("error") or await check_cancelled(state):
        return state

    job_id = state.get("job_id", "")
    revision = state.get("revision_count", 0)
    await emit_progress(job_id, "reviewer", "revising", f"Revising paper (revision {revision}) based on reviewer feedback...")

    question = state["question"]
    report = state.get("report", "")
    feedback = state.get("review", "")

    system_prompt = """You are an IEEE paper editor. Revise the paper based on the reviewer's feedback.

Requirements:
- Maintain all factual content and citations
- Address every issue raised by the reviewer
- Keep the IEEE format (Abstract, Keywords, I-IX sections)
- Improve clarity and depth where requested
- Do NOT remove citations - add more if needed
- Return the COMPLETE revised paper, not just the changes"""

    user_prompt = (
        f"Research Question: {question}\n\n"
        f"Original Paper:\n{report}\n\n"
        f"Reviewer Feedback:\n{feedback}\n\n"
        f"Revise the complete paper."
    )

    state["report"] = call_llm(system_prompt, user_prompt, temperature=0.3)
    state["status"] = "revised"
    await emit_progress(job_id, "reviewer", "revised", f"Paper revised based on feedback (revision {revision}).")
    return state