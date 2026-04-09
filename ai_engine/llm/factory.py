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
from .huggingface_provider import HuggingFaceProvider
from .base import LLMProvider
# from .monitoring_wrapper import wrap_provider_with_monitoring

logger = logging.getLogger("ai_engine.llm.factory")

_PROVIDER_CACHE: Dict[str, LLMProvider] = {}


def _allow_cross_mode_fallbacks(cfg) -> bool:
    value = getattr(cfg, "LLM_ALLOW_CROSS_MODE_FALLBACKS", False)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ("true", "1", "yes", "on")
    if isinstance(value, (int, float)):
        return bool(value)
    return False


def _cache_key(llm_status: str, model_name: str) -> str:
    return f"{llm_status}:{model_name}"


def cache_provider_instance(llm_status: str, model_name: str, provider: LLMProvider):
    _PROVIDER_CACHE[_cache_key(llm_status.upper(), model_name)] = provider


def _get_config():
    """
    Lazily imports config to avoid circular imports.
    Config is loaded once by Python's import system and cached.
    """
    try:
        from ai_engine import config
    except ImportError:
        import sys
        import os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from ai_engine import config
    return config


def _groq_fallback_models(cfg, primary_model: str) -> List[str]:
    defaults = list(getattr(cfg, "DEFAULT_MODELS", []))
    return [model for model in defaults if model != primary_model]


def get_llm_provider(model_name: str = None) -> LLMProvider:
    cfg = _get_config()

    if model_name is None:
        model_name = getattr(cfg, "MODEL_REASONING", "phi3:mini")

    llm_status = getattr(cfg, "LLM_STATUS", "OFFLINE").upper()
    if llm_status not in ("OFFLINE", "ONLINE", "HYBRID", "HUGGINGFACE"):
        logger.warning(
            f"[Factory] Unknown LLM_STATUS='{llm_status}'. Defaulting to HUGGINGFACE."
        )
        llm_status = "HUGGINGFACE"

    cache_key = _cache_key(llm_status, model_name)
    if cache_key in _PROVIDER_CACHE:
        return _PROVIDER_CACHE[cache_key]

    if llm_status == "HUGGINGFACE":
        provider = _create_huggingface_provider(cfg, model_name)
        if not provider.is_available() and _allow_cross_mode_fallbacks(cfg):
            logger.warning("[Factory] HuggingFace model unavailable. Falling back to Ollama.")
            provider = _create_ollama_provider(cfg, model_name)
            if not provider.is_available():
                fallback_provider = _resolve_online_provider(cfg, model_name)
                if fallback_provider is not None and fallback_provider.is_available():
                    logger.warning(
                        "[Factory] Ollama fallback is unreachable. Falling back to an ONLINE provider."
                    )
                    provider = fallback_provider
                else:
                    logger.warning(
                        "[Factory] Ollama fallback is unreachable and no ONLINE provider is available."
                    )
    elif llm_status == "OFFLINE":
        provider = _create_ollama_provider(cfg, model_name)
        if not provider.is_available() and _allow_cross_mode_fallbacks(cfg):
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
        if provider is None:
            if _allow_cross_mode_fallbacks(cfg):
                logger.warning(
                    f"[Factory] No ONLINE provider configured for {model_name}. Falling back to HuggingFace."
                )
                provider = _create_huggingface_provider(cfg, model_name)
            else:
                raise RuntimeError(
                    f"No ONLINE provider configured for model '{model_name}'. "
                    "Configure GROQ/OPENROUTER/GEMINI keys or switch LLM_STATUS."
                )
        elif not provider.is_available() and _allow_cross_mode_fallbacks(cfg):
            logger.warning(
                f"[Factory] Selected ONLINE provider for {model_name} is unavailable. Falling back to HuggingFace."
            )
            provider = _create_huggingface_provider(cfg, model_name)
    else:  # HYBRID
        provider = _resolve_online_provider(cfg, model_name)
        if provider is None or not provider.is_available():
            logger.info(
                f"[Factory] HYBRID mode: no available cloud provider for {model_name}. Falling back to HuggingFace."
            )
            provider = _create_huggingface_provider(cfg, model_name)

    _PROVIDER_CACHE[cache_key] = provider
    logger.info(
        f"[Factory] Provider created: {provider.provider_name} "
        f"(model: {model_name}, mode: {llm_status})"
    )

    # Wrap with monitoring for API usage tracking
    # monitored_provider = wrap_provider_with_monitoring(provider)
    # logger.info(f"[Factory] Provider wrapped with monitoring: {monitored_provider.provider_name}")
    # return monitored_provider

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


def _create_huggingface_provider(cfg, model_name: str) -> HuggingFaceProvider:
    # Map common model names to HuggingFace model IDs
    model_mapping = {
        "phi3:mini": "microsoft/phi-3-mini-4k-instruct",
        "phi3:medium": "microsoft/phi-3-medium-4k-instruct",
        "phi3:large": "microsoft/phi-3-large-128k-instruct",
        "gemma2:2b": "google/gemma-2-2b-it",
        "gemma2:9b": "google/gemma-2-9b-it",
        "qwen2.5-coder": "Qwen/Qwen2.5-Coder-7B-Instruct",
        "qwen2.5-coder:latest": "Qwen/Qwen2.5-Coder-7B-Instruct",
        "llama3.2:3b": "meta-llama/Llama-3.2-3B-Instruct",
        "llama3.1:8b": "meta-llama/Llama-3.1-8B-Instruct",
        "mistral:7b": "mistralai/Mistral-7B-Instruct-v0.1",
    }

    hf_model_name = model_mapping.get(model_name, model_name)

    # If it's already a HuggingFace model ID, use it directly
    if "/" in hf_model_name:
        final_model = hf_model_name
    else:
        # Default to Phi-3 mini for unknown models
        final_model = "microsoft/phi-3-mini-4k-instruct"

    device = getattr(cfg, "HUGGINGFACE_DEVICE", "auto")
    use_quantization = getattr(cfg, "HUGGINGFACE_QUANTIZATION", True)

    return HuggingFaceProvider(
        model_name=final_model,
        device=device,
        use_quantization=use_quantization
    )


def _lightweight_provider_status(cfg, llm_status: str, model_name: str) -> Dict[str, Any]:
    """
    Build provider metadata for /llm/status without triggering model loads
    or provider availability probes.
    """
    cache_key = f"{llm_status}:{model_name}"
    cached_provider = _PROVIDER_CACHE.get(cache_key)

    if cached_provider is not None:
        try:
            return cached_provider.get_status()
        except Exception as e:
            return {
                "provider": getattr(cached_provider, "provider_name", "unknown"),
                "model": getattr(cached_provider, "model_name", model_name),
                "available": False,
                "error": str(e),
                "cached": True,
            }

    if llm_status == "HUGGINGFACE":
        hf_provider = _create_huggingface_provider(cfg, model_name)
        return {
            "provider": "huggingface",
            "model": hf_provider.model_name,
            "device": getattr(cfg, "HUGGINGFACE_DEVICE", "auto"),
            "available": False,
            "loaded": False,
            "quantization": getattr(cfg, "HUGGINGFACE_QUANTIZATION", True),
            "cached": False,
        }

    if llm_status == "OFFLINE":
        return {
            "provider": "ollama",
            "model": model_name,
            "base_url": getattr(cfg, "OLLAMA_BASE_URL", "http://localhost:11434"),
            "available": False,
            "cached": False,
        }

    if llm_status in ("ONLINE", "HYBRID"):
        if model_name.startswith("groq/") or getattr(cfg, "GROQ_API_KEYS", []):
            provider_name = "groq"
        elif model_name.startswith("openrouter/") or getattr(cfg, "OPENROUTER_API_KEYS", []):
            provider_name = "openrouter"
        elif model_name.startswith("gemini/") or getattr(cfg, "GEMINI_API_KEYS", []):
            provider_name = "gemini"
        else:
            provider_name = "unconfigured"

        return {
            "provider": provider_name,
            "model": model_name,
            "available": provider_name != "unconfigured",
            "cached": False,
        }

    return {
        "provider": "unknown",
        "model": model_name,
        "available": False,
        "cached": False,
    }


def get_llm_status() -> Dict[str, Any]:
    cfg = _get_config()
    llm_status = getattr(cfg, "LLM_STATUS", "OFFLINE").upper()
    model_name = getattr(cfg, "MODEL_REASONING", "phi3:mini")

    try:
        provider_status = _lightweight_provider_status(cfg, llm_status, model_name)
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
