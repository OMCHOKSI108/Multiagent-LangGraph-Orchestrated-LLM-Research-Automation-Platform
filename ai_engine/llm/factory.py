"""
LLM Provider Factory
=====================
Centralizes provider selection based on the LLM_STATUS environment variable.

LLM_STATUS=OFFLINE  →  OllamaProvider  (local Ollama server)
LLM_STATUS=ONLINE   →  GroqProvider    (Groq cloud API with key rotation)

Features:
    - Singleton caching per model name (avoids redundant connections)
    - Automatic fallback if the selected provider is unavailable
    - Backward compatibility with old LLM_MODE variable
    - get_llm_status() for the /llm/status API endpoint
"""

import logging
from typing import Any, Dict
from .ollama_provider import OllamaProvider
from .groq_provider import GroqProvider
from .base import LLMProvider

logger = logging.getLogger("ai_engine.llm.factory")

# ============================
# Singleton Cache
# ============================
# Keyed by (provider_type, model_name) to reuse connections
_PROVIDER_CACHE: Dict[str, LLMProvider] = {}


def _get_config():
    """
    Lazily imports config to avoid circular imports.
    Config is loaded once by Python's import system and cached.
    """
    try:
        import config
    except ImportError:
        import sys
        import os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        import config
    return config


def get_llm_provider(model_name: str = None) -> LLMProvider:
    """
    Returns the appropriate LLM provider based on the LLM_STATUS env variable.

    Args:
        model_name: The model to use. If None, uses MODEL_REASONING from config.

    Returns:
        An LLMProvider instance (OllamaProvider or GroqProvider).

    Behavior:
        - LLM_STATUS=OFFLINE → OllamaProvider (checks server connectivity)
        - LLM_STATUS=ONLINE  → GroqProvider (requires at least one GROQ_API key)
        - If the selected provider is unavailable, falls back to the other
    """
    cfg = _get_config()

    # Resolve model name
    if model_name is None:
        model_name = getattr(cfg, "MODEL_REASONING", "phi3:mini")

    # Determine the target mode
    llm_status = getattr(cfg, "LLM_STATUS", "OFFLINE").upper()

    # Cache key
    cache_key = f"{llm_status}:{model_name}"
    if cache_key in _PROVIDER_CACHE:
        return _PROVIDER_CACHE[cache_key]

    provider = None

    if llm_status == "OFFLINE":
        provider = _create_ollama_provider(cfg, model_name)

        # Fallback to Groq if Ollama is unreachable
        if not provider.is_available():
            groq_keys = getattr(cfg, "GROQ_API_KEYS", [])
            if groq_keys:
                logger.warning(
                    "[Factory] Ollama is unreachable. Falling back to Groq (ONLINE)."
                )
                provider = _create_groq_provider(cfg, model_name)
            else:
                logger.warning(
                    "[Factory] Ollama is unreachable and no Groq keys configured. "
                    "Proceeding with Ollama anyway (may fail on invoke)."
                )

    elif llm_status == "ONLINE":
        groq_keys = getattr(cfg, "GROQ_API_KEYS", [])

        if groq_keys:
            provider = _create_groq_provider(cfg, model_name)
        else:
            logger.warning(
                "[Factory] LLM_STATUS=ONLINE but no Groq API keys found. "
                "Falling back to Ollama (OFFLINE)."
            )
            provider = _create_ollama_provider(cfg, model_name)

    else:
        logger.warning(
            f"[Factory] Unknown LLM_STATUS='{llm_status}'. "
            f"Defaulting to OFFLINE (Ollama)."
        )
        provider = _create_ollama_provider(cfg, model_name)

    # Cache and return
    _PROVIDER_CACHE[cache_key] = provider
    logger.info(
        f"[Factory] Provider created: {provider.provider_name} "
        f"(model: {model_name}, mode: {llm_status})"
    )
    return provider


def _create_ollama_provider(cfg, model_name: str) -> OllamaProvider:
    """Creates an OllamaProvider with config values."""
    base_url = getattr(cfg, "OLLAMA_BASE_URL", "http://localhost:11434")
    return OllamaProvider(
        model_name=model_name,
        base_url=base_url,
        temperature=0.7,
    )


def _create_groq_provider(cfg, model_name: str) -> GroqProvider:
    """Creates a GroqProvider with config values."""
    groq_keys = getattr(cfg, "GROQ_API_KEYS", [])
    return GroqProvider(
        api_keys=groq_keys,
        model_name=model_name,
        temperature=0.7,
    )


def get_llm_status() -> Dict[str, Any]:
    """
    Returns the current LLM mode and provider status.

    Used by the /llm/status API endpoint to inform the frontend
    about which mode and provider are active.

    Returns:
        {
            "mode": "OFFLINE" | "ONLINE",
            "provider": { ... provider-specific status ... },
            "config": {
                "model_reasoning": "...",
                "model_writing": "...",
                "model_coding": "...",
                "model_critical": "...",
            }
        }
    """
    cfg = _get_config()
    llm_status = getattr(cfg, "LLM_STATUS", "OFFLINE").upper()

    # Get the primary provider status (using the reasoning model)
    try:
        provider = get_llm_provider()
        provider_status = provider.get_status()
    except Exception as e:
        provider_status = {"error": str(e), "available": False}

    return {
        "mode": llm_status,
        "provider": provider_status,
        "config": {
            "model_reasoning": getattr(cfg, "MODEL_REASONING", "phi3:mini"),
            "model_writing": getattr(cfg, "MODEL_WRITING", "gemma2:2b"),
            "model_coding": getattr(cfg, "MODEL_CODING", "qwen2.5-coder:1.5b"),
            "model_critical": getattr(cfg, "MODEL_CRITICAL", "phi3:mini"),
            "max_tokens": getattr(cfg, "MAX_TOKENS", 4096),
        },
    }


def clear_provider_cache():
    """Clears the provider cache. Useful for testing or hot-reloading config."""
    global _PROVIDER_CACHE
    _PROVIDER_CACHE.clear()
    logger.info("[Factory] Provider cache cleared.")
