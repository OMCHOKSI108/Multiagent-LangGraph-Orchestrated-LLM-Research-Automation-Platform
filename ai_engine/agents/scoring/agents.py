from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage
import json

class ScoringAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="ScoringAgent",
            system_prompt="""You are a Research Relevance Evaluator.
            Score the provided search results or content based on their relevance to the user's research topic.
            
            Input: A list of search results or a text summary.
            Output JSON with keys:
            'scores': [{"url": "...", "score": 0.0-1.0, "reason": "..."}],
            'average_relevance': 0.0-1.0,
            'best_source_url': "..."
            """,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Scoring Content Relevance...")
        task = state.get("task", "")
        # Get content to score, prioritize search results
        content = state.get("search_results", [])
        
        if not content:
            # Try to find sources in data_scraper finding
            findings = state.get("findings", {})
            if "data_scraper" in findings:
                scraper_data = findings["data_scraper"]
                if isinstance(scraper_data, dict):
                    content = scraper_data.get("sources", scraper_data.get("response", {}).get("sources", []))
            
            if not content:
                # Fallback to general findings
                content = str(findings)[:1000]
            
        enhanced_prompt = f"{self.system_prompt}\n\nRESEARCH TOPIC: {task}\n\nCONTENT TO SCORE:\n{str(content)[:15000]}"
        
        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=str(state))
        ]
        
        try:
            response = self.llm.invoke(messages)
            return {
                "response": self._extract_json(response.content),
                "raw": response.content,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e)}
