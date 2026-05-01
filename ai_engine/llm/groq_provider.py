"""
Groq LLM Provider (ONLINE Mode)
=================================
Wraps the Groq API for cloud inference. Used when LLM_STATUS=ONLINE.

Features:
    - Multi-key support (GROQ_API_1, GROQ_API_2, GROQ_API_3)
    - Round-robin key rotation on every LLM instantiation
    - Model fallback when a configured model is invalid or decommissioned
    - Retries only for transient failures such as rate limits/timeouts
    - Thread-safe key and model index management
"""

import asyncio
import logging
import time
import threading
from typing import Any, Dict, List, Optional, Tuple

from .base import LLMProvider

logger = logging.getLogger("ai_engine.llm.groq")

DEFAULT_GROQ_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
]

MAX_RETRIES = 3
INITIAL_BACKOFF_SECONDS = 1.0
BACKOFF_MULTIPLIER = 2.0


class GroqProvider(LLMProvider):
    """
    Online LLM provider using the Groq API with multi-key and model rotation.

    Invalid-model failures are deterministic, so the provider immediately
    switches to the next configured model instead of retrying the same request
    with a different API key.
    """

    def __init__(
        self,
        api_keys: List[str],
        model_name: str = DEFAULT_GROQ_MODELS[0],
        temperature: float = 0.7,
        fallback_models: Optional[List[str]] = None,
    ):
        super().__init__(
            provider_name="groq", model_name=model_name, temperature=temperature
        )

        self.api_keys = [k.strip() for k in api_keys if k and k.strip()]
        self.models = self._build_model_list(model_name, fallback_models)

        self._key_index = 0
        self._model_index = 0
        self._lock = threading.Lock()
        self._llm_cache: Dict[Tuple[int, str], Any] = {}
        self._rate_limit_hits: Dict[int, int] = {
            i: 0 for i in range(len(self.api_keys))
        }
        self._model_failures: Dict[str, int] = {model: 0 for model in self.models}

        if not self.api_keys:
            logger.warning(
                "[GroqProvider] No API keys provided! Provider will not be available."
            )

    def _build_model_list(
        self, primary_model: str, fallback_models: Optional[List[str]]
    ) -> List[str]:
        models: List[str] = []
        for candidate in [
            primary_model,
            *(fallback_models or []),
            *DEFAULT_GROQ_MODELS,
        ]:
            if candidate and candidate not in models:
                models.append(candidate)
        return models or DEFAULT_GROQ_MODELS.copy()

    @property
    def provider_name(self) -> str:
        return "groq"

    @property
    def active_model(self) -> str:
        return self.models[self._model_index]

    def _get_next_key_index(self) -> int:
        with self._lock:
            idx = self._key_index
            self._key_index = (self._key_index + 1) % max(len(self.api_keys), 1)
            return idx

    def _set_active_model(self, model_name: str) -> None:
        self.model_name = model_name
        self._model_index = self.models.index(model_name)

    def rotate_key(self) -> str:
        if not self.api_keys:
            return ""
        idx = self._get_next_key_index()
        return self.api_keys[idx]

    def rotate_model(self) -> str:
        if not self.models:
            return ""
        self._model_index = (self._model_index + 1) % len(self.models)
        self.model_name = self.models[self._model_index]
        logger.warning(f"[GroqProvider] Switching to fallback model: {self.model_name}")
        return self.model_name

    def _create_llm_for_key(self, key_index: int, model_name: str) -> Any:
        try:
            from langchain_groq import ChatGroq
        except ImportError:
            raise ImportError(
                "langchain-groq is required for online mode. "
                "Install it with: pip install langchain-groq"
            )

        api_key = self.api_keys[key_index]
        return ChatGroq(
            model_name=model_name,
            groq_api_key=api_key,
            temperature=self.temperature,
        )

    def get_langchain_llm(self) -> Any:
        if not self.api_keys:
            raise RuntimeError(
                "[GroqProvider] No Groq API keys configured. "
                "Set GROQ_API_1, GROQ_API_2, or GROQ_API_3 in your .env file."
            )

        key_idx = self._get_next_key_index()
        cache_key = (key_idx, self.active_model)

        if cache_key not in self._llm_cache:
            self._llm_cache[cache_key] = self._create_llm_for_key(
                key_idx, self.active_model
            )
            logger.info(
                f"[GroqProvider] Created ChatGroq instance with key #{key_idx + 1} "
                f"(model: {self.active_model})"
            )

        self.model_name = self.active_model
        return self._llm_cache[cache_key]

    def _invalidate_current_cache_entry(self) -> None:
        if not self.api_keys:
            return
        current_idx = (self._key_index - 1) % len(self.api_keys)
        self._llm_cache.pop((current_idx, self.active_model), None)

    def _record_model_failure(self, model_name: str, error: Exception) -> None:
        self._model_failures[model_name] = self._model_failures.get(model_name, 0) + 1
        logger.error(f"[GroqProvider] Model '{model_name}' failed: {error}")

    def _shrink_if_needed(self, messages: list, max_chars: int = 15000) -> list:
        """Trims middle messages (older context) if total exceeds limit.

        Preserves system prompt (index 0) and the last 2 messages (most
        recent user/assistant context) since those are the most important.
        Only truncates messages in the middle range.
        """
        if not messages:
            return messages

        import copy

        msgs = copy.deepcopy(messages)

        total_chars = sum(
            len(m.content)
            if hasattr(m, "content") and isinstance(m.content, str)
            else 0
            for m in msgs
        )

        if total_chars <= max_chars:
            return msgs

        # Protect: system prompt (index 0) + last 2 messages
        protected_indices = {0}
        if len(msgs) >= 2:
            protected_indices.add(len(msgs) - 1)
            protected_indices.add(len(msgs) - 2)

        # Find truncatable messages
        truncatable = [i for i in range(len(msgs)) if i not in protected_indices]
        if not truncatable:
            return msgs  # Nothing to truncate

        # Distribute the truncation budget across truncatable messages
        budget_per_msg = max_chars // len(msgs)  # rough equal share
        for i in truncatable:
            msg = msgs[i]
            if hasattr(msg, "content") and isinstance(msg.content, str):
                if len(msg.content) > budget_per_msg:
                    msg.content = msg.content[:budget_per_msg] + "...\n"

        return msgs

    def _invoke_once(self, messages: list) -> Any:
        messages = self._shrink_if_needed(messages)
        llm = self.get_langchain_llm()
        return llm.invoke(messages)

    async def _ainvoke_once(self, messages: list) -> Any:
        messages = self._shrink_if_needed(messages)
        llm = self.get_langchain_llm()
        return await llm.ainvoke(messages)

    def invoke_with_retry(self, messages: list) -> Any:
        last_exception = None

        for model_name in self.models:
            self._set_active_model(model_name)
            backoff = INITIAL_BACKOFF_SECONDS

            for attempt in range(MAX_RETRIES):
                try:
                    return self._invoke_once(messages)
                except Exception as e:
                    classification = self.classify_error(e)
                    last_exception = e

                    if classification == "model_invalid":
                        self._record_model_failure(model_name, e)
                        self._invalidate_current_cache_entry()
                        break

                    if classification == "retryable":
                        current_idx = (
                            (self._key_index - 1) % len(self.api_keys)
                            if self.api_keys
                            else 0
                        )
                        self._rate_limit_hits[current_idx] = (
                            self._rate_limit_hits.get(current_idx, 0) + 1
                        )
                        self._invalidate_current_cache_entry()
                        logger.warning(
                            f"[GroqProvider] Transient failure on model '{model_name}'. "
                            f"Attempt {attempt + 1}/{MAX_RETRIES}. Backing off for {backoff:.1f}s. Error: {e}"
                        )
                        time.sleep(backoff)
                        backoff *= BACKOFF_MULTIPLIER
                        continue

                    self._record_model_failure(model_name, e)
                    break

        logger.error(
            f"[GroqProvider] Exhausted all fallback models without success: {', '.join(self.models)}"
        )
        raise last_exception or RuntimeError("All Groq models failed")

    async def ainvoke_with_retry(self, messages: list) -> Any:
        last_exception = None

        for model_name in self.models:
            self._set_active_model(model_name)
            backoff = INITIAL_BACKOFF_SECONDS

            for attempt in range(MAX_RETRIES):
                try:
                    return await self._ainvoke_once(messages)
                except Exception as e:
                    classification = self.classify_error(e)
                    last_exception = e

                    if classification == "model_invalid":
                        self._record_model_failure(model_name, e)
                        self._invalidate_current_cache_entry()
                        break

                    if classification == "retryable":
                        current_idx = (
                            (self._key_index - 1) % len(self.api_keys)
                            if self.api_keys
                            else 0
                        )
                        self._rate_limit_hits[current_idx] = (
                            self._rate_limit_hits.get(current_idx, 0) + 1
                        )
                        self._invalidate_current_cache_entry()
                        logger.warning(
                            f"[GroqProvider] Transient failure on model '{model_name}'. "
                            f"Attempt {attempt + 1}/{MAX_RETRIES}. Backing off for {backoff:.1f}s. Error: {e}"
                        )
                        await asyncio.sleep(backoff)
                        backoff *= BACKOFF_MULTIPLIER
                        continue

                    self._record_model_failure(model_name, e)
                    break

        logger.error(
            f"[GroqProvider] Exhausted all fallback models without success: {', '.join(self.models)}"
        )
        raise last_exception or RuntimeError("All Groq models failed")

    def is_available(self) -> bool:
        return len(self.api_keys) > 0

    def get_status(self) -> Dict[str, Any]:
        return {
            "provider": self.provider_name,
            "model": self.model_name,
            "fallback_models": list(self.models),
            "available": self.is_available(),
            "total_keys": len(self.api_keys),
            "active_key_index": self._key_index + 1,
            "rate_limit_hits": dict(self._rate_limit_hits),
            "model_failures": dict(self._model_failures),
            "max_retries": MAX_RETRIES,
            "key_rotation": "round-robin",
            "model_fallback": True,
        }
