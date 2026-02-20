"""
LLM Provider Abstraction Layer
===============================
Provides a unified interface for switching between Ollama (offline)
and Groq (online) LLM providers based on the LLM_STATUS environment variable.

Usage:
    from llm import get_llm_provider, get_llm_status

    provider = get_llm_provider("phi3:mini")
    llm = provider.get_langchain_llm()
    status = get_llm_status()
"""

from .factory import get_llm_provider, get_llm_status
from .base import LLMProvider

__all__ = ["get_llm_provider", "get_llm_status", "LLMProvider"]
