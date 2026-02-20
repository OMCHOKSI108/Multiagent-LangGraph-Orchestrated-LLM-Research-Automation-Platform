from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage
import json
from datetime import datetime

class NewsAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="NewsAgent",
            system_prompt="""You are an AI News Analyst responsible for finding the latest developments, market trends, and breaking news related to a research topic.
            
            Your goal is to provide a "Current Developments" section that adds real-time relevance to the research.

            You have access to a News Search tool.
            
            1. Analyze the user's research topic.
            2. Generate 2-3 specific news search queries. Each query should directly use the actual topic name, NOT a placeholder.
            3. Use the tool to find relevant articles.
            4. Synthesize the findings into a concise "Current Developments" summary.
            
            Output a JSON object with:
            {
                "news_summary": "A cohesive summary of recent events...",
                "key_events": ["Event 1", "Event 2"],
                "market_trends": "Analysis of current trends...",
                "sources": [{"title": "...", "url": "..."}]
            }
            """,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Searching for latest news...")
        
        task = state.get("task", "")
        
        # 1. Generate Queries
        messages = [
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=f"Generate 3 news search queries for: {task}. Return only the queries separated by newline.")
        ]
        
        try:
            response = self.llm.invoke(messages)
            queries = [q.strip() for q in response.content.split('\n') if q.strip()]
            queries = queries[:3] # Limit to 3 queries
        except Exception as e:
            print(f"[{self.name}] Query generation failed: {e}")
            queries = [f"{task} news", f"{task} latest developments", f"{task} recent research"]

        # 2. Search News
        from utils.providers import NewsSearchProvider
        news_provider = NewsSearchProvider()
        
        all_results = []
        for query in queries:
            print(f"[{self.name}] Query: {query}")
            results = news_provider.search(query, max_results=5)
            all_results.extend(results)
            
        # Deduplicate
        seen_urls = set()
        unique_results = []
        for r in all_results:
            if r['url'] not in seen_urls:
                unique_results.append(r)
                seen_urls.add(r['url'])
        
        # 3. Synthesize
        if not unique_results:
            return {"news_summary": "No recent news found.", "sources": []}
            
        context = json.dumps(unique_results[:5], indent=2) # Top 5
        
        synthesis_messages = [
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=f"Synthesize these news results for topic '{task}':\n{context}")
        ]
        
        try:
            response = self.llm.invoke(synthesis_messages)
            result = self._extract_json(response.content)
            result["sources"] = unique_results[:5]
            return {"response": result, "agent": self.name}
            
        except Exception as e:
            print(f"[{self.name}] Synthesis failed: {e}")
            return {"error": str(e)}
