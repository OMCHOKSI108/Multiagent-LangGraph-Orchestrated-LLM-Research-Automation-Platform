from __future__ import annotations

import asyncio
import json
import re
import time
from typing import Any, AsyncIterator, Callable

from langchain_core.messages import HumanMessage, SystemMessage

from .llm import call_llm as _call_llm, track_token_usage, LLMError
from .types import GenerateResult, UsageInfo
from .providers import registry as _provider_registry, LLMProviderService, _estimate_tokens

DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 4096


class BaseGenerator:
    """Centralized AI generator with method overloading support.

    Overloading:  generate() accepts multiple call patterns:
        gen.generate(prompt="...")
        gen.generate(system_prompt="...", user_prompt="...")
        gen.generate(messages=[...])

    Overriding:   Subclass and override generate() or _build_messages()
        to customize behavior per agent or use case.
    """

    provider_name: str = "Base"

    def _build_messages(
        self,
        prompt: str | None = None,
        system_prompt: str | None = None,
        user_prompt: str | None = None,
        messages: list[dict] | None = None,
    ) -> list[dict]:
        if messages is not None:
            return messages
        if system_prompt is not None and user_prompt is not None:
            return [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
        if system_prompt is not None:
            return [{"role": "system", "content": system_prompt}]
        if user_prompt is not None:
            return [{"role": "user", "content": user_prompt}]
        if prompt is not None:
            return [{"role": "user", "content": prompt}]
        return []

    def _to_langchain_messages(self, msgs: list[dict]) -> list:
        lc_msgs = []
        for m in msgs:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role == "system":
                lc_msgs.append(SystemMessage(content=content))
            else:
                lc_msgs.append(HumanMessage(content=content))
        return lc_msgs

    def generate(
        self,
        prompt: str | None = None,
        system_prompt: str | None = None,
        user_prompt: str | None = None,
        messages: list[dict] | None = None,
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        session_id: str | None = None,
        agent_name: str | None = None,
        db=None,
    ) -> GenerateResult:
        msgs = self._build_messages(prompt, system_prompt, user_prompt, messages)
        prompt_text = " ".join(m.get("content", "") for m in msgs)
        prompt_tokens = _estimate_tokens(prompt_text)

        last_error = None
        for provider in _provider_registry.get_providers():
            try:
                start = time.monotonic()
                result = provider.generate(msgs, temperature, max_tokens)
                result.usage.duration_ms = int((time.monotonic() - start) * 1000)
                asyncio.create_task(track_token_usage(
                    session_id=session_id,
                    provider=provider.name,
                    model=provider.model_name,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=result.usage.completion_tokens,
                    duration_ms=result.usage.duration_ms,
                    agent_name=agent_name,
                    db=db,
                ))
                return result
            except Exception as e:
                last_error = e
                continue

        raise LLMError() from last_error

    async def generate_stream(
        self,
        prompt: str | None = None,
        system_prompt: str | None = None,
        user_prompt: str | None = None,
        messages: list[dict] | None = None,
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        token_callback: Callable[[str], None] | None = None,
        session_id: str | None = None,
        agent_name: str | None = None,
        db=None,
    ) -> GenerateResult:
        msgs = self._build_messages(prompt, system_prompt, user_prompt, messages)
        prompt_text = " ".join(m.get("content", "") for m in msgs)
        prompt_tokens = _estimate_tokens(prompt_text)

        last_error = None
        for provider in _provider_registry.get_providers():
            try:
                start = time.monotonic()
                full_response = ""
                async for token in provider.generate_stream(msgs, temperature, max_tokens):
                    if token:
                        full_response += token
                        if token_callback:
                            if asyncio.iscoroutinefunction(token_callback):
                                await token_callback(token)
                            else:
                                token_callback(token)
                duration_ms = int((time.monotonic() - start) * 1000)
                completion_tokens = _estimate_tokens(full_response)
                usage = UsageInfo(
                    provider=provider.name,
                    model=provider.model_name,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    duration_ms=duration_ms,
                )
                asyncio.create_task(track_token_usage(
                    session_id=session_id,
                    provider=provider.name,
                    model=provider.model_name,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    duration_ms=duration_ms,
                    agent_name=agent_name,
                    db=db,
                ))
                return GenerateResult(content=full_response, usage=usage)
            except Exception as e:
                last_error = e
                continue

        raise LLMError() from last_error

    def __call__(
        self,
        prompt: str | None = None,
        system_prompt: str | None = None,
        user_prompt: str | None = None,
        messages: list[dict] | None = None,
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        session_id: str | None = None,
        agent_name: str | None = None,
        db=None,
    ) -> GenerateResult:
        return self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            session_id=session_id,
            agent_name=agent_name,
            db=db,
        )


class TrackingGenerator(BaseGenerator):
    """Overrides generate to auto-track token usage to DB."""

    provider_name = "Tracking"

    def generate(
        self,
        prompt: str | None = None,
        system_prompt: str | None = None,
        user_prompt: str | None = None,
        messages: list[dict] | None = None,
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        session_id: str | None = None,
        agent_name: str | None = None,
        db=None,
    ) -> GenerateResult:
        return super().generate(
            prompt=prompt,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            session_id=session_id,
            agent_name=agent_name or "tracking",
            db=db,
        )


class StreamingGenerator(BaseGenerator):
    """Override that always uses streaming and publishes tokens via callback."""

    provider_name = "Streaming"

    def generate(
        self,
        prompt: str | None = None,
        system_prompt: str | None = None,
        user_prompt: str | None = None,
        messages: list[dict] | None = None,
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        session_id: str | None = None,
        agent_name: str | None = None,
        db=None,
    ) -> GenerateResult:
        raise NotImplementedError("Use generate_stream() for StreamingGenerator")

    async def generate_stream(
        self,
        prompt: str | None = None,
        system_prompt: str | None = None,
        user_prompt: str | None = None,
        messages: list[dict] | None = None,
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        token_callback: Callable[[str], None] | None = None,
        session_id: str | None = None,
        agent_name: str | None = None,
        db=None,
    ) -> GenerateResult:
        return await super().generate_stream(
            prompt=prompt,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            token_callback=token_callback,
            session_id=session_id,
            agent_name=agent_name or "streaming",
            db=db,
        )


class FaithfulGenerator(BaseGenerator):
    """Overrides generate to append faithfulness verification after generation."""

    provider_name = "Faithful"

    def generate(
        self,
        prompt: str | None = None,
        system_prompt: str | None = None,
        user_prompt: str | None = None,
        messages: list[dict] | None = None,
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        session_id: str | None = None,
        agent_name: str | None = None,
        db=None,
    ) -> GenerateResult:
        if not system_prompt and not user_prompt and prompt:
            user_prompt = prompt
        result = super().generate(
            prompt=prompt,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            session_id=session_id,
            agent_name=agent_name or "faithful",
            db=db,
        )

        ctx = user_prompt or prompt or ""
        verdict = _faithfulness_check(result.content, ctx)
        if not verdict.get("faithful", True) and verdict.get("unsupported_claims"):
            original = result.content
            revised = _reflexion_revise(original, ctx, verdict["unsupported_claims"])
            result.content = revised

        return result


def _faithfulness_check(answer: str, context: str) -> dict:
    if not context.strip():
        return {"faithful": True, "unsupported_claims": [], "score": 10}
    result = _call_llm(
        "You are a faithfulness verifier. Given an answer and the source context, "
        "identify any claims in the answer that are NOT supported by the context. "
        "Return JSON: {\"faithful\": true/false, \"unsupported_claims\": [\"...\"], \"score\": 0-10}",
        f"Context:\n{context}\n\nAnswer:\n{answer}\n\nVerification:",
        temperature=0.1,
    )
    try:
        json_match = re.search(r"\{.*\}", result, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return {"faithful": True, "unsupported_claims": [], "score": 10}
    except (json.JSONDecodeError, AttributeError):
        return {"faithful": True, "unsupported_claims": [], "score": 10}


def _reflexion_revise(answer: str, context: str, unsupported_claims: list[str]) -> str:
    revised = _call_llm(
        "You are a research assistant. Your previous answer contained unsupported claims. "
        "Revise it to ONLY include information supported by the provided context. "
        "If the context doesn't fully answer the question, say so explicitly.",
        f"Context:\n{context}\n\nPrevious Answer:\n{answer}\n\n"
        f"Unsupported Claims:\n{chr(10).join(unsupported_claims)}\n\nRevised Answer:",
        temperature=0.2,
    )
    return revised.strip()


gen = BaseGenerator()
streaming_gen = StreamingGenerator()
tracking_gen = TrackingGenerator()
faithful_gen = FaithfulGenerator()
