from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage

class MemoryKnowledgeGraphAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="MemoryKnowledgeGraph",
            system_prompt="""You are a Knowledge Graph Manager. 
            Identify key entities (Concepts, Papers, Authors, Methods) and relationships from the text.
            Output JSON with keys: 'entities', 'relationships'.
            Format:
            - entities: [{"id": "unique_id", "label": "Name", "type": "Concept/Paper/Method"}]
            - relationships: [{"source": "id1", "target": "id2", "relation": "cites/uses/contradicts"}]
            """,
            **kwargs
        )
        # Import internally to avoid circular dependency issues during init if utils not ready
        from utils.graph_manager import GraphManager
        self.graph_manager = GraphManager()

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Updating Knowledge Graph (NetworkX)...")
        findings = state.get("findings", {})
        
        # We process new findings to update graph
        # For now, let's look at SLR and Paper Understanding
        text_to_process = ""
        if "slr" in findings:
             text_to_process += str(findings["slr"])[:5000]
        if "paper_understanding" in findings:
             text_to_process += str(findings["paper_understanding"])[:5000]
             
        if not text_to_process:
             return {"message": "No new findings to process for graph."}

        enhanced_prompt = f"{self.system_prompt}\n\nCONTENT TO MAP:\n{text_to_process}"
        
        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content="Extract entities and relationships.")
        ]
        
        try:
            response = self.llm.invoke(messages)
            json_res = self._extract_json(response.content)
            
            # Update Graph
            if isinstance(json_res, dict):
                entities = json_res.get("entities", [])
                relationships = json_res.get("relationships", [])
                
                for e in entities:
                    self.graph_manager.add_entity(e.get("id"), e.get("label"), e.get("type"))
                
                for r in relationships:
                    self.graph_manager.add_relationship(r.get("source"), r.get("target"), r.get("relation"))
                    
                self.graph_manager.save_graph()
                
                # Calculate stats
                stats = {
                    "node_count": len(self.graph_manager.graph.nodes),
                    "edge_count": len(self.graph_manager.graph.edges),
                    "central_concepts": sorted(self.graph_manager.get_centrality().items(), key=lambda x: x[1], reverse=True)[:5]
                }
                json_res["graph_stats"] = stats
                
            return {
                "response": json_res,
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
            Analyze the provided knowledge graph statistics.
            Identify seminal works (high PageRank) and thematic clusters (communities).
            Output JSON with keys: 'seminal_papers', 'citation_clusters', 'network_structure_analysis'.
            """,
            **kwargs
        )
        from utils.graph_manager import GraphManager
        self.graph_manager = GraphManager()

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Analyzing Network Analytics...")
        
        # 1. Get Real Stats from GraphManager
        pagerank = self.graph_manager.get_pagerank()
        communities = self.graph_manager.get_communities()
        centrality = self.graph_manager.get_centrality()
        
        # Sort and truncate for prompt context
        top_pagerank = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)[:10]
        top_centrality = sorted(centrality.items(), key=lambda x: x[1], reverse=True)[:10]
        
        analytics_summary = f"""
        Graph Stats:
        - Total Nodes: {len(self.graph_manager.graph.nodes)}
        - Total Edges: {len(self.graph_manager.graph.edges)}
        
        Top Influencers (PageRank):
        {top_pagerank}
        
        Most Connected (Degree Centrality):
        {top_centrality}
        
        Detected Clusters: {len(communities)}
        """
        
        enhanced_prompt = f"{self.system_prompt}\n\nNETWORK METRICS:\n{analytics_summary}"
        
        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=str(state))
        ]
        
        try:
            response = self.llm.invoke(messages)
            json_res = self._extract_json(response.content)
            
            if isinstance(json_res, dict):
                 json_res["_meta_graph_metrics"] = {
                     "pagerank": top_pagerank,
                     "communities_count": len(communities)
                 }
                 
            return {
                "response": json_res,
                "raw": response.content,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e)}
