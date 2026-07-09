import asyncio
import time
import logging
import httpx
from langchain_groq import ChatGroq
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from ..config import settings

logger = logging.getLogger(__name__)

USER_FRIENDLY_ERROR = (
    "Our AI service is temporarily unavailable. "
    "Please try again in a few minutes."
)


class LLMError(Exception):
    def __init__(self, message: str = USER_FRIENDLY_ERROR):
        self.user_message = message
        super().__init__(message)


def _build_groq_llm(temperature: float, max_tokens: int) -> BaseChatModel | None:
    if not settings.groq_api_key:
        return None
    try:
        return ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=settings.llm_request_timeout,
        )
    except Exception as e:
        logger.warning("Failed to init Groq: %s", e)
        return None


def _build_openrouter_llm(temperature: float, max_tokens: int) -> BaseChatModel | None:
    if not settings.openrouter_api_key:
        return None
    try:

        class OpenRouterLLM(BaseChatModel):
            api_key: str
            model: str
            temperature: float = 0.7
            max_tokens: int = 4096
            timeout: int = 60

            def _generate(self, messages, stop=None, run_manager=None, **kwargs):
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "model": self.model,
                    "messages": [{"role": m.type, "content": m.content} for m in messages],
                    "temperature": self.temperature,
                    "max_tokens": self.max_tokens,
                }
                if stop:
                    payload["stop"] = stop
                resp = httpx.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=self.timeout,
                )
                resp.raise_for_status()
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return ChatResult(generations=[ChatGeneration(message=HumanMessage(content=content))])

            @property
            def _llm_type(self):
                return "openrouter"

        return OpenRouterLLM(
            api_key=settings.openrouter_api_key,
            model=settings.openrouter_model,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=settings.llm_request_timeout,
        )
    except Exception as e:
        logger.warning("Failed to init OpenRouter: %s", e)
        return None


_PROVIDERS = [
    ("Groq", _build_groq_llm),
    ("OpenRouter", _build_openrouter_llm),
]


def _try_providers(temperature: float, max_tokens: int) -> tuple[str, BaseChatModel]:
    errors = []
    for name, builder in _PROVIDERS:
        llm = builder(temperature, max_tokens)
        if llm is not None:
            logger.info("Using LLM provider: %s", name)
            return name, llm
        errors.append(name)
    logger.error("All providers failed to initialize: %s", ", ".join(errors))
    raise LLMError()


async def track_token_usage(
    session_id: str | None,
    provider: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    duration_ms: int,
    agent_name: str | None = None,
    db=None,
):
    if not session_id or db is None:
        return
    from ..db import TokenUsage
    try:
        usage = TokenUsage(
            session_id=session_id,
            provider=provider,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            duration_ms=duration_ms,
            agent_name=agent_name,
        )
        db.add(usage)
        await db.commit()
    except Exception as e:
        logger.warning("Failed to track token usage: %s", e)


def get_llm(temperature: float = 0.7, max_tokens: int = 4096) -> BaseChatModel:
    _, llm = _try_providers(temperature, max_tokens)
    return llm


def call_llm(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7,
    session_id: str | None = None,
    agent_name: str | None = None,
    db=None,
) -> str:
    last_error = None
    prompt_tokens_est = max(1, (len(system_prompt) + len(user_prompt)) // 4)
    for name, builder in _PROVIDERS:
        llm = builder(temperature, max_tokens=4096)
        if llm is None:
            continue
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ]
            start = time.monotonic()
            response = llm.invoke(messages)
            duration_ms = int((time.monotonic() - start) * 1000)
            completion_tokens = max(1, len(response.content) // 4)
            asyncio.create_task(track_token_usage(
                session_id=session_id,
                provider=name,
                model=getattr(llm, 'model', str(type(llm).__name__)),
                prompt_tokens=prompt_tokens_est,
                completion_tokens=completion_tokens,
                duration_ms=duration_ms,
                agent_name=agent_name,
                db=db,
            ))
            return response.content
        except Exception as e:
            logger.warning("LLM provider %s failed: %s", name, e)
            last_error = e
    logger.error("All LLM providers exhausted")
    raise LLMError() from last_error


async def call_llm_stream(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7,
    token_callback=None,
    session_id: str | None = None,
    agent_name: str | None = None,
    db=None,
) -> str:
    last_error = None
    prompt_tokens_est = max(1, (len(system_prompt) + len(user_prompt)) // 4)
    for name, builder in _PROVIDERS:
        llm = builder(temperature, max_tokens=4096)
        if llm is None:
            continue
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ]
            start = time.monotonic()
            full_response = ""
            async for chunk in llm.astream(messages):
                token = chunk.content
                if token:
                    full_response += token
                    if token_callback:
                        await token_callback(token)
            duration_ms = int((time.monotonic() - start) * 1000)
            completion_tokens = max(1, len(full_response) // 4)
            asyncio.create_task(track_token_usage(
                session_id=session_id,
                provider=name,
                model=getattr(llm, 'model', str(type(llm).__name__)),
                prompt_tokens=prompt_tokens_est,
                completion_tokens=completion_tokens,
                duration_ms=duration_ms,
                agent_name=agent_name,
                db=db,
            ))
            return full_response
        except Exception as e:
            logger.warning("LLM provider %s stream failed: %s", name, e)
            last_error = e
    logger.error("All LLM providers exhausted for streaming")
    raise LLMError() from last_error
