#!/usr/bin/env python3
"""
Unit tests for the dual-mode LLM Provider abstraction layer.

Tests cover:
    - OllamaProvider instantiation and fallback logic
    - GroqProvider multi-key rotation and rate-limit retry
    - Factory mode selection based on LLM_STATUS
    - Config validation

Run:
    cd d:\SEM 6\AIML317_PROJECT_III\project_sgp\ai_engine
    python -m pytest tests/test_llm_providers.py -v
"""

import sys
import os
import pytest
from unittest.mock import patch, MagicMock

# Add ai_engine to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ============================
# OllamaProvider Tests
# ============================
class TestOllamaProvider:
    """Tests for the OllamaProvider class."""

    def test_instantiation(self):
        """OllamaProvider should initialize with correct default values."""
        from llm.ollama_provider import OllamaProvider

        provider = OllamaProvider(model_name="phi3:mini")
        assert provider.provider_name == "ollama"
        assert provider.model_name == "phi3:mini"
        assert provider.base_url == "http://localhost:11434"
        assert provider.temperature == 0.7

    def test_custom_base_url(self):
        """OllamaProvider should accept a custom base URL."""
        from llm.ollama_provider import OllamaProvider

        provider = OllamaProvider(
            model_name="phi3:mini",
            base_url="http://custom-host:11434/"
        )
        # Trailing slash should be stripped
        assert provider.base_url == "http://custom-host:11434"

    @patch("llm.ollama_provider.requests.get")
    def test_is_available_success(self, mock_get):
        """is_available() should return True when Ollama server responds."""
        from llm.ollama_provider import OllamaProvider

        mock_get.return_value = MagicMock(status_code=200)
        provider = OllamaProvider(model_name="phi3:mini")
        assert provider.is_available() is True

    @patch("llm.ollama_provider.requests.get")
    def test_is_available_failure(self, mock_get):
        """is_available() should return False when Ollama server is unreachable."""
        from llm.ollama_provider import OllamaProvider

        mock_get.side_effect = ConnectionError("Connection refused")
        provider = OllamaProvider(model_name="phi3:mini")
        assert provider.is_available() is False

    @patch("llm.ollama_provider.requests.get")
    def test_model_fallback(self, mock_get):
        """_resolve_model() should fall back when the requested model is not found."""
        from llm.ollama_provider import OllamaProvider, FALLBACK_MODEL

        # Simulate server with only the fallback model installed
        mock_response = MagicMock(status_code=200)
        mock_response.json.return_value = {
            "models": [{"name": FALLBACK_MODEL}]
        }
        mock_get.return_value = mock_response

        provider = OllamaProvider(model_name="nonexistent-model")
        resolved = provider._resolve_model()
        assert resolved == FALLBACK_MODEL

    def test_get_status_structure(self):
        """get_status() should return the expected dict structure."""
        from llm.ollama_provider import OllamaProvider

        provider = OllamaProvider(model_name="phi3:mini")
        with patch.object(provider, "is_available", return_value=False):
            status = provider.get_status()

        assert "provider" in status
        assert "model" in status
        assert "available" in status
        assert status["provider"] == "ollama"
        assert status["model"] == "phi3:mini"


# ============================
# GroqProvider Tests
# ============================
class TestGroqProvider:
    """Tests for the GroqProvider class."""

    def test_instantiation(self):
        """GroqProvider should initialize with filtered API keys."""
        from llm.groq_provider import GroqProvider

        provider = GroqProvider(
            api_keys=["key1", "", "key3", None, "  key2  "],
            model_name="llama3-70b-8192",
        )
        assert provider.provider_name == "groq"
        assert len(provider.api_keys) == 3
        assert provider.api_keys == ["key1", "key3", "key2"]

    def test_no_keys_not_available(self):
        """is_available() should return False when no keys are configured."""
        from llm.groq_provider import GroqProvider

        provider = GroqProvider(api_keys=[], model_name="test")
        assert provider.is_available() is False

    def test_with_keys_is_available(self):
        """is_available() should return True when keys are configured."""
        from llm.groq_provider import GroqProvider

        provider = GroqProvider(api_keys=["key1"], model_name="test")
        assert provider.is_available() is True

    def test_key_rotation_round_robin(self):
        """Keys should rotate in round-robin fashion."""
        from llm.groq_provider import GroqProvider

        provider = GroqProvider(
            api_keys=["key-a", "key-b", "key-c"],
            model_name="test"
        )

        # Get indices sequentially
        idx1 = provider._get_next_key_index()
        idx2 = provider._get_next_key_index()
        idx3 = provider._get_next_key_index()
        idx4 = provider._get_next_key_index()  # Should wrap around

        assert idx1 == 0
        assert idx2 == 1
        assert idx3 == 2
        assert idx4 == 0  # Wraps back

    def test_get_langchain_llm_no_keys_raises(self):
        """get_langchain_llm() should raise when no keys are configured."""
        from llm.groq_provider import GroqProvider

        provider = GroqProvider(api_keys=[], model_name="test")
        with pytest.raises(RuntimeError, match="No Groq API keys"):
            provider.get_langchain_llm()

    def test_get_status_structure(self):
        """get_status() should return the expected dict structure."""
        from llm.groq_provider import GroqProvider

        provider = GroqProvider(
            api_keys=["key1", "key2"],
            model_name="llama3-70b-8192"
        )
        status = provider.get_status()

        assert status["provider"] == "groq"
        assert status["total_keys"] == 2
        assert status["key_rotation"] == "round-robin"
        assert status["available"] is True


# ============================
# Factory Tests
# ============================
class TestFactory:
    """Tests for the provider factory."""

    def setup_method(self):
        """Clear the provider cache before each test."""
        from llm.factory import clear_provider_cache
        clear_provider_cache()

    @patch("llm.factory._get_config")
    def test_offline_mode_returns_ollama(self, mock_config):
        """OFFLINE mode should return an OllamaProvider."""
        from llm.factory import get_llm_provider
        from llm.ollama_provider import OllamaProvider

        mock_cfg = MagicMock()
        mock_cfg.LLM_STATUS = "OFFLINE"
        mock_cfg.MODEL_REASONING = "phi3:mini"
        mock_cfg.OLLAMA_BASE_URL = "http://localhost:11434"
        mock_cfg.GROQ_API_KEYS = []
        mock_config.return_value = mock_cfg

        provider = get_llm_provider("phi3:mini")
        assert isinstance(provider, OllamaProvider)

    @patch("llm.factory._get_config")
    def test_online_mode_returns_groq(self, mock_config):
        """ONLINE mode with keys should return a GroqProvider."""
        from llm.factory import get_llm_provider
        from llm.groq_provider import GroqProvider

        mock_cfg = MagicMock()
        mock_cfg.LLM_STATUS = "ONLINE"
        mock_cfg.MODEL_REASONING = "phi3:mini"
        mock_cfg.GROQ_API_KEYS = ["key1", "key2"]
        mock_config.return_value = mock_cfg

        provider = get_llm_provider("llama3-70b-8192")
        assert isinstance(provider, GroqProvider)

    @patch("llm.factory._get_config")
    def test_online_fallback_to_ollama_when_no_keys(self, mock_config):
        """ONLINE mode without keys should fall back to OllamaProvider."""
        from llm.factory import get_llm_provider
        from llm.ollama_provider import OllamaProvider

        mock_cfg = MagicMock()
        mock_cfg.LLM_STATUS = "ONLINE"
        mock_cfg.MODEL_REASONING = "phi3:mini"
        mock_cfg.GROQ_API_KEYS = []
        mock_cfg.OLLAMA_BASE_URL = "http://localhost:11434"
        mock_config.return_value = mock_cfg

        provider = get_llm_provider("phi3:mini")
        assert isinstance(provider, OllamaProvider)

    @patch("llm.factory._get_config")
    def test_get_llm_status_structure(self, mock_config):
        """get_llm_status() should return mode, provider, and config."""
        from llm.factory import get_llm_status

        mock_cfg = MagicMock()
        mock_cfg.LLM_STATUS = "OFFLINE"
        mock_cfg.MODEL_REASONING = "phi3:mini"
        mock_cfg.MODEL_WRITING = "gemma2:2b"
        mock_cfg.MODEL_CODING = "qwen2.5-coder:1.5b"
        mock_cfg.MODEL_CRITICAL = "phi3:mini"
        mock_cfg.MAX_TOKENS = 4096
        mock_cfg.OLLAMA_BASE_URL = "http://localhost:11434"
        mock_cfg.GROQ_API_KEYS = []
        mock_config.return_value = mock_cfg

        status = get_llm_status()

        assert status["mode"] == "OFFLINE"
        assert "provider" in status
        assert "config" in status
        assert status["config"]["model_reasoning"] == "phi3:mini"

    @patch("llm.factory._get_config")
    def test_provider_caching(self, mock_config):
        """Same (mode, model) should return the cached provider instance."""
        from llm.factory import get_llm_provider

        mock_cfg = MagicMock()
        mock_cfg.LLM_STATUS = "OFFLINE"
        mock_cfg.MODEL_REASONING = "phi3:mini"
        mock_cfg.OLLAMA_BASE_URL = "http://localhost:11434"
        mock_cfg.GROQ_API_KEYS = []
        mock_config.return_value = mock_cfg

        provider1 = get_llm_provider("phi3:mini")
        provider2 = get_llm_provider("phi3:mini")
        assert provider1 is provider2  # Same object from cache


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
