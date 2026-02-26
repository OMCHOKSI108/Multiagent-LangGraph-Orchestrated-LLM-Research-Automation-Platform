from typing import List, Optional
import os
import logging
from .base import LLMProvider
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.language_models.chat_models import BaseChatModel

logger = logging.getLogger("ai_engine.llm.gemini")

class GeminiProvider(LLMProvider):
    """
    LLM Provider for Google Gemini models.
    Supports API key rotation for rate limit resilience.
    """
    
    def __init__(self, api_keys: List[str], model_name: str, temperature: float = 0.7, max_tokens: int = 4096):
        # Gemini models drop the 'gemini/' prefix when passed to Langchain
        clean_model = model_name.replace("gemini/", "", 1) if model_name.startswith("gemini/") else model_name
        
        super().__init__(provider_name="Gemini", model_name=clean_model, temperature=temperature)
        self.api_keys = [k for k in api_keys if k]
        self.max_tokens = max_tokens
        
        if not self.api_keys:
            logger.warning("[Gemini] Initialized without API keys. Calls will fail.")
            
        self._current_key_idx = 0

    def get_langchain_llm(self) -> BaseChatModel:
        if not self.api_keys:
            raise ValueError("No Gemini API keys available.")
            
        active_key = self.api_keys[self._current_key_idx]

        return ChatGoogleGenerativeAI(
            model=self.model_name,
            google_api_key=active_key,
            temperature=self.temperature,
            max_output_tokens=self.max_tokens,
            convert_system_message_to_human=True # Required for some older Gemini models
        )

    def rotate_key(self) -> str:
        """Move to the next key if rate limited."""
        if not self.api_keys:
            return ""
        self._current_key_idx = (self._current_key_idx + 1) % len(self.api_keys)
        logger.info(f"[Gemini] Rotated to key index {self._current_key_idx}")
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
