"""
LLM Provider Factory
=====================
Centralizes provider selection based on the LLM_STATUS environment variable.

LLM_STATUS=OFFLINE  -> OllamaProvider  (local Ollama server)
LLM_STATUS=ONLINE   -> Cloud providers (Groq/OpenRouter/Gemini)
LLM_STATUS=HYBRID   -> Prefer cloud providers, then Ollama fallback

Features:
    - Singleton caching per model name (avoids redundant connections)
    - Groq multi-model fallback for decommissioned/invalid model IDs
    - Automatic provider fallback if the selected provider is unavailable
    - get_llm_status() for the /llm/status API endpoint
"""

import logging
from typing import Any, Dict, List
from .ollama_provider import OllamaProvider
from .groq_provider import GroqProvider
from .openrouter_provider import OpenRouterProvider
from .gemini_provider import GeminiProvider
from .base import LLMProvider

logger = logging.getLogger("ai_engine.llm.factory")

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


def _groq_fallback_models(cfg, primary_model: str) -> List[str]:
    defaults = list(getattr(cfg, "DEFAULT_MODELS", []))
    return [model for model in defaults if model != primary_model]


def get_llm_provider(model_name: str = None) -> LLMProvider:
    cfg = _get_config()

    if model_name is None:
        model_name = getattr(cfg, "MODEL_REASONING", "phi3:mini")

    llm_status = getattr(cfg, "LLM_STATUS", "OFFLINE").upper()
    if llm_status not in ("OFFLINE", "ONLINE", "HYBRID"):
        logger.warning(
            f"[Factory] Unknown LLM_STATUS='{llm_status}'. Defaulting to OFFLINE (Ollama)."
        )
        llm_status = "OFFLINE"

    cache_key = f"{llm_status}:{model_name}"
    if cache_key in _PROVIDER_CACHE:
        return _PROVIDER_CACHE[cache_key]

    if llm_status == "OFFLINE":
        provider = _create_ollama_provider(cfg, model_name)
        if not provider.is_available():
            groq_keys = getattr(cfg, "GROQ_API_KEYS", [])
            if groq_keys:
                logger.warning("[Factory] Ollama unreachable. Falling back to Groq.")
                provider = _create_groq_provider(cfg, model_name)
            else:
                logger.warning(
                    "[Factory] Ollama unreachable and no Groq keys configured. Proceeding with Ollama anyway."
                )
    elif llm_status == "ONLINE":
        provider = _resolve_online_provider(cfg, model_name)
        if provider is None or not provider.is_available():
            logger.warning(
                f"[Factory] Selected ONLINE provider for {model_name} is unavailable. Falling back to Ollama."
            )
            provider = _create_ollama_provider(cfg, model_name)
    else:
        provider = _resolve_online_provider(cfg, model_name)
        if provider is None or not provider.is_available():
            logger.info(
                f"[Factory] HYBRID mode: no available cloud provider for {model_name}. Falling back to Ollama."
            )
            provider = _create_ollama_provider(cfg, model_name)

    _PROVIDER_CACHE[cache_key] = provider
    logger.info(
        f"[Factory] Provider created: {provider.provider_name} "
        f"(model: {model_name}, mode: {llm_status})"
    )
    return provider


def _resolve_online_provider(cfg, model_name: str) -> LLMProvider:
    mappings = getattr(cfg, "CLOUD_MODEL_MAPPINGS", {})

    if model_name.startswith("openrouter/"):
        target_model = model_name.replace("openrouter/", "", 1)
        final_model = mappings.get("openrouter", {}).get(target_model, target_model)
        return _create_openrouter_provider(cfg, final_model)

    if model_name.startswith("gemini/"):
        target_model = model_name.replace("gemini/", "", 1)
        final_model = mappings.get("gemini", {}).get(target_model, target_model)
        return _create_gemini_provider(cfg, final_model)

    if model_name.startswith("groq/"):
        target_model = model_name.replace("groq/", "", 1)
        final_model = mappings.get("groq", {}).get(target_model, target_model)
        return _create_groq_provider(cfg, final_model)

    if getattr(cfg, "GROQ_API_KEYS", []):
        final_model = mappings.get("groq", {}).get(model_name, mappings.get("groq", {}).get("default", model_name))
        return _create_groq_provider(cfg, final_model)

    if getattr(cfg, "OPENROUTER_API_KEYS", []):
        final_model = mappings.get("openrouter", {}).get(model_name, model_name)
        return _create_openrouter_provider(cfg, final_model)

    if getattr(cfg, "GEMINI_API_KEYS", []):
        final_model = mappings.get("gemini", {}).get(model_name, model_name)
        return _create_gemini_provider(cfg, final_model)

    return None


def _create_ollama_provider(cfg, model_name: str) -> OllamaProvider:
    base_url = getattr(cfg, "OLLAMA_BASE_URL", "http://localhost:11434")
    return OllamaProvider(
        model_name=model_name,
        base_url=base_url,
        temperature=0.7,
    )


def _create_groq_provider(cfg, model_name: str) -> GroqProvider:
    groq_keys = getattr(cfg, "GROQ_API_KEYS", [])
    return GroqProvider(
        api_keys=groq_keys,
        model_name=model_name,
        temperature=0.7,
        fallback_models=_groq_fallback_models(cfg, model_name),
    )


def _create_openrouter_provider(cfg, model_name: str) -> 'OpenRouterProvider':
    openrouter_keys = getattr(cfg, "OPENROUTER_API_KEYS", [])
    clean_model = model_name.replace("openrouter/", "", 1) if model_name.startswith("openrouter/") else model_name
    return OpenRouterProvider(
        api_keys=openrouter_keys,
        model_name=clean_model,
        temperature=0.7,
    )


def _create_gemini_provider(cfg, model_name: str) -> 'GeminiProvider':
    gemini_keys = getattr(cfg, "GEMINI_API_KEYS", [])
    return GeminiProvider(
        api_keys=gemini_keys,
        model_name=model_name,
        temperature=0.7,
    )


def get_llm_status() -> Dict[str, Any]:
    cfg = _get_config()
    llm_status = getattr(cfg, "LLM_STATUS", "OFFLINE").upper()

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
            "model_coding": getattr(cfg, "MODEL_CODING", "qwen2.5-coder:latest"),
            "model_critical": getattr(cfg, "MODEL_CRITICAL", "phi3:mini"),
            "groq_default_models": list(getattr(cfg, "DEFAULT_MODELS", [])),
            "max_tokens": getattr(cfg, "MAX_TOKENS", 4096),
        },
    }


def clear_provider_cache():
    global _PROVIDER_CACHE
    _PROVIDER_CACHE.clear()
