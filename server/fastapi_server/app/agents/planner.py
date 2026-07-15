from ..services.llm import call_llm
from ..services.progress import emit_progress
from .types import ResearchState
from .cancel_helpers import check_cancelled

SYSTEM_PROMPT = """You are a research planning agent. Given a user's research question, create a structured research plan.

Your response must be valid JSON with this exact structure:
{
  "plan": "A 3-5 sentence overview of the research approach",
  "search_queries": ["query 1", "query 2", "query 3", "query 4", "query 5"]
}

Generate 3-5 specific search queries that will gather comprehensive information on the topic. Each query should target a different aspect or angle of the topic."""


async def run_planner(state: ResearchState) -> ResearchState:
    if state.get("error") or await check_cancelled(state):
        return state

    job_id = state.get("job_id", "")
    await emit_progress(job_id, "planner", "running", "Analyzing research question and creating search plan...")

    question = state["question"]
    user_prompt = f"Research question: {question}\n\nCreate a research plan and generate search queries."

    result = call_llm(SYSTEM_PROMPT, user_prompt, temperature=0.3)

    import json
    import re

    try:
        json_match = re.search(r"\{.*\}", result, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
        else:
            data = json.loads(result)

        state["plan"] = data.get("plan", "")
        state["search_queries"] = data.get("search_queries", [question])
    except (json.JSONDecodeError, KeyError):
        state["plan"] = result
        state["search_queries"] = [question]

    state["status"] = "planned"

    query_count = len(state["search_queries"])
    await emit_progress(job_id, "planner", "complete", f"Created plan with {query_count} search queries.", {"plan": state["plan"][:200]})
    return state