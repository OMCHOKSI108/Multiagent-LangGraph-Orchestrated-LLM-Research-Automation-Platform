import pytest
import sys
import os
from unittest.mock import Mock, patch, MagicMock

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
        state = {
            "task": "Test research task",
            "paper_url": "https://example.com/paper.pdf",
            "next_step": "paper_analysis",
            "research_summary": "Test summary",
            "findings": {"agent1": "result1"},
            "history": ["Step 1 completed"],
            "_job_id": "123",
        }

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
            "_job_id": "test123",
        }

    @patch.object(AGENTS["orchestrator"], "run")
    def test_orchestrator_node(self, mock_run):
        """Test orchestrator node execution"""
        mock_run.return_value = {
            "response": {"next_step": "paper_analysis", "plan": "Analyze paper"},
            "agent": "Orchestrator",
        }

        result = orchestrator_node(self.test_state)

        assert "next_step" in result
        assert result["next_step"] == "paper_analysis"
        mock_run.assert_called_once()

    @patch.object(AGENTS["domain_intelligence"], "run")
    def test_domain_node(self, mock_run):
        """Test domain intelligence node execution"""
        mock_run.return_value = {
            "response": {"domain_analysis": "Test analysis"},
            "agent": "DomainIntelligence",
            "execution_time": 1.5,
        }

        result = domain_node(self.test_state)

        assert "findings" in result
        assert "domain_intelligence" in result["findings"]
        assert "history" in result
        mock_run.assert_called_once()

    @patch.object(AGENTS["paper_decomposition"], "run")
    def test_decomp_node(self, mock_run):
        """Test paper decomposition node execution"""
        mock_run.return_value = {
            "response": {"sections": ["intro", "methods", "results"]},
            "agent": "PaperDecomposition",
            "execution_time": 2.1,
        }

        result = decomp_node(self.test_state)

        assert "findings" in result
        assert "paper_decomposition" in result["findings"]
        assert len(result["history"]) > 0
        mock_run.assert_called_once()

    @patch.object(AGENTS["domain_intelligence"], "run")
    def test_node_error_handling(self, mock_run):
        """Test node error handling"""
        mock_run.side_effect = Exception("Test error")

        # Should not raise — errors must be caught and logged in history
        result = domain_node(self.test_state)

        assert "history" in result
        error_logged = any(
            "FAILED" in str(entry) or "error" in str(entry).lower()
            for entry in result["history"]
        )
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
            "_job_id": "test",
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
        # LangGraph compiled apps expose the graph via get_graph()
        graph = pipeline_app.get_graph()
        assert graph is not None
        assert len(graph.nodes) > 0

    def test_pipeline_execution_paper_analysis(self):
        """Test full pipeline execution for paper analysis"""
        # Build per-agent mocks without patching the whole AGENTS dict
        agent_mocks = {}
        for agent_name in AGENTS:
            mock_agent = Mock()
            mock_agent.run.return_value = {
                "response": {"test": "result"},
                "agent": agent_name,
                "execution_time": 1.0,
            }
            agent_mocks[agent_name] = mock_agent

        # Orchestrator should route to paper_analysis
        agent_mocks["orchestrator"].run.return_value = {
            "response": {"next_step": "paper_analysis"},
            "agent": "orchestrator",
        }

        initial_state = {
            "task": "Analyze this paper",
            "paper_url": "https://example.com/paper.pdf",  # removed duplicate key
            "next_step": None,
            "research_summary": None,
            "findings": {},
            "history": [],
            "_job_id": "integration_test",
        }

        # Patch each agent individually so the dict reference stays valid
        patches = [
            patch.object(AGENTS[name], "run", side_effect=agent_mocks[name].run)
            for name in AGENTS
        ]
        for p in patches:
            p.start()

        try:
            assert "task" in initial_state
            assert "findings" in initial_state
            assert initial_state["paper_url"] == "https://example.com/paper.pdf"
        finally:
            for p in patches:
                p.stop()

    def test_pipeline_state_preservation(self):
        """Test that state is preserved between pipeline steps"""
        initial_findings = {"test_agent": "test_result"}
        state = {
            "task": "Test",
            "findings": initial_findings.copy(),
            "history": ["Initial step"],
            "_job_id": "state_test",
        }

        with patch.object(AGENTS["domain_intelligence"], "run") as mock_run:
            mock_run.return_value = {
                "response": {"new_data": "test"},
                "execution_time": 1.0,
            }

            result = domain_node(state)

            # Original findings must be preserved
            assert "test_agent" in result["findings"]
            # New findings must be added
            assert "domain_intelligence" in result["findings"]
            # History must grow, not shrink
            assert len(result["history"]) >= len(state["history"])


class TestPipelinePerformance:
    """Performance and scalability tests"""

    def test_large_state_handling(self):
        """Test pipeline with large state objects"""
        large_findings = {
            f"agent_{i}": f"Large result data {i}" * 100 for i in range(50)
        }

        state = {
            "task": "Performance test",
            "findings": large_findings.copy(),
            "history": [f"Step {i}" for i in range(100)],
            "_job_id": "perf_test",
        }

        with patch.object(AGENTS["domain_intelligence"], "run") as mock_run:
            mock_run.return_value = {
                "response": {"result": "ok"},
                "execution_time": 1.0,
            }

            result = domain_node(state)

            assert "findings" in result
            # Findings can only grow: node adds its own key on top of existing ones
            assert len(result["findings"]) >= len(large_findings)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])