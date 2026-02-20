"""
Abstract LLM Provider Interface
================================
Defines the contract that all LLM providers (Ollama, Groq, future providers)
must implement. This ensures a consistent API regardless of the underlying
inference engine.

Design Decision:
    We return LangChain-compatible LLM objects because all existing agents
    use `self.llm.invoke(messages)`. This keeps the migration seamless.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List
import logging

logger = logging.getLogger("ai_engine.llm")


class LLMProvider(ABC):
    """
    Abstract base class for LLM providers.

    Each provider must implement:
        - get_langchain_llm() → returns a LangChain chat model
        - is_available()      → checks if the provider is reachable
        - get_status()        → returns provider metadata for /llm/status
        - provider_name       → human-readable name
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable name of the provider (e.g., 'ollama', 'groq')."""
        ...

    @abstractmethod
    def get_langchain_llm(self) -> Any:
        """
        Returns a LangChain-compatible chat model instance.

        The returned object must support `.invoke(messages)` where messages
        is a list of LangChain message objects (SystemMessage, HumanMessage, etc.).
        """
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """
        Checks if the provider is reachable and ready to serve requests.

        For Ollama: pings the local server.
        For Groq: checks that at least one valid API key is configured.
        """
        ...

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """
        Returns status metadata for the /llm/status endpoint.

        Must include at minimum:
            - provider: str
            - model: str
            - available: bool
        """
        ...
