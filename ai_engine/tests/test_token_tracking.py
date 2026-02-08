import pytest
import tempfile
import os
import json
import sys
from unittest.mock import patch, mock_open

# Add ai_engine to path for imports
AI_ENGINE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if AI_ENGINE_DIR not in sys.path:
    sys.path.insert(0, AI_ENGINE_DIR)

from utils.token_tracker import (
    TokenTracker, TokenUsage, 
    track_agent_usage, get_usage_stats, get_job_usage,
    get_global_tracker
)

class TestTokenUsage:
    """Tests for TokenUsage dataclass"""
    
    def test_token_usage_creation(self):
        """Test TokenUsage object creation"""
        usage = TokenUsage(
            timestamp="2026-02-07T10:00:00Z",
            agent_name="TestAgent",
            model_name="phi3:mini",
            job_id="123",
            prompt_tokens=100,
            completion_tokens=50,
            total_tokens=150,
            estimated_cost=0.001,
            execution_time_ms=1500,
            success=True
        )
        
        assert usage.agent_name == "TestAgent"
        assert usage.model_name == "phi3:mini"
        assert usage.total_tokens == 150
        assert usage.estimated_cost == 0.001
        assert usage.success is True

class TestTokenTracker:
    """Tests for TokenTracker class"""
    
    def setup_method(self):
        """Setup test fixtures"""
        # Use temporary file for testing
        self.temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
        self.temp_file.close()
        self.tracker = TokenTracker(persist_path=self.temp_file.name)
    
    def teardown_method(self):
        """Cleanup test fixtures"""
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)
    
    def test_token_estimation(self):
        """Test token estimation accuracy"""
        text = "Hello world, this is a test"
        tokens = self.tracker.estimate_tokens(text)
        # 28 chars / 4 = 7 tokens (rough estimate)
        assert 5 <= tokens <= 10
    
    def test_cost_calculation(self):
        """Test cost calculation for different models"""
        # Test Ollama model (free)
        cost_ollama = self.tracker.calculate_cost("phi3:mini", 1000, 500)
        assert cost_ollama == 0.0
        
        # Test Gemini model
        cost_gemini = self.tracker.calculate_cost("gemini-2.5-flash", 1000, 500)
        assert cost_gemini > 0
        # 1000 * 0.00035 + 500 * 0.0014 = 0.35 + 0.7 = 1.05 (per 1K tokens)
        assert abs(cost_gemini - 1.05) < 0.01
    
    def test_usage_tracking(self):
        """Test tracking usage records"""
        usage = self.tracker.track_usage(
            agent_name="TestAgent",
            model_name="phi3:mini",
            prompt_text="Test prompt",
            completion_text="Test completion",
            execution_time_ms=1000,
            job_id="job123",
            success=True
        )
        
        assert isinstance(usage, TokenUsage)
        assert usage.agent_name == "TestAgent"
        assert usage.model_name == "phi3:mini"
        assert usage.job_id == "job123"
        assert usage.success is True
        assert len(self.tracker.usage_records) == 1
    
    def test_stats_empty(self):
        """Test stats with no records"""
        stats = self.tracker.get_stats(24)
        
        assert stats["total_requests"] == 0
        assert stats["total_tokens"] == 0
        assert stats["total_cost"] == 0.0
        assert stats["success_rate"] == 0.0
        assert stats["by_agent"] == {}
        assert stats["by_model"] == {}
    
    def test_stats_with_records(self):
        """Test stats calculation with records"""
        # Add some test records
        self.tracker.track_usage("Agent1", "phi3:mini", "prompt1", "completion1", 1000, "job1")
        self.tracker.track_usage("Agent2", "gemma2:2b", "prompt2", "completion2", 1500, "job1")
        self.tracker.track_usage("Agent1", "phi3:mini", "prompt3", "completion3", 800, "job2", success=False)
        
        stats = self.tracker.get_stats(24)
        
        assert stats["total_requests"] == 3
        assert stats["total_tokens"] > 0
        assert stats["success_rate"] == 66.7  # 2/3 * 100
        
        # Check by_agent stats
        assert "Agent1" in stats["by_agent"]
        assert "Agent2" in stats["by_agent"]
        assert stats["by_agent"]["Agent1"]["requests"] == 2
        assert stats["by_agent"]["Agent2"]["requests"] == 1
        
        # Check by_model stats
        assert "phi3:mini" in stats["by_model"]
        assert "gemma2:2b" in stats["by_model"]
        assert stats["by_model"]["phi3:mini"]["requests"] == 2
    
    def test_job_stats(self):
        """Test job-specific statistics"""
        # Add records for specific job
        self.tracker.track_usage("Agent1", "phi3:mini", "prompt1", "completion1", 1000, "job123")
        self.tracker.track_usage("Agent2", "gemma2:2b", "prompt2", "completion2", 1500, "job123")
        self.tracker.track_usage("Agent3", "phi3:mini", "prompt3", "completion3", 800, "job456")  # Different job
        
        job_stats = self.tracker.get_job_stats("job123")
        
        assert job_stats["found"] is True
        assert job_stats["job_id"] == "job123"
        assert job_stats["agents_used"] == 2
        assert job_stats["total_requests"] == 2
        assert "Agent1" in job_stats["agents"]
        assert "Agent2" in job_stats["agents"]
        assert "Agent3" not in job_stats["agents"]
        
        # Test nonexistent job
        empty_stats = self.tracker.get_job_stats("nonexistent")
        assert empty_stats["found"] is False
    
    def test_persistence(self):
        """Test data persistence to disk"""
        # Add some records
        self.tracker.track_usage("Agent1", "phi3:mini", "prompt", "completion", 1000, "job1")
        
        # Create new tracker with same file
        new_tracker = TokenTracker(persist_path=self.temp_file.name)
        
        # Should load existing records
        assert len(new_tracker.usage_records) == 1
        assert new_tracker.usage_records[0].agent_name == "Agent1"
    
    @patch('builtins.open', side_effect=PermissionError("Cannot write"))
    def test_persistence_failure(self, mock_open):
        """Test handling of persistence failures"""
        # Should not crash when saving fails
        self.tracker.track_usage("Agent1", "phi3:mini", "prompt", "completion", 1000, "job1")
        # If we get here, no exception was raised
        assert len(self.tracker.usage_records) == 1
    
    def test_load_corrupted_file(self):
        """Test loading from corrupted persistence file"""
        # Write corrupted JSON
        with open(self.temp_file.name, 'w') as f:
            f.write("invalid json {")
        
        # Should handle gracefully
        tracker = TokenTracker(persist_path=self.temp_file.name)
        assert len(tracker.usage_records) == 0

class TestGlobalTracker:
    """Tests for global tracker functions"""
    
    def test_global_tracker_singleton(self):
        """Test that global tracker is singleton"""
        tracker1 = get_global_tracker()
        tracker2 = get_global_tracker()
        
        assert tracker1 is tracker2
    
    def test_track_agent_usage_convenience(self):
        """Test convenience function for tracking usage"""
        usage = track_agent_usage(
            agent_name="TestAgent",
            model_name="phi3:mini",
            prompt_text="Test prompt",
            completion_text="Test completion",
            execution_time_ms=1200,
            job_id="convenience_test"
        )
        
        assert isinstance(usage, TokenUsage)
        assert usage.agent_name == "TestAgent"
        assert usage.job_id == "convenience_test"
    
    def test_get_usage_stats_convenience(self):
        """Test convenience function for getting stats"""
        # Add some usage first
        track_agent_usage("Agent1", "phi3:mini", "prompt", "completion", 1000, "test_job")
        
        stats = get_usage_stats(24)
        
        assert "total_requests" in stats
        assert stats["total_requests"] >= 1
    
    def test_get_job_usage_convenience(self):
        """Test convenience function for getting job stats"""
        # Add some usage first
        track_agent_usage("Agent1", "phi3:mini", "prompt", "completion", 1000, "specific_job")
        
        job_stats = get_job_usage("specific_job")
        
        assert job_stats["found"] is True
        assert job_stats["job_id"] == "specific_job"

class TestTokenTrackerEdgeCases:
    """Tests for edge cases and error conditions"""
    
    def test_empty_text_estimation(self):
        """Test token estimation for empty text"""
        tracker = TokenTracker()
        tokens = tracker.estimate_tokens("")
        assert tokens >= 1  # Should return at least 1
    
    def test_very_long_text(self):
        """Test handling of very long text"""
        tracker = TokenTracker()
        long_text = "word " * 10000  # 50,000 chars
        tokens = tracker.estimate_tokens(long_text)
        assert tokens > 10000  # Should be reasonable estimate
    
    def test_unknown_model_cost(self):
        """Test cost calculation for unknown model"""
        tracker = TokenTracker()
        cost = tracker.calculate_cost("unknown_model", 1000, 500)
        # Should use default costs
        assert cost >= 0
    
    def test_negative_tokens(self):
        """Test handling of negative token values"""
        tracker = TokenTracker()
        cost = tracker.calculate_cost("phi3:mini", -100, -50)
        # Should handle gracefully (likely zero cost for Ollama)
        assert cost >= 0

if __name__ == "__main__":
    pytest.main([__file__])