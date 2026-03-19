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
from typing import Any, Dict
import logging

logger = logging.getLogger("ai_engine.llm")


class LLMProvider(ABC):
    """
    Abstract base class for LLM providers.

    Each provider must implement:
        - get_langchain_llm() -> returns a LangChain chat model
        - is_available()      -> checks if the provider is reachable
        - get_status()        -> returns provider metadata for /llm/status
        - provider_name       -> human-readable name
    """

    NON_RETRYABLE_MODEL_ERRORS = (
        "model_decommissioned",
        "model decommissioned",
        "model_not_found",
        "model not found",
        "does not exist",
        "not found",
        "unknown model",
        "invalid model",
        "unsupported model",
    )
    RETRYABLE_ERRORS = (
        "429",
        "rate_limit",
        "rate limit",
        "too many requests",
        "quota",
        "timeout",
        "timed out",
        "temporarily unavailable",
        "connection reset",
        "connection aborted",
        "service unavailable",
        "internal server error",
        "bad gateway",
        "gateway timeout",
    )

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

    def classify_error(self, error: Exception) -> str:
        """
        Categorize provider errors so retry logic can avoid hopeless retries.

        Returns one of: ``model_invalid``, ``retryable``, ``non_retryable``.
        """
        error_str = str(error).lower()

        if any(token in error_str for token in self.NON_RETRYABLE_MODEL_ERRORS):
            return "model_invalid"

        if any(token in error_str for token in self.RETRYABLE_ERRORS):
            return "retryable"

        return "non_retryable"

    def is_retryable(self, error: Exception) -> bool:
        return self.classify_error(error) == "retryable"

    def invoke_with_retry(self, messages: list) -> Any:
        """
        Synchronous LLM invocation with retry logic for transient failures.
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
                classification = self.classify_error(e)
                if classification != "retryable":
                    raise e

                logger.warning(
                    f"[{self.provider_name}] Transient failure. "
                    f"Attempt {attempt + 1}/{max_retries}. Backing off for {backoff:.1f}s. Error: {e}"
                )
                self.rotate_key()
                time.sleep(backoff)
                backoff *= 2.0
                last_exception = e

        logger.error(f"[{self.provider_name}] All {max_retries} sync retry attempts exhausted.")
        raise last_exception or RuntimeError(f"All {self.provider_name} sync API retries exhausted")

    async def ainvoke_with_retry(self, messages: list) -> Any:
        """
        Asynchronous version of invoke_with_retry.
        """
        import asyncio

        max_retries = 3
        backoff = 1.0
        last_exception = None

        for attempt in range(max_retries):
            try:
                llm = self.get_langchain_llm()
                return await llm.ainvoke(messages)
            except Exception as e:
                classification = self.classify_error(e)
                if classification != "retryable":
                    raise e

                logger.warning(
                    f"[{self.provider_name}] Transient failure. "
                    f"Attempt {attempt + 1}/{max_retries}. Backing off for {backoff:.1f}s. Error: {e}"
                )
                self.rotate_key()
                await asyncio.sleep(backoff)
                backoff *= 2.0
                last_exception = e

        logger.error(f"[{self.provider_name}] All {max_retries} async retry attempts exhausted.")
        raise last_exception or RuntimeError(f"All {self.provider_name} async API retries exhausted")
