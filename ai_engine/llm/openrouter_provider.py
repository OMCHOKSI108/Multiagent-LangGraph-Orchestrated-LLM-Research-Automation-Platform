from typing import List, Optional
import os
import random
import logging
from .base import LLMProvider
from langchain_openai import ChatOpenAI
from langchain_core.language_models.chat_models import BaseChatModel

logger = logging.getLogger("ai_engine.llm.openrouter")

class OpenRouterProvider(LLMProvider):
    """
    LLM Provider for OpenRouter (e.g., Anthropic Claude models, Llama 3, etc.).
    Supports API key rotation for rate limit resilience.
    """
    
    def __init__(self, api_keys: List[str], model_name: str, temperature: float = 0.7, max_tokens: int = 4096):
        super().__init__(provider_name="OpenRouter", model_name=model_name, temperature=temperature)
        self.api_keys = [k for k in api_keys if k]
        self.max_tokens = max_tokens
        
        if not self.api_keys:
            logger.warning("[OpenRouter] Initialized without API keys. Calls will fail.")
            
        # Optional custom base URL if users are proxying OpenRouter
        self.base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        
        # We start with the first key
        self._current_key_idx = 0

    def get_langchain_llm(self) -> BaseChatModel:
        if not self.api_keys:
            raise ValueError("No OpenRouter API keys available.")
            
        # Rotate key sequentially instead of random for predictable rate limit handling
        # (The factory or wrapper should ideally catch 429 and call rotate_key, but here
        # we just return an instance bound to the currently active key).
        active_key = self.api_keys[self._current_key_idx]

        return ChatOpenAI(
            model=self.model_name,
            api_key=active_key,
            base_url=self.base_url,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            # OpenRouter requires these headers for ranking
            default_headers={
                "HTTP-Referer": os.getenv("FRONTEND_URL", "http://localhost:3000"),
                "X-Title": "Deep Research Engine",
            }
        )

    def rotate_key(self) -> str:
        """Move to the next key. Useful if standard request hits a 429."""
        if not self.api_keys:
            return ""
        self._current_key_idx = (self._current_key_idx + 1) % len(self.api_keys)
        logger.info(f"[OpenRouter] Rotated to key index {self._current_key_idx}")
        return self.api_keys[self._current_key_idx]

    def is_available(self) -> bool:
        """Check if we have at least one key."""
        return len(self.api_keys) > 0

    def get_status(self) -> dict:
        return {
            "name": self.provider_name,
            "model": self.model_name,
            "available": self.is_available(),
            "keys_configured": len(self.api_keys),
            "active_key_index": self._current_key_idx
        }
