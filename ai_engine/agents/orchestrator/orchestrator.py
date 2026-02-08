import sys
import os
import logging

logger = logging.getLogger("ai_engine.orchestrator")

# Fix imports for running in different contexts
try:
    from ..base import BaseAgent
except ImportError:
    # Fallback when running from different path
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from agents.base import BaseAgent

from langchain_core.messages import SystemMessage, HumanMessage

class OrchestratorAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="Orchestrator",
            system_prompt="""You are the Research Project Manager.
            Analyze the user's request and decide the optimal research pipeline.
            
            Available Pipelines:
            1. "paper_analysis": If the user provides a specific paper URL or asks to analyze a specific paper.
            2. "literature_review": If the user asks for a general topic research, survey, or new innovation proposal.
            
            Output JSON with keys:
            'next_step': One of ["paper_analysis", "literature_review"],
            'plan': A brief explanation of the chosen strategy,
            'reasoning': Why you chose this path.
            """,
            **kwargs
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
                
                # Update state with routing decision
                return {**state, "next_step": response["next_step"], **result}
            
            return result
            
        except Exception as e:
            logger.error(f"[{self.name}] Error: {e}")
            
            # Fallback routing
            task = state.get("task", "")
            paper_url = state.get("paper_url")
            next_step = "paper_analysis" if paper_url or "paper" in task.lower() else "literature_review"
            
            return {
                **state,
                "next_step": next_step,
                "error": str(e),
                "plan": f"Fallback routing to {next_step}",
                "reasoning": "Orchestrator failed, using heuristic routing"
            }
