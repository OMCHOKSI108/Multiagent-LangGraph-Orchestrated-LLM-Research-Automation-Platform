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
                # Track API usage for monitoring
                self._record_api_call_start()
                llm = self.get_langchain_llm()
                result = llm.invoke(messages)
                self._record_api_call_success(result)
                return result
            except Exception as e:
                self._record_api_call_error(e)
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
        raise last_exception

    async def ainvoke_with_retry(self, messages: list) -> Any:
        """
        Asynchronous LLM invocation with retry logic for transient failures.
        """
        import asyncio

        max_retries = 3
        backoff = 1.0
        last_exception = None

        for attempt in range(max_retries):
            try:
                # Track API usage for monitoring
                self._record_api_call_start()
                llm = self.get_langchain_llm()
                result = await llm.ainvoke(messages)
                self._record_api_call_success(result)
                return result
            except Exception as e:
                self._record_api_call_error(e)
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
        raise last_exception or RuntimeError(f"All {self.provider_name} sync API retries exhausted")

    async def astream_with_retry(self, messages: list):
        """
        Asynchronous streaming version of ainvoke_with_retry.
        """
        import asyncio

        max_retries = 3
        backoff = 1.0
        last_exception = None

        for attempt in range(max_retries):
            try:
                llm = self.get_langchain_llm()
                async for chunk in llm.astream(messages):
                    yield chunk
                return # Successful completion
            except Exception as e:
                classification = self.classify_error(e)
                if classification != "retryable":
                    raise e

                logger.warning(
                    f"[{self.provider_name}] Transient failure during stream. "
                    f"Attempt {attempt + 1}/{max_retries}. Backing off for {backoff:.1f}s. Error: {e}"
                )
                self.rotate_key()
                await asyncio.sleep(backoff)
                backoff *= 2.0
                last_exception = e

        logger.error(f"[{self.provider_name}] All {max_retries} async stream retry attempts exhausted.")
        raise last_exception or RuntimeError(f"All {self.provider_name} async API retries exhausted")

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

    def _record_api_call_start(self) -> None:
        """Record the start of an API call for monitoring."""
        try:
            import time
            self._call_start_time = time.time()
        except:
            pass

    def _record_api_call_success(self, result: Any) -> None:
        """Record a successful API call for monitoring."""
        try:
            import time
            import requests
            import json

            end_time = time.time()
            response_time = end_time - getattr(self, '_call_start_time', end_time)

            # Extract token usage
            tokens_input, tokens_output = self._extract_token_usage(result)

            # Send to monitoring backend
            monitoring_url = "http://localhost:5000/admin/metrics/llm/request"
            payload = {
                "provider": self.provider_name,
                "model": self.model_name,
                "timestamp": int(end_time * 1000),
                "response_time_ms": int(response_time * 1000),
                "tokens_input": tokens_input,
                "tokens_output": tokens_output,
                "error": None,
                "success": True
            }

            # Non-blocking HTTP call
            def send_metric():
                try:
                    requests.post(monitoring_url, json=payload, timeout=2.0)
                except:
                    pass  # Silently fail if monitoring backend is unavailable

            import threading
            thread = threading.Thread(target=send_metric, daemon=True)
            thread.start()

        except Exception as e:
            # Silently fail monitoring to avoid impacting LLM performance
            pass

    def _record_api_call_error(self, error: Exception) -> None:
        """Record a failed API call for monitoring."""
        try:
            import time
            import requests
            import json

            end_time = time.time()
            response_time = end_time - getattr(self, '_call_start_time', end_time)

            # Send to monitoring backend
            monitoring_url = "http://localhost:5000/admin/metrics/llm/request"
            payload = {
                "provider": self.provider_name,
                "model": self.model_name,
                "timestamp": int(end_time * 1000),
                "response_time_ms": int(response_time * 1000),
                "tokens_input": 0,
                "tokens_output": 0,
                "error": str(error),
                "success": False
            }

            # Non-blocking HTTP call
            def send_metric():
                try:
                    requests.post(monitoring_url, json=payload, timeout=2.0)
                except:
                    pass  # Silently fail if monitoring backend is unavailable

            import threading
            thread = threading.Thread(target=send_metric, daemon=True)
            thread.start()

        except Exception as e:
            # Silently fail monitoring to avoid impacting LLM performance
            pass

    def _extract_token_usage(self, response: Any) -> tuple[int, int]:
        """Extract token usage from LLM response if available."""
        try:
            # Try to extract from response metadata
            if hasattr(response, 'usage_metadata'):
                usage = response.usage_metadata
                input_tokens = getattr(usage, 'input_tokens', 0)
                output_tokens = getattr(usage, 'output_tokens', 0)
                return input_tokens, output_tokens

            # Try LangChain response format
            if hasattr(response, 'usage'):
                usage = response.usage
                input_tokens = getattr(usage, 'prompt_tokens', 0) or getattr(usage, 'input_tokens', 0)
                output_tokens = getattr(usage, 'completion_tokens', 0) or getattr(usage, 'output_tokens', 0)
                return input_tokens, output_tokens

            # Try direct attributes
            input_tokens = getattr(response, 'prompt_tokens', 0) or getattr(response, 'input_tokens', 0)
            output_tokens = getattr(response, 'completion_tokens', 0) or getattr(response, 'output_tokens', 0)
            return input_tokens, output_tokens

        except Exception as e:
            return 0, 0


class RetryLLMWrapper:
    """
    Wraps an LLMProvider to provide a LangChain-compatible interface
    (invoke/ainvoke) that automatically uses the provider's retry logic.
    """
    def __init__(self, provider: LLMProvider):
        self.provider = provider

    def invoke(self, messages: list) -> Any:
        return self.provider.invoke_with_retry(messages)

    async def ainvoke(self, messages: list) -> Any:
        return await self.provider.ainvoke_with_retry(messages)

    async def astream(self, messages: list):
        async for chunk in self.provider.astream_with_retry(messages):
            yield chunk

    @property
    def model_name(self) -> str:
        return self.provider.model_name

