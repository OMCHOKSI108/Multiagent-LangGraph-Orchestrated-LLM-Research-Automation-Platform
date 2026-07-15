from __future__ import annotations

import abc
import asyncio
import logging
import time
from abc import abstractmethod
from typing import AsyncIterator

import httpx
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from langchain_groq import ChatGroq

from ..config import settings
from .types import GenerateResult, UsageInfo

logger = logging.getLogger(__name__)

USER_FRIENDLY_ERROR = (
    "Our AI service is temporarily unavailable. "
    "Please try again in a few minutes."
)


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


class LLMProviderError(Exception):
    def __init__(self, message: str = USER_FRIENDLY_ERROR):
        self.user_message = message
        super().__init__(message)


def _to_langchain_messages(msgs: list[dict]) -> list:
    lc_msgs = []
    for m in msgs:
        role = m.get("role", "user")
        content = m.get("content", "")
        if role == "system":
            lc_msgs.append(SystemMessage(content=content))
        else:
            lc_msgs.append(HumanMessage(content=content))
    return lc_msgs


class LLMProviderService(abc.ABC):
    """Single internal abstraction for all LLM providers.

    Follows docs/agents.md §7: one base class with per-provider subclasses.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        ...

    @abstractmethod
    def generate(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> GenerateResult:
        ...

    @abstractmethod
    async def generate_stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncIterator[str]:
        ...


class GroqClient(LLMProviderService):
    """Groq provider via langchain-groq."""

    def __init__(self):
        self._model: str = settings.groq_model
        self._api_key: str = settings.groq_api_key
        self._timeout: int = settings.llm_request_timeout

    @property
    def name(self) -> str:
        return "Groq"

    @property
    def model_name(self) -> str:
        return self._model

    def _build_llm(self, temperature: float, max_tokens: int) -> BaseChatModel:
        if not self._api_key:
            raise LLMProviderError("Groq API key not configured")
        return ChatGroq(
            api_key=self._api_key,
            model=self._model,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=self._timeout,
        )

    def generate(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> GenerateResult:
        from .token_budget import check_token_budget, shrink_context, count_tokens

        budgeted = check_token_budget(messages)
        prompt_tokens = count_tokens(" ".join(m.get("content", "") for m in budgeted))

        llm = self._build_llm(temperature, max_tokens)
        lc_msgs = _to_langchain_messages(budgeted)
        start = time.monotonic()
        try:
            response = llm.invoke(lc_msgs)
        except Exception as e:
            err_str = str(e)
            if "413" in err_str or "too large" in err_str.lower() or "rate_limit_exceeded" in err_str:
                logger.warning("Groq 413 / token limit on %d-token prompt — shrinking further", prompt_tokens)
                tighter = shrink_context(messages, max_context=3000)
                tighter_tokens = count_tokens(" ".join(m.get("content", "") for m in tighter))
                logger.info("Shrunk to %d tokens and retrying Groq", tighter_tokens)
                llm = self._build_llm(temperature, max_tokens)
                lc_msgs = _to_langchain_messages(tighter)
                response = llm.invoke(lc_msgs)
            else:
                raise

        duration_ms = int((time.monotonic() - start) * 1000)
        content = response.content
        completion_tokens = count_tokens(content)
        usage = UsageInfo(
            provider=self.name,
            model=self._model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            duration_ms=duration_ms,
        )
        return GenerateResult(content=content, usage=usage)

    async def generate_stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncIterator[str]:
        llm = self._build_llm(temperature, max_tokens)
        lc_msgs = _to_langchain_messages(messages)
        async for chunk in llm.astream(lc_msgs):
            token = chunk.content
            if token:
                yield token


class OpenRouterClient(LLMProviderService):
    """OpenRouter provider via direct httpx calls.

    Uses an OpenAI-compatible chat completions endpoint.
    """

    def __init__(self):
        self._model: str = settings.openrouter_model
        self._api_key: str = settings.openrouter_api_key
        self._timeout: int = settings.llm_request_timeout

    @property
    def name(self) -> str:
        return "OpenRouter"

    @property
    def model_name(self) -> str:
        return self._model

    def _chat_completion(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
    ) -> httpx.Response:
        if not self._api_key:
            raise LLMProviderError("OpenRouter API key not configured")
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if stream:
            payload["stream"] = True
        resp = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=self._timeout,
        )
        resp.raise_for_status()
        return resp

    def generate(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> GenerateResult:
        prompt_tokens = _estimate_tokens(" ".join(m.get("content", "") for m in messages))
        start = time.monotonic()
        resp = self._chat_completion(messages, temperature, max_tokens, stream=False)
        duration_ms = int((time.monotonic() - start) * 1000)
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        completion_tokens = _estimate_tokens(content)
        usage = UsageInfo(
            provider=self.name,
            model=self._model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            duration_ms=duration_ms,
        )
        return GenerateResult(content=content, usage=usage)

    async def generate_stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncIterator[str]:
        resp = self._chat_completion(messages, temperature, max_tokens, stream=True)
        for line in resp.iter_lines():
            if not line:
                continue
            if line.startswith("data: "):
                data_str = line[6:]
                if data_str.strip() == "[DONE]":
                    break
                try:
                    import json
                    data = json.loads(data_str)
                    delta = data.get("choices", [{}])[0].get("delta", {})
                    token = delta.get("content", "")
                    if token:
                        yield token
                except json.JSONDecodeError:
                    continue


class CerebrasClient(LLMProviderService):
    """Cerebras provider via direct httpx calls (OpenAI-compatible API)."""

    BASE_URL = "https://api.cerebras.ai/v1/chat/completions"

    def __init__(self):
        self._model: str = settings.cerebras_model
        self._api_key: str = settings.cerebras_api_key
        self._timeout: int = settings.llm_request_timeout

    @property
    def name(self) -> str:
        return "Cerebras"

    @property
    def model_name(self) -> str:
        return self._model

    def _chat_completion(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
    ) -> httpx.Response:
        if not self._api_key:
            raise LLMProviderError("Cerebras API key not configured")
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload: dict = {
            "model": self._model,
            "messages": messages,
            "max_completion_tokens": max_tokens,
            "temperature": temperature,
            "top_p": 1,
            "stream": stream,
        }
        if stream:
            payload["stream"] = True
        resp = httpx.post(
            self.BASE_URL,
            headers=headers,
            json=payload,
            timeout=self._timeout,
        )
        resp.raise_for_status()
        return resp

    def generate(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> GenerateResult:
        prompt_tokens = _estimate_tokens(" ".join(m.get("content", "") for m in messages))
        start = time.monotonic()
        resp = self._chat_completion(messages, temperature, max_tokens, stream=False)
        duration_ms = int((time.monotonic() - start) * 1000)
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        completion_tokens = _estimate_tokens(content)
        usage = UsageInfo(
            provider=self.name,
            model=self._model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            duration_ms=duration_ms,
        )
        return GenerateResult(content=content, usage=usage)

    async def generate_stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncIterator[str]:
        resp = self._chat_completion(messages, temperature, max_tokens, stream=True)
        for line in resp.iter_lines():
            if not line:
                continue
            if line.startswith("data: "):
                data_str = line[6:]
                if data_str.strip() == "[DONE]":
                    break
                try:
                    import json
                    data = json.loads(data_str)
                    delta = data.get("choices", [{}])[0].get("delta", {})
                    token = delta.get("content", "")
                    if token:
                        yield token
                except json.JSONDecodeError:
                    continue


class OpenAIClient(LLMProviderService):
    """OpenAI provider stub — for future use."""

    def __init__(self):
        self._model: str = settings.get("openai_model", "gpt-4")
        self._api_key: str = settings.get("openai_api_key", "")

    @property
    def name(self) -> str:
        return "OpenAI"

    @property
    def model_name(self) -> str:
        return self._model

    def generate(self, messages, temperature=0.7, max_tokens=4096) -> GenerateResult:
        raise NotImplementedError("OpenAIClient not yet implemented")

    async def generate_stream(self, messages, temperature=0.7, max_tokens=4096):
        raise NotImplementedError("OpenAIClient not yet implemented")
        yield  # pragma: no cover


class GeminiClient(LLMProviderService):
    """Gemini provider stub — for future use."""

    def __init__(self):
        self._model: str = settings.get("gemini_model", "gemini-pro")
        self._api_key: str = settings.get("gemini_api_key", "")

    @property
    def name(self) -> str:
        return "Gemini"

    @property
    def model_name(self) -> str:
        return self._model

    def generate(self, messages, temperature=0.7, max_tokens=4096) -> GenerateResult:
        raise NotImplementedError("GeminiClient not yet implemented")

    async def generate_stream(self, messages, temperature=0.7, max_tokens=4096):
        raise NotImplementedError("GeminiClient not yet implemented")
        yield  # pragma: no cover


class LocalModelClient(LLMProviderService):
    """Local model provider stub — for future use (Ollama, llama.cpp, etc.)."""

    def __init__(self):
        self._model: str = settings.get("local_model", "llama2")
        self._endpoint: str = settings.get("local_model_endpoint", "http://localhost:11434")

    @property
    def name(self) -> str:
        return "Local"

    @property
    def model_name(self) -> str:
        return self._model

    def generate(self, messages, temperature=0.7, max_tokens=4096) -> GenerateResult:
        raise NotImplementedError("LocalModelClient not yet implemented")

    async def generate_stream(self, messages, temperature=0.7, max_tokens=4096):
        raise NotImplementedError("LocalModelClient not yet implemented")
        yield  # pragma: no cover


class ProviderRegistry:
    """Registry that provides ordered list of available LLM providers.

    Used by BaseGenerator for fallback: tries first provider, falls back to next on failure.
    """

    def __init__(self):
        self._providers: list[LLMProviderService] = []
        self._init()

    def _init(self):
        candidates: list[LLMProviderService] = [
            GroqClient(),
            OpenRouterClient(),
            CerebrasClient(),
        ]
        for p in candidates:
            try:
                if p.model_name and p.name:
                    self._providers.append(p)
            except Exception:
                continue

    def get_providers(self) -> list[LLMProviderService]:
        return list(self._providers)

    def get_first_available(self) -> LLMProviderService | None:
        for p in self._providers:
            try:
                p.generate([{"role": "user", "content": "ping"}], temperature=0.1, max_tokens=1)
                return p
            except Exception:
                continue
        return None

    def add_provider(self, provider: LLMProviderService):
        self._providers.append(provider)

    def clear(self):
        self._providers.clear()


registry = ProviderRegistry()
