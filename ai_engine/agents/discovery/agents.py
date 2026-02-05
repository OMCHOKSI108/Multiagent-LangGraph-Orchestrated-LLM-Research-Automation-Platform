from ..base import BaseAgent
from utils.providers import WebSearchProvider, GoogleSearchProvider, WikipediaProvider, ArxivProvider
from langchain_core.messages import SystemMessage, HumanMessage

class DomainIntelligenceAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="DomainIntelligence",
            system_prompt="""You are an expert in Research Domain Analysis. 
            Identify key themes, taxonomies, and ontological structures within the requested research topic.
            Output JSON with keys: 'domains', 'key_concepts', 'seminal_works_query'.
            """,
            **kwargs
        )
        self.ddg_provider = WebSearchProvider()
        self.google_provider = GoogleSearchProvider()
        self.wiki_provider = WikipediaProvider()

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Running with Multi-Engine Web Search...")
        task = state.get("task", "")
        
        # 1. Perform searches
        ddg_results = self.ddg_provider.search(f"research domain taxonomy {task}", max_results=2)
        google_results = self.google_provider.search(f"research domain taxonomy {task}", max_results=2)
        wiki_results = self.wiki_provider.search(task, max_results=2)
        
        all_results = ddg_results + google_results + wiki_results
        
        context_str = "\n".join([f"- [{r.get('source', 'web')}] {r['title']}: {r.get('body', '')}" for r in all_results])
        
        # 2. Update system prompt with real context
        enhanced_prompt = f"{self.system_prompt}\n\nContext from Web Search:\n{context_str}"
        
        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=str(state))
        ]
        
        try:
            response = self.llm.invoke(messages)
            raw_content = response.content
            parsed_json = self._extract_json(raw_content)
            
            # Add search results to the output for transparency
            if isinstance(parsed_json, dict):
                parsed_json["_meta_search_results"] = all_results
                
            return {
                "response": parsed_json,
                "raw": raw_content,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e), "raw": "Error during execution"}

class HistoricalReviewAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="HistoricalReview",
            system_prompt="""You are a History of Science expert. 
            Trace the evolution of the given topic over time. 
            Identify 3 major epochs/phases of development.
            Output JSON with keys: 'timeline', 'major_shifts', 'legacy_methods'.
            """,
            **kwargs
        )
        self.arxiv_provider = ArxivProvider()

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Tracing History with Arxiv...")
        task = state.get("task", "")
        
        # 1. Search Arxiv for "history of <task>" or "survey <task>"
        papers = self.arxiv_provider.search_papers(f"history of {task}", max_results=3)
        if not papers:
            papers = self.arxiv_provider.search_papers(f"survey {task}", max_results=3)
            
        context_str = "\n".join([f"- {p['published']} | {p['title']}: {p['summary'][:300]}..." for p in papers])
        
        enhanced_prompt = f"{self.system_prompt}\n\nHistorical Context from Arxiv:\n{context_str}"
        
        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=str(state))
        ]
        
        try:
            response = self.llm.invoke(messages)
            raw_content = response.content
            parsed_json = self._extract_json(raw_content)
            
            if isinstance(parsed_json, dict):
                parsed_json["_meta_history_sources"] = papers
                
            return {
                "response": parsed_json,
                "raw": raw_content,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e), "raw": "Error during execution"}
