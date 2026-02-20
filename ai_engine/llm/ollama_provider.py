"""
Ollama LLM Provider (OFFLINE Mode)
====================================
Wraps the local Ollama server for inference. Used when LLM_STATUS=OFFLINE.

Features:
    - Connectivity check via /api/tags endpoint
    - Fallback model logic if requested model is unavailable
    - Cached LLM instances to avoid redundant connections
"""

import logging
import requests
from typing import Any, Dict

from langchain_ollama import ChatOllama

from .base import LLMProvider

logger = logging.getLogger("ai_engine.llm.ollama")

# Default fallback model if the requested model is not available
FALLBACK_MODEL = "phi3:mini"


class OllamaProvider(LLMProvider):
    """
    Offline LLM provider using a local Ollama server.

    Args:
        model_name: The Ollama model to use (e.g., 'phi3:mini', 'gemma2:2b').
        base_url: The Ollama server URL (default from config).
        temperature: Sampling temperature (default 0.7).
    """

    def __init__(
        self,
        model_name: str,
        base_url: str = "http://localhost:11434",
        temperature: float = 0.7,
    ):
        self.model_name = model_name
        self.base_url = base_url.rstrip("/")
        self.temperature = temperature
        self._llm = None  # Lazy initialization

    @property
    def provider_name(self) -> str:
        return "ollama"

    def get_langchain_llm(self) -> Any:
        """
        Returns a cached ChatOllama instance.
        If the requested model isn't available, falls back to the default model.
        """
        if self._llm is None:
            # Check if the specific model is available
            actual_model = self._resolve_model()

            self._llm = ChatOllama(
                base_url=self.base_url,
                model=actual_model,
                temperature=self.temperature,
            )
            logger.info(
                f"[OllamaProvider] Initialized ChatOllama with model '{actual_model}' "
                f"at {self.base_url}"
            )

        return self._llm

    def _resolve_model(self) -> str:
        """
        Checks if the requested model is available on the Ollama server.
        Falls back to FALLBACK_MODEL if not available.
        """
        try:
            available_models = self._get_available_models()
            if self.model_name in available_models:
                return self.model_name

            # Try fallback
            if FALLBACK_MODEL in available_models:
                logger.warning(
                    f"[OllamaProvider] Model '{self.model_name}' not found. "
                    f"Falling back to '{FALLBACK_MODEL}'."
                )
                return FALLBACK_MODEL

            # If even fallback isn't available, try the requested model anyway
            # (Ollama might auto-pull it)
            logger.warning(
                f"[OllamaProvider] Neither '{self.model_name}' nor '{FALLBACK_MODEL}' "
                f"found on server. Attempting '{self.model_name}' anyway."
            )
            return self.model_name

        except Exception as e:
            logger.warning(
                f"[OllamaProvider] Could not check available models: {e}. "
                f"Using requested model '{self.model_name}'."
            )
            return self.model_name

    def _get_available_models(self) -> list:
        """Fetches the list of installed models from the Ollama server."""
        try:
            resp = requests.get(f"{self.base_url}/api/tags", timeout=5)
            resp.raise_for_status()
            data = resp.json()
            return [m.get("name", "") for m in data.get("models", [])]
        except Exception:
            return []

    def is_available(self) -> bool:
        """Checks if the Ollama server is reachable."""
        try:
            resp = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return resp.status_code == 200
        except Exception:
            return False

    def get_status(self) -> Dict[str, Any]:
        """Returns status metadata for the /llm/status endpoint."""
        available = self.is_available()
        available_models = self._get_available_models() if available else []

        return {
            "provider": self.provider_name,
            "model": self.model_name,
            "available": available,
            "base_url": self.base_url,
            "installed_models": available_models,
            "fallback_model": FALLBACK_MODEL,
        }
