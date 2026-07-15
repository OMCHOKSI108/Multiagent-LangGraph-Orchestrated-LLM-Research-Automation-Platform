from __future__ import annotations

import logging
import tiktoken

logger = logging.getLogger(__name__)

ENCODING = "cl100k_base"
MAX_CONTEXT_TOKENS = 4500
MAX_OUTPUT_TOKENS = 1000
TOKEN_LIMIT = 6000


def count_tokens(text: str) -> int:
    try:
        enc = tiktoken.get_encoding(ENCODING)
        return len(enc.encode(text))
    except Exception:
        return len(text) // 4


def truncate_to_token_budget(text: str, budget: int = MAX_CONTEXT_TOKENS) -> str:
    tokens = count_tokens(text)
    if tokens <= budget:
        return text
    try:
        enc = tiktoken.get_encoding(ENCODING)
        encoded = enc.encode(text)
        trimmed = encoded[:budget]
        return enc.decode(trimmed)
    except Exception:
        ratio = budget / tokens
        cutoff = int(len(text) * ratio)
        return text[:cutoff]


def shrink_context(messages: list[dict], budget: int = MAX_CONTEXT_TOKENS) -> list[dict]:
    total = sum(count_tokens(m.get("content", "")) for m in messages)
    if total <= budget:
        return messages

    shrunk: list[dict] = []
    system_tokens = 0
    for m in messages:
        if m.get("role") == "system":
            content = m.get("content", "")
            system_tokens += count_tokens(content)
            if system_tokens > 500:
                m["content"] = truncate_to_token_budget(content, 500)
                system_tokens = 500
            shrunk.append(m)

    remaining = budget - sum(count_tokens(m.get("content", "")) for m in shrunk)
    for m in messages:
        if m.get("role") != "system":
            content = m.get("content", "")
            tokens = count_tokens(content)
            if tokens > remaining:
                m["content"] = truncate_to_token_budget(content, max(remaining, 100))
                remaining = 0
            else:
                remaining -= tokens
            shrunk.append(m)

    return shrunk


def check_token_budget(
    messages: list[dict],
    max_context: int = MAX_CONTEXT_TOKENS,
    max_output: int = MAX_OUTPUT_TOKENS,
    hard_limit: int = TOKEN_LIMIT,
) -> list[dict]:
    total = sum(count_tokens(m.get("content", "")) for m in messages)
    logger.info("Token budget: prompt=%d, limit=%d, output_budget=%d", total, hard_limit, max_output)

    if total + max_output <= hard_limit:
        return messages

    logger.warning("Prompt tokens %d exceeds safe budget %d, shrinking context", total, hard_limit - max_output)
    return shrink_context(messages, max_context)
