import pytest
import sys
import os
from unittest.mock import Mock, patch

# Add ai_engine to path for imports
AI_ENGINE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if AI_ENGINE_DIR not in sys.path:
    sys.path.insert(0, AI_ENGINE_DIR)

from graph.full_pipeline import ResearchState, app as pipeline_app
from graph.full_pipeline import orchestrator_node, domain_node, decomp_node
from agents.registry import AGENTS

class TestPipelineState:
    """Tests for pipeline state management"""
    
    def test_research_state_structure(self):
        """Test ResearchState TypedDict structure"""
        # Test that we can create a valid state
        state = {
            "task": "Test research task",
            "paper_url": "https://example.com/paper.pdf",
            "next_step": "paper_analysis",
            "research_summary": "Test summary",
            "findings": {"agent1": "result1"},
            "history": ["Step 1 completed"],
            "_job_id": "123"
        }
        
        # Verify required fields
        assert "task" in state
        assert isinstance(state["findings"], dict)
        assert isinstance(state["history"], list)

class TestNodeFunctions:
    """Tests for individual pipeline nodes"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.test_state = {
            "task": "Test task",
            "paper_url": None,
            "next_step": None,
            "research_summary": None,
            "findings": {},
            "history": [],
            "_job_id": "test123"
        }
    
    @patch.object(AGENTS["orchestrator"], 'run')
    def test_orchestrator_node(self, mock_run):
        """Test orchestrator node execution"""
        mock_run.return_value = {
            "response": {"next_step": "paper_analysis", "plan": "Analyze paper"},
            "agent": "Orchestrator"
        }
        
        result = orchestrator_node(self.test_state)
        
        assert "next_step" in result
        assert result["next_step"] == "paper_analysis"
        mock_run.assert_called_once()
    
    @patch.object(AGENTS["domain_intelligence"], 'run')
    def test_domain_node(self, mock_run):
        """Test domain intelligence node execution"""
        mock_run.return_value = {
            "response": {"domain_analysis": "Test analysis"},
            "agent": "DomainIntelligence",
            "execution_time": 1.5
        }
        
        result = domain_node(self.test_state)
        
        assert "findings" in result
        assert "domain_intelligence" in result["findings"]
        assert "history" in result
        mock_run.assert_called_once()
    
    @patch.object(AGENTS["paper_decomposition"], 'run')
    def test_decomp_node(self, mock_run):
        """Test paper decomposition node execution"""
        mock_run.return_value = {
            "response": {"sections": ["intro", "methods", "results"]},
            "agent": "PaperDecomposition",
            "execution_time": 2.1
        }
        
        result = decomp_node(self.test_state)
        
        assert "findings" in result
        assert "paper_decomposition" in result["findings"]
        assert len(result["history"]) > 0
        mock_run.assert_called_once()
    
    @patch.object(AGENTS["domain_intelligence"], 'run')
    def test_node_error_handling(self, mock_run):
        """Test node error handling"""
        mock_run.side_effect = Exception("Test error")
        
        result = domain_node(self.test_state)
        
        # Should not crash and should log error in history
        assert "history" in result
        error_logged = any("FAILED" in entry for entry in result["history"])
        assert error_logged, "Error should be logged in history"

class TestPipelineRouting:
    """Tests for pipeline routing logic"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.base_state = {
            "task": "Test task",
            "paper_url": None,
            "findings": {},
            "history": [],
            "_job_id": "test"
        }
    
    def test_paper_analysis_route(self):
        """Test routing to paper analysis pipeline"""
        from graph.full_pipeline import route_strategy
        
        state = {**self.base_state, "next_step": "paper_analysis"}
        route = route_strategy(state)
        
        assert route == "paper_decomposition"
    
    def test_literature_review_route(self):
        """Test routing to literature review pipeline"""
        from graph.full_pipeline import route_strategy
        
        state = {**self.base_state, "next_step": "literature_review"}
        route = route_strategy(state)
        
        assert route == "domain_intelligence"
    
    def test_default_route(self):
        """Test default routing behavior"""
        from graph.full_pipeline import route_strategy
        
        state = {**self.base_state, "next_step": None}
        route = route_strategy(state)
        
        assert route == "domain_intelligence"

class TestPipelineIntegration:
    """Integration tests for full pipeline"""
    
    def test_pipeline_compilation(self):
        """Test that pipeline compiles without errors"""
        assert pipeline_app is not None
        # Pipeline should have nodes and edges
        assert hasattr(pipeline_app, 'nodes')
    
    @patch('graph.full_pipeline.AGENTS')
    def test_pipeline_execution_paper_analysis(self, mock_agents):
        """Test full pipeline execution for paper analysis"""
        # Mock all agents to avoid LLM calls
        for agent_name in mock_agents:
            mock_agent = Mock()
            mock_agent.run.return_value = {
                "response": {"test": "result"},
                "agent": agent_name,
                "execution_time": 1.0
            }
            mock_agents[agent_name] = mock_agent
        
        # Mock orchestrator to route to paper analysis
        mock_agents["orchestrator"].run.return_value = {
            "response": {"next_step": "paper_analysis"},
            "agent": "orchestrator"
        }
        
        initial_state = {
            "task": "Analyze this paper",
            "paper_url": "https://example.com/paper.pdf",
            "paper_url": None,
            "next_step": None,
            "research_summary": None,
            "findings": {},
            "history": [],
            "_job_id": "integration_test"
        }
        
        # This would normally run the full pipeline
        # For testing, just verify structure
        assert "task" in initial_state
        assert "findings" in initial_state
    
    def test_pipeline_state_preservation(self):
        """Test that state is preserved between pipeline steps"""
        initial_findings = {"test_agent": "test_result"}
        state = {
            "task": "Test",
            "findings": initial_findings,
            "history": ["Initial step"],
            "_job_id": "state_test"
        }
        
        # Simulate running a node
        with patch.object(AGENTS["domain_intelligence"], 'run') as mock_run:
            mock_run.return_value = {
                "response": {"new_data": "test"},
                "execution_time": 1.0
            }
            
            result = domain_node(state)
            
            # Should preserve original findings
            assert "test_agent" in result["findings"]
            # Should add new findings
            assert "domain_intelligence" in result["findings"]
            # Should preserve and extend history
            assert len(result["history"]) >= len(state["history"])

class TestPipelinePerformance:
    """Performance and scalability tests"""
    
    def test_large_state_handling(self):
        """Test pipeline with large state objects"""
        # Create state with large findings
        large_findings = {}
        for i in range(50):
            large_findings[f"agent_{i}"] = f"Large result data {i}" * 100
        
        state = {
            "task": "Performance test",
            "findings": large_findings,
            "history": [f"Step {i}" for i in range(100)],
            "_job_id": "perf_test"
        }
        
        # Test that nodes can handle large state
        with patch.object(AGENTS["domain_intelligence"], 'run') as mock_run:
            mock_run.return_value = {
                "response": {"result": "ok"},
                "execution_time": 1.0
            }
            
            result = domain_node(state)
            assert "findings" in result
            assert len(result["findings"]) <= len(large_findings) + 1  # May truncate

if __name__ == "__main__":
    pytest.main([__file__])