from __future__ import annotations


class UsageInfo:
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    duration_ms: int

    def __init__(self, provider: str = "", model: str = "",
                 prompt_tokens: int = 0, completion_tokens: int = 0,
                 duration_ms: int = 0):
        self.provider = provider
        self.model = model
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.duration_ms = duration_ms

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "model": self.model,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.prompt_tokens + self.completion_tokens,
            "duration_ms": self.duration_ms,
        }


class GenerateResult:
    content: str
    usage: UsageInfo | None

    def __init__(self, content: str, usage: UsageInfo | None = None):
        self.content = content
        self.usage = usage
