from ..base import BaseAgent
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
        print(f"[{self.name}] Assessing Research Task...")
        task = state.get("task", "")
        paper_url = state.get("paper_url")
        
        context = f"Task: {task}\nPaper URL: {paper_url}\n"
        
        messages = [
            SystemMessage(content=self.system_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=context)
        ]
        
        try:
            response = self.llm.invoke(messages)
            result = self._extract_json(response.content)
            
            # Fallback for LLM failure on strict routing
            if "next_step" not in result:
                # Basic heuristic fallback
                if paper_url or "paper" in task.lower():
                    result["next_step"] = "paper_analysis"
                else:
                    result["next_step"] = "literature_review"
            
            # Normalize for the graph router
            ns = result["next_step"]
            if "paper" in ns: result["next_step"] = "paper_analysis"
            elif "liter" in ns or "review" in ns: result["next_step"] = "literature_review"
            
            return {**state, **result}
            
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            # Fallback
            return {
                **state, 
                "next_step": "paper_analysis" if (paper_url) else "literature_review",
                "error": str(e)
            }
