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

    def __init__(self, provider_name: str = "unknown", model_name: str = "", temperature: float = 0.7):
        self._provider_name = provider_name
        self.model_name = model_name
        self.temperature = temperature

    @property
    def provider_name(self) -> str:
        """Human-readable name of the provider (e.g., 'ollama', 'groq')."""
        return self._provider_name

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
        """
        ...
        
    def rotate_key(self) -> str:
        """
        Moves to the next API key. Providers that support rotation should override this.
        Returns the new active key, or empty string if unsupported.
        """
        return ""

    def invoke_with_retry(self, messages: list) -> Any:
        """
        Synchronous LLM invocation with retry logic for rate limits.
        """
        import time
        max_retries = 3
        backoff = 1.0

        last_exception = None

        for attempt in range(max_retries):
            try:
                llm = self.get_langchain_llm()
                return llm.invoke(messages)
            except Exception as e:
                error_str = str(e).lower()
                is_rate_limit = (
                    "429" in error_str
                    or "rate_limit" in error_str
                    or "rate limit" in error_str
                    or "too many requests" in error_str
                    or "quota" in error_str
                )

                if is_rate_limit:
                    logger.warning(
                        f"[{self.provider_name}] Rate limit hit. "
                        f"Attempt {attempt + 1}/{max_retries}. Backing off for {backoff:.1f}s."
                    )
                    self.rotate_key()
                    time.sleep(backoff)
                    backoff *= 2.0
                    last_exception = e
                    continue
                else:
                    raise e

        logger.error(f"[{self.provider_name}] All {max_retries} sync retry attempts exhausted.")
        raise last_exception or RuntimeError(f"All {self.provider_name} sync API retries exhausted")

    async def ainvoke_with_retry(self, messages: list) -> Any:
        """
        Asynchronous version of invoke_with_retry.
        """
        import asyncio
        import time
        max_retries = 3
        backoff = 1.0
        
        last_exception = None
        
        for attempt in range(max_retries):
            try:
                llm = self.get_langchain_llm()
                return await llm.ainvoke(messages)
            except Exception as e:
                error_str = str(e).lower()
                is_rate_limit = (
                    "429" in error_str
                    or "rate_limit" in error_str
                    or "rate limit" in error_str
                    or "too many requests" in error_str
                    or "quota" in error_str
                )
                
                if is_rate_limit:
                    logger.warning(
                        f"[{self.provider_name}] Rate limit hit. "
                        f"Attempt {attempt + 1}/{max_retries}. Backing off for {backoff:.1f}s."
                    )
                    self.rotate_key()
                    await asyncio.sleep(backoff)
                    backoff *= 2.0
                    last_exception = e
                    continue
                else:
                    raise e
                    
        logger.error(f"[{self.provider_name}] All {max_retries} async retry attempts exhausted.")
        raise last_exception or RuntimeError(f"All {self.provider_name} async API retries exhausted")

