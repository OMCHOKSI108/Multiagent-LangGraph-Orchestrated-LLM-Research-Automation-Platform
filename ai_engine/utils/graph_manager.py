"""
Graph Manager Utility

Provides NetworkX-based knowledge graph capabilities for agents.
Supports:
- Node/Edge management
- Graph persistence (JSON/GML)
- Centrality analysis (PageRank, Degree)
- Visualization export (optional)
"""

import networkx as nx
import json
import os
from typing import List, Dict, Any

class GraphManager:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GraphManager, cls).__new__(cls)
            cls._instance.graph = nx.DiGraph()
            cls._instance.storage_path = "output/knowledge_graph.json"
            os.makedirs("output", exist_ok=True)
        return cls._instance

    def add_entity(self, entity_id: str, formatted_name: str, entity_type: str, metadata: Dict = None):
        """Add a node to the graph."""
        if metadata is None: metadata = {}
        self.graph.add_node(entity_id, label=formatted_name, type=entity_type, **metadata)
    
    def add_relationship(self, source: str, target: str, relation: str, weight: float = 1.0):
        """Add an edge between entities."""
        self.graph.add_edge(source, target, relationship=relation, weight=weight)
        
    def get_centrality(self) -> Dict[str, float]:
        """Calculate Degree Centrality for importance."""
        if len(self.graph.nodes) == 0: return {}
        return nx.degree_centrality(self.graph)

    def get_pagerank(self) -> Dict[str, float]:
        """Calculate PageRank for influence."""
        if len(self.graph.nodes) == 0: return {}
        try:
            return nx.pagerank(self.graph)
        except:
            return {}

    def get_communities(self) -> List[List[str]]:
        """Detect communities (clusters)."""
        if len(self.graph.nodes) == 0: return []
        # Simple weak connectivity for now, could use modularity in future
        return list(nx.weakly_connected_components(self.graph))

    def save_graph(self):
        """Persist graph to disk."""
        data = nx.node_link_data(self.graph)
        with open(self.storage_path, "w") as f:
            json.dump(data, f, indent=2)
            
    def load_graph(self):
        """Load graph from disk."""
        if os.path.exists(self.storage_path):
            with open(self.storage_path, "r") as f:
                data = json.load(f)
                self.graph = nx.node_link_graph(data)

    def clear(self):
        self.graph.clear()
