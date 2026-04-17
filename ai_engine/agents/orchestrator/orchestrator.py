import sys
import os
import logging

logger = logging.getLogger("ai_engine.orchestrator")

try:
    from ..base import BaseAgent
except ImportError:
    import sys
    import os

    # Add parent directory to path to find agents package
    sys.path.append(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
    from ai_engine.agents.base import BaseAgent

from langchain_core.messages import SystemMessage, HumanMessage


class OrchestratorAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="Orchestrator",
            system_prompt="""Your Role: Multi-Agent Orchestrator

ABSOLUTE RULE: EDIT ONLY — DO NOT REDESIGN

Agent Ordering (MUST follow this sequence):
Scraper → Verifier → Writer → Editor → QA → Compiler

Role Assignments:
- Scraper: Data collection from ArXiv, IEEE, ACM. NO blogs or unverified sources.
- Verifier: Source validation. All claims must be verifiable.
- Writer: Content drafting in Markdown.
- Editor: LaTeX integration ONLY. Diff-based edits only.
- QA: Quality assurance before compilation.
- Compiler: PDF generation after QA passes.

Critical Constraints:
- Editor is the ONLY agent allowed to modify LaTeX
- NO parallel LaTeX writes
- All LaTeX edits MUST be diff-based (no full regeneration)
- User confirmation required before applying LaTeX edits
- Preserve labels, refs, and numbering in LaTeX

Output JSON with keys:
'next_step': One of ["paper_analysis", "literature_review"],
'plan': "Brief explanation of chosen strategy",
'reasoning': "Why you chose this path",
'delegation': {
    "scraper": "Task description...",
    "verifier": "Task description...",
    "writer": "Task description...",
    "editor": "Task description..."
},
'constraints_acknowledged': true
""",
            **kwargs,
        )

    def run(self, state: dict) -> dict:
        logger.info(f"[{self.name}] Assessing Research Task...")

        # Use parent class run method for consistency
        try:
            result = super().run(state)

            # Ensure next_step is in the response for routing
            if "response" in result and isinstance(result["response"], dict):
                response = result["response"]

                # Fallback routing if LLM didn't provide clear next_step
                if "next_step" not in response:
                    task = state.get("task", "")
                    paper_url = state.get("paper_url")

                    if paper_url or "paper" in task.lower():
                        response["next_step"] = "paper_analysis"
                    else:
                        response["next_step"] = "literature_review"

                # Normalize routing keywords
                ns = response["next_step"]
                if "paper" in ns.lower():
                    response["next_step"] = "paper_analysis"
                elif "liter" in ns.lower() or "review" in ns.lower():
                    response["next_step"] = "literature_review"

                # Strict override: Cannot do paper analysis without a paper
                paper_url = state.get("paper_url")
                if response["next_step"] == "paper_analysis" and not paper_url:
                    task = state.get("task", "")
                    if "http://" not in task and "https://" not in task:
                        logger.warning(
                            f"[{self.name}] LLM suggested paper_analysis, but no paper URL was found. Forcing literature_review."
                        )
                        response["next_step"] = "literature_review"

                # Update state with routing decision
                return {**state, "next_step": response["next_step"], **result}

            # BaseAgent may swallow LLM exceptions and return an error payload
            # without a structured "response"; we still need a routing decision.
            task = state.get("task", "")
            paper_url = state.get("paper_url")
            next_step = (
                "paper_analysis"
                if paper_url or "paper" in task.lower()
                else "literature_review"
            )

            # Strict override: Cannot do paper analysis without a paper
            if next_step == "paper_analysis" and not paper_url:
                if "http://" not in task and "https://" not in task:
                    next_step = "literature_review"

            return {**state, "next_step": next_step, **result}

        except Exception as e:
            logger.error(f"[{self.name}] Error: {e}")

            # Fallback routing
            task = state.get("task", "")
            paper_url = state.get("paper_url")
            next_step = (
                "paper_analysis"
                if paper_url or "paper" in task.lower()
                else "literature_review"
            )

            return {
                **state,
                "next_step": next_step,
                "error": str(e),
                "plan": f"Fallback routing to {next_step}",
                "reasoning": "Orchestrator failed, using heuristic routing",
            }
