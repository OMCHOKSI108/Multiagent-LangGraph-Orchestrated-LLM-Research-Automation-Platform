from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage

class MemoryKnowledgeGraphAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="MemoryKnowledgeGraph",
            system_prompt="""You are a Knowledge Graph Manager. 
            Maintain the state of the research project, linking concepts and papers.
            Output JSON with keys: 'graph_updates', 'new_nodes', 'new_edges'.
            """,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Updating Knowledge Graph...")
        # In a real system, this would read/write to Neo4j or NetworkX
        # Here we just simulate the thinking process of "what should be linked"
        findings = state.get("findings", {})
        
        summary = f"Entities found so far: {len(findings)} major steps."
        
        enhanced_prompt = f"{self.system_prompt}\n\nCURRENT STATE:\n{summary}"
        
        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=str(state)[:2000])
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

class CitationGraphAnalysisAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="CitationGraphAnalysis",
            system_prompt="""You are a Scientometrician. 
            Analyze citation networks to find seminal works.
            Output JSON with keys: 'seminal_papers', 'citation_clusters'.
            """,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Analyzing Citation Graph...")
        findings = state.get("findings", {})
        
        # Look for Paper Collection
        sources = ""
        if "slr" in findings:
            sources = str(findings["slr"])
        elif "historical_review" in findings:
            sources = str(findings["historical_review"])
            
        enhanced_prompt = f"{self.system_prompt}\n\nPAPERS TO ANALYZE:\n{sources[:10000]}"
        
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
