import pytest
import json
import sys
import os
from unittest.mock import Mock, patch, MagicMock

# Add ai_engine to path for imports
AI_ENGINE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if AI_ENGINE_DIR not in sys.path:
    sys.path.insert(0, AI_ENGINE_DIR)

from agents.base import BaseAgent
from agents.orchestrator.orchestrator import OrchestratorAgent
from agents.registry import AGENTS

class TestBaseAgent:
    """Tests for BaseAgent functionality"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.mock_llm = Mock()
        self.test_agent = BaseAgent(
            name="TestAgent",
            system_prompt="Test system prompt",
            model_name="phi3:mini"
        )
        self.test_agent.llm = self.mock_llm
    
    def test_token_estimation(self):
        """Test token estimation accuracy"""
        text = "Hello world, this is a test string for token counting"
        tokens = self.test_agent._estimate_tokens(text)
        # Rough estimate: 56 chars / 4 = 14 tokens
        assert 10 <= tokens <= 20, f"Token estimate {tokens} seems unreasonable"
    
    def test_json_extraction_direct(self):
        """Test JSON extraction from clean JSON"""
        json_text = '{"key": "value", "number": 42}'
        result = self.test_agent._extract_json(json_text)
        assert result == {"key": "value", "number": 42}
    
    def test_json_extraction_markdown(self):
        """Test JSON extraction from markdown code block"""
        markdown_text = "Here is the result:\n```json\n{\"status\": \"success\"}\n```\nEnd of response."
        result = self.test_agent._extract_json(markdown_text)
        assert result == {"status": "success"}
    
    def test_json_extraction_embedded(self):
        """Test JSON extraction from conversational text"""
        conversational_text = "I think the answer is {\"result\": \"found\", \"confidence\": 0.95} based on my analysis."
        result = self.test_agent._extract_json(conversational_text)
        assert result == {"result": "found", "confidence": 0.95}
    
    def test_json_extraction_fallback(self):
        """Test JSON extraction fallback to raw text"""
        invalid_text = "This is not JSON at all, just plain text."
        result = self.test_agent._extract_json(invalid_text)
        assert "raw_text" in result
        assert result["raw_text"] == invalid_text
    
    def test_context_truncation(self):
        """Test context truncation for large inputs"""
        large_state = {
            "task": "Test task",
            "_job_id": "123",
            "findings": {
                "agent1": "A" * 1000,  # Large content
                "agent2": "B" * 1000,  # Large content
                "domain_intelligence": "Priority content",  # Should be preserved
            }
        }
        
        truncated = self.test_agent._truncate_context(large_state, max_tokens=100)
        result = json.loads(truncated)
        
        assert "task" in result
        assert "_job_id" in result
        assert "findings" in result
        # Priority agent should be preserved
        assert "domain_intelligence" in result["findings"]
    
    @patch('agents.base.get_llm_provider')
    def test_run_success(self, mock_get_provider):
        """Test successful agent run"""
        # Mock LLM response
        mock_response = Mock()
        mock_response.content = '{"result": "success", "data": "test output"}'
        self.mock_llm.invoke.return_value = mock_response
        mock_provider = Mock()
        mock_provider.get_langchain_llm.return_value = self.mock_llm
        mock_get_provider.return_value = mock_provider
        
        state = {"task": "test task", "_job_id": "123"}
        result = self.test_agent.run(state)
        
        assert "response" in result
        assert "agent" in result
        assert "execution_time" in result
        assert result["agent"] == "TestAgent"
        assert result["response"] == {"result": "success", "data": "test output"}
    
    @patch('agents.base.get_llm_provider')
    def test_run_llm_failure(self, mock_get_provider):
        """Test agent run with LLM failure"""
        # Mock LLM exception
        self.mock_llm.invoke.side_effect = Exception("LLM connection failed")
        mock_provider = Mock()
        mock_provider.get_langchain_llm.return_value = self.mock_llm
        mock_get_provider.return_value = mock_provider
        
        # Use a unique task string to avoid deterministic cache hit from test_run_success
        state = {"task": "test task that should fail", "_job_id": "999"}
        result = self.test_agent.run(state)
        
        assert "error" in result
        assert "LLM connection failed" in result["error"]
        assert result["agent"] == "TestAgent"

class TestOrchestratorAgent:
    """Tests for OrchestratorAgent"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.orchestrator = OrchestratorAgent()
        self.mock_llm = Mock()
        self.orchestrator.llm = self.mock_llm
    
    def test_paper_analysis_routing(self):
        """Test routing to paper analysis pipeline"""
        mock_response = Mock()
        mock_response.content = '{"next_step": "paper_analysis", "plan": "Analyze the specific paper"}'
        self.mock_llm.invoke.return_value = mock_response
        
        state = {
            "task": "Analyze this transformer paper",
            "paper_url": "https://arxiv.org/pdf/1706.03762.pdf"
        }
        
        result = self.orchestrator.run(state)
        assert "next_step" in result
        assert result["next_step"] == "paper_analysis"
    
    def test_literature_review_routing(self):
        """Test routing to literature review pipeline"""
        mock_response = Mock()
        mock_response.content = '{"next_step": "literature_review", "plan": "Survey the field"}'
        self.mock_llm.invoke.return_value = mock_response
        
        state = {
            "task": "Survey recent advances in NLP",
            "paper_url": None
        }
        
        result = self.orchestrator.run(state)
        assert "next_step" in result
        assert result["next_step"] == "literature_review"
    
    def test_fallback_routing(self):
        """Test fallback routing when LLM fails"""
        self.mock_llm.invoke.side_effect = Exception("LLM failed")
        
        # Test paper URL fallback
        state_with_paper = {
            "task": "Test task",
            "paper_url": "https://example.com/paper.pdf"
        }
        result = self.orchestrator.run(state_with_paper)
        assert result["next_step"] == "paper_analysis"
        
        # Test no paper URL fallback
        state_without_paper = {
            "task": "Test task",
            "paper_url": None
        }
        result = self.orchestrator.run(state_without_paper)
        assert result["next_step"] == "literature_review"

class TestAgentRegistry:
    """Tests for agent registry"""
    
    def test_registry_completeness(self):
        """Test that all expected agents are registered"""
        expected_agents = [
            "orchestrator", "domain_intelligence", "historical_review",
            "slr", "gap_synthesis", "innovation_novelty",
            "paper_decomposition", "paper_understanding",
            "technical_verification", "scientific_writing"
        ]
        
        for agent_name in expected_agents:
            assert agent_name in AGENTS, f"Agent {agent_name} not found in registry"
            assert isinstance(AGENTS[agent_name], BaseAgent), f"Agent {agent_name} is not a BaseAgent instance"
    
    def test_agent_initialization(self):
        """Test that all registered agents can be initialized"""
        for agent_name, agent_instance in AGENTS.items():
            assert hasattr(agent_instance, 'name'), f"Agent {agent_name} missing name attribute"
            assert hasattr(agent_instance, 'system_prompt'), f"Agent {agent_name} missing system_prompt"
            assert hasattr(agent_instance, 'run'), f"Agent {agent_name} missing run method"
    
    def test_agent_run_interface(self):
        """Test that all agents conform to run interface"""
        mock_state = {"task": "test", "_job_id": "test"}
        
        # Test just a few agents to avoid long test times
        test_agents = ["orchestrator"]
        
        for agent_name in test_agents:
            agent = AGENTS[agent_name]
            # Mock the LLM to avoid actual API calls
            original_llm = agent.llm
            mock_llm = Mock()
            mock_response = Mock()
            mock_response.content = '{"test": "response"}'
            mock_llm.invoke.return_value = mock_response
            agent.llm = mock_llm
            
            try:
                result = agent.run(mock_state)
                assert isinstance(result, dict), f"Agent {agent_name} run() should return dict"
            finally:
                # Restore original LLM
                agent.llm = original_llm

class TestLLMProviderCaching:
    """Tests for LLM provider factory caching (replaces old TestLLMCaching)"""
    
    def setup_method(self):
        """Clear factory cache before each test."""
        from llm.factory import clear_provider_cache
        clear_provider_cache()

    @patch('llm.factory._get_config')
    def test_provider_cache_reuse(self, mock_config):
        """Test that provider instances are cached and reused"""
        from llm.factory import get_llm_provider
        
        mock_cfg = MagicMock()
        mock_cfg.LLM_STATUS = "OFFLINE"
        mock_cfg.MODEL_REASONING = "phi3:mini"
        mock_cfg.OLLAMA_BASE_URL = "http://localhost:11434"
        mock_cfg.GROQ_API_KEYS = []
        mock_config.return_value = mock_cfg
        
        # First call should create new provider
        provider1 = get_llm_provider("phi3:mini")
        
        # Second call should return cached instance
        provider2 = get_llm_provider("phi3:mini")
        assert provider1 is provider2  # Same object from cache
    
    @patch('llm.factory._get_config')
    def test_provider_cache_different_models(self, mock_config):
        """Test that different models get separate cache entries"""
        from llm.factory import get_llm_provider
        
        mock_cfg = MagicMock()
        mock_cfg.LLM_STATUS = "OFFLINE"
        mock_cfg.MODEL_REASONING = "phi3:mini"
        mock_cfg.OLLAMA_BASE_URL = "http://localhost:11434"
        mock_cfg.GROQ_API_KEYS = []
        mock_config.return_value = mock_cfg
        
        provider1 = get_llm_provider("phi3:mini")
        provider2 = get_llm_provider("gemma2:2b")
        
        assert provider1 is not provider2  # Different model = different provider

if __name__ == "__main__":
    pytest.main([__file__])