"""
Groq LLM Provider (ONLINE Mode)
=================================
Wraps the Groq API for cloud inference. Used when LLM_STATUS=ONLINE.

Features:
    - Multi-key support (GROQ_API_1, GROQ_API_2, GROQ_API_3)
    - Round-robin key rotation on every LLM instantiation
    - Automatic retry with key switching on 429 rate-limit errors
    - Exponential backoff between retries
    - Thread-safe key index management
"""

import logging
import time
import threading
from typing import Any, Dict, List, Optional

from .base import LLMProvider

logger = logging.getLogger("ai_engine.llm.groq")

# Default model for Groq
DEFAULT_GROQ_MODEL = "llama3-70b-8192"

# Rate-limit retry configuration
MAX_RETRIES = 3
INITIAL_BACKOFF_SECONDS = 1.0
BACKOFF_MULTIPLIER = 2.0


class GroqProvider(LLMProvider):
    """
    Online LLM provider using the Groq API with multi-key rotation.

    Implements round-robin key rotation and automatic retry with key switching
    when rate limits (HTTP 429) are encountered.

    Args:
        api_keys: List of Groq API keys for rotation.
        model_name: The Groq model to use (default: 'llama3-70b-8192').
        temperature: Sampling temperature (default 0.7).
    """

    def __init__(
        self,
        api_keys: List[str],
        model_name: str = DEFAULT_GROQ_MODEL,
        temperature: float = 0.7,
    ):
        # Filter out empty/None keys
        self.api_keys = [k.strip() for k in api_keys if k and k.strip()]
        self.model_name = model_name
        self.temperature = temperature

        # Thread-safe key index for round-robin rotation
        self._key_index = 0
        self._lock = threading.Lock()

        # Cache LLM instances per key to avoid re-instantiation
        self._llm_cache: Dict[int, Any] = {}

        # Track rate-limit hits per key for status reporting
        self._rate_limit_hits: Dict[int, int] = {i: 0 for i in range(len(self.api_keys))}

        if not self.api_keys:
            logger.warning("[GroqProvider] No API keys provided! Provider will not be available.")

    @property
    def provider_name(self) -> str:
        return "groq"

    def _get_next_key_index(self) -> int:
        """
        Returns the current key index and advances to the next one (round-robin).
        Thread-safe via lock.
        """
        with self._lock:
            idx = self._key_index
            self._key_index = (self._key_index + 1) % max(len(self.api_keys), 1)
            return idx

    def _create_llm_for_key(self, key_index: int) -> Any:
        """Creates a ChatGroq instance for the given key index."""
        try:
            from langchain_groq import ChatGroq
        except ImportError:
            raise ImportError(
                "langchain-groq is required for online mode. "
                "Install it with: pip install langchain-groq"
            )

        api_key = self.api_keys[key_index]
        return ChatGroq(
            model_name=self.model_name,
            groq_api_key=api_key,
            temperature=self.temperature,
        )

    def get_langchain_llm(self) -> Any:
        """
        Returns a ChatGroq instance using round-robin key rotation.

        Each call rotates to the next API key to distribute load evenly
        across all configured keys.
        """
        if not self.api_keys:
            raise RuntimeError(
                "[GroqProvider] No Groq API keys configured. "
                "Set GROQ_API_1, GROQ_API_2, or GROQ_API_3 in your .env file."
            )

        key_idx = self._get_next_key_index()

        # Use cached instance if available
        if key_idx not in self._llm_cache:
            self._llm_cache[key_idx] = self._create_llm_for_key(key_idx)
            logger.info(
                f"[GroqProvider] Created ChatGroq instance with key #{key_idx + 1} "
                f"(model: {self.model_name})"
            )

        return self._llm_cache[key_idx]

    def invoke_with_retry(self, messages: list) -> Any:
        """
        Invokes the LLM with automatic retry and key rotation on rate limits.

        This method provides an additional layer of resilience on top of
        get_langchain_llm(). If a 429 rate-limit error is encountered,
        it switches to the next API key and retries with exponential backoff.

        Args:
            messages: List of LangChain message objects.

        Returns:
            The LLM response.

        Raises:
            Exception: If all retries across all keys are exhausted.
        """
        last_exception = None
        backoff = INITIAL_BACKOFF_SECONDS

        for attempt in range(MAX_RETRIES):
            try:
                llm = self.get_langchain_llm()
                response = llm.invoke(messages)
                return response

            except Exception as e:
                error_str = str(e).lower()
                is_rate_limit = (
                    "429" in error_str
                    or "rate_limit" in error_str
                    or "rate limit" in error_str
                    or "too many requests" in error_str
                )

                if is_rate_limit and len(self.api_keys) > 1:
                    # Track the rate-limit hit
                    current_idx = (self._key_index - 1) % len(self.api_keys)
                    self._rate_limit_hits[current_idx] = (
                        self._rate_limit_hits.get(current_idx, 0) + 1
                    )

                    logger.warning(
                        f"[GroqProvider] Rate limit hit on key #{current_idx + 1}. "
                        f"Switching to next key. Attempt {attempt + 1}/{MAX_RETRIES}. "
                        f"Backing off for {backoff:.1f}s."
                    )

                    # Invalidate the cached LLM for this key
                    self._llm_cache.pop(current_idx, None)

                    time.sleep(backoff)
                    backoff *= BACKOFF_MULTIPLIER
                    last_exception = e
                    continue
                else:
                    # Non-rate-limit error or single key — don't retry
                    raise

        # All retries exhausted
        logger.error(
            f"[GroqProvider] All {MAX_RETRIES} retry attempts exhausted across "
            f"{len(self.api_keys)} keys."
        )
        raise last_exception or RuntimeError("All Groq API retries exhausted")

    def is_available(self) -> bool:
        """Checks if at least one API key is configured."""
        return len(self.api_keys) > 0

    def get_status(self) -> Dict[str, Any]:
        """Returns status metadata for the /llm/status endpoint."""
        return {
            "provider": self.provider_name,
            "model": self.model_name,
            "available": self.is_available(),
            "total_keys": len(self.api_keys),
            "active_key_index": self._key_index + 1,  # 1-indexed for display
            "rate_limit_hits": dict(self._rate_limit_hits),
            "max_retries": MAX_RETRIES,
            "key_rotation": "round-robin",
        }
