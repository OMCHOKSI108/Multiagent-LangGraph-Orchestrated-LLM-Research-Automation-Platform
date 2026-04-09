import os
import logging
from dotenv import load_dotenv

logger = logging.getLogger("ai_engine.config")

# Set Hugging Face Cache to project-local directory
# MUST BE SET BEFORE IMPORTING TRANSFORMERS
engine_root = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(engine_root)
# Store HF assets inside the mounted ai_engine cache volume so downloads
# survive container restarts/recreates.
hf_cache_dir = os.path.join(engine_root, "cache", "huggingface")
os.makedirs(hf_cache_dir, exist_ok=True)
os.environ["HF_HOME"] = hf_cache_dir
print(f"[Config] HF_HOME set to: {hf_cache_dir}")

root_env_path = os.path.join(project_root, ".env")
load_dotenv(dotenv_path=root_env_path)

# ============================
# Environment
# ============================
# ENVIRONMENT controls behavior differences between local dev and production.
# Expected values: "development", "production", "staging" (case-insensitive).
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower() or "development"

# ============================
# LLM Mode (Dual-Mode Switching)
# ============================
# LLM_STATUS controls which provider is used:
#   OFFLINE → Ollama (local models)
#   ONLINE  → Cloud providers only (Groq/OpenRouter/Gemini)
#   HYBRID  → Prefer cloud providers, fallback to Ollama
#
# Backward compatibility: falls back to LLM_MODE if LLM_STATUS is not set.
_raw_status = os.getenv("LLM_STATUS", os.getenv("LLM_MODE", "ONLINE"))
LLM_STATUS = _raw_status.upper().strip()
_INVALID_LLM_STATUS = None

# Backward compat: map old values to new
if LLM_STATUS in ("OFFLINE", "OFF"):
    LLM_STATUS = "OFFLINE"
elif LLM_STATUS in ("ONLINE", "ON"):
    LLM_STATUS = "ONLINE"
elif LLM_STATUS in ("HYBRID", "AUTO", "MIXED"):
    LLM_STATUS = "HYBRID"
elif LLM_STATUS in ("HUGGINGFACE", "HF", "LOCAL"):
    LLM_STATUS = "HUGGINGFACE"
else:
    _INVALID_LLM_STATUS = LLM_STATUS
    LLM_STATUS = "HUGGINGFACE"

# Also keep LLM_MODE for legacy callers, but expose the true runtime mode too.
LLM_RUNTIME_MODE = {
    "OFFLINE": "offline",
    "ONLINE": "online",
    "HYBRID": "hybrid",
    "HUGGINGFACE": "huggingface",
}.get(LLM_STATUS, "huggingface")
LLM_MODE = LLM_RUNTIME_MODE

print(f"[Config] LLM_STATUS = {LLM_STATUS} (runtime={LLM_RUNTIME_MODE})")

# ============================
# API Keys (for Online Mode)
# ============================


def _parse_keys(prefix: str, legacy_key: str = None):
    """Helper to parse multi-keys like OPENROUTER_API_1,_2, etc."""
    raw = [
        os.getenv(f"{prefix}_1", ""),
        os.getenv(f"{prefix}_2", ""),
        os.getenv(f"{prefix}_3", ""),
    ]
    if legacy_key:
        raw.append(os.getenv(legacy_key, ""))
    return [k.strip() for k in raw if k and k.strip()]


# Multi-key OpenRouter support
OPENROUTER_API_KEYS = _parse_keys("OPENROUTER_API")

# Multi-key Groq support
GROQ_API_KEYS = _parse_keys("GROQ_API", "GROQ_API_KEY")
GROQ_API_KEY = GROQ_API_KEYS[0] if GROQ_API_KEYS else None

# Multi-key Gemini support
GEMINI_API_KEYS = _parse_keys("GEMINI_API", "GEMINI_API_KEY")
GEMINI_API_KEY = GEMINI_API_KEYS[0] if GEMINI_API_KEYS else None

# Serper.dev (Alternative Search)
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")

# Local Ollama endpoint used for OFFLINE mode and HuggingFace fallback.
# In Docker this should point to host.docker.internal or an ollama service,
# not localhost inside the ai_engine container.
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip() or "http://localhost:11434"

# ============================
# HuggingFace Model Settings (Local Inference)
# ============================
HUGGINGFACE_DEVICE = os.getenv("HUGGINGFACE_DEVICE", "auto")  # auto, cuda, cpu
HUGGINGFACE_QUANTIZATION = os.getenv("HUGGINGFACE_QUANTIZATION", "true").lower() in ("true", "1", "yes", "on")
HUGGINGFACE_PRELOAD_ON_STARTUP = os.getenv("HUGGINGFACE_PRELOAD_ON_STARTUP", "true").lower() in ("true", "1", "yes", "on")
HUGGINGFACE_PRELOAD_STRATEGY = (os.getenv("HUGGINGFACE_PRELOAD_STRATEGY", "download_only").strip().lower() or "download_only")

# Specialized Models (optimized for different tasks)
MODEL_HF_REASONING = os.getenv("MODEL_HF_REASONING", "microsoft/phi-3-medium-4k-instruct")  # Logic, reasoning
MODEL_HF_WRITING = os.getenv("MODEL_HF_WRITING", "microsoft/phi-3-medium-4k-instruct")  # Prose
MODEL_HF_CODING = os.getenv("MODEL_HF_CODING", "Qwen/Qwen2.5-Coder-7B-Instruct")  # Code/JSON
MODEL_HF_CRITICAL = os.getenv("MODEL_HF_CRITICAL", "microsoft/phi-3-medium-4k-instruct")  # Critique

# Local/Ollama models
MODEL_LOCAL_REASONING = os.getenv("MODEL_LOCAL_REASONING", "mistral:7b-instruct")
MODEL_LOCAL_WRITING = os.getenv("MODEL_LOCAL_WRITING", "gemma2:2b")
MODEL_LOCAL_CODING = os.getenv("MODEL_LOCAL_CODING", "qwen2.5-coder:latest")
MODEL_LOCAL_CRITICAL = os.getenv("MODEL_LOCAL_CRITICAL", MODEL_LOCAL_REASONING)

# Online/provider-routed models
MODEL_ONLINE_REASONING = os.getenv("MODEL_ONLINE_REASONING", "openrouter/anthropic/claude-3.5-sonnet")
MODEL_ONLINE_WRITING = os.getenv("MODEL_ONLINE_WRITING", "openrouter/openai/gpt-4o-mini")
MODEL_ONLINE_CODING = os.getenv("MODEL_ONLINE_CODING", "openrouter/deepseek/deepseek-coder")
MODEL_ONLINE_CRITICAL = os.getenv("MODEL_ONLINE_CRITICAL", "gemini/gemini-2.0-flash")

# Select the active model profile based on the configured mode.
if LLM_STATUS == "HUGGINGFACE":
    MODEL_REASONING = MODEL_HF_REASONING
    MODEL_WRITING = MODEL_HF_WRITING
    MODEL_CODING = MODEL_HF_CODING
    MODEL_CRITICAL = MODEL_HF_CRITICAL
elif LLM_STATUS == "OFFLINE":
    MODEL_REASONING = MODEL_LOCAL_REASONING
    MODEL_WRITING = MODEL_LOCAL_WRITING
    MODEL_CODING = MODEL_LOCAL_CODING
    MODEL_CRITICAL = MODEL_LOCAL_CRITICAL
else:
    MODEL_REASONING = MODEL_ONLINE_REASONING
    MODEL_WRITING = MODEL_ONLINE_WRITING
    MODEL_CODING = MODEL_ONLINE_CODING
    MODEL_CRITICAL = MODEL_ONLINE_CRITICAL

# HYBRID is the only mode that enables cross-family fallback by default.
LLM_ALLOW_CROSS_MODE_FALLBACKS = os.getenv(
    "LLM_ALLOW_CROSS_MODE_FALLBACKS",
    "true" if LLM_STATUS == "HYBRID" else "false",
).lower() in ("true", "1", "yes", "on")

# Active Groq fallback models used when ONLINE/HYBRID routing selects Groq.
DEPRECATED_GROQ_MODELS = {
    "llama3-70b-8192",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
    "llama-3.1-70b-versatile",
    "gemma2-9b-it",
}
_raw_groq_models = os.getenv("GROQ_ACTIVE_MODELS", "").strip()
DEFAULT_MODELS = [
    model.strip()
    for model in _raw_groq_models.split(",")
    if model.strip() and model.strip() not in DEPRECATED_GROQ_MODELS
] or [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
]

# Model Mapping for Cloud Providers (when ONLINE)
# Maps local Ollama aliases to valid cloud model IDs for each provider.
CLOUD_MODEL_MAPPINGS = {
    "groq": {
        "phi3:mini": "llama-3.1-8b-instant",
        "gemma2:2b": "llama-3.1-8b-instant",
        "qwen2.5-coder:latest": "llama-3.3-70b-versatile",
        "default": "llama-3.3-70b-versatile",
    },
    "openrouter": {
        "phi3:mini": "microsoft/phi-3-mini-128k-instruct",
        "gemma2:2b": "google/gemma-2-9b-it",
        "qwen2.5-coder:latest": "qwen/qwen-2.5-coder-32b-instruct",
        "default": "anthropic/claude-3.5-sonnet",
    },
    "gemini": {
        "phi3:mini": "gemini-1.5-flash",
        "gemma2:2b": "gemini-1.5-flash",
        "qwen2.5-coder:latest": "gemini-1.5-pro",
        "default": "gemini-1.5-flash",
    },
}


# Common Settings
def _parse_int(val, default):
    """Safely parse integer from env var, extracting numeric part only."""
    if val is None:
        return default
    import re

    match = re.match(r"^(\d+)", str(val).strip())
    if match:
        return int(match.group(1))
    return default


MAX_TOKENS = _parse_int(os.getenv("MAX_TOKENS"), 4096)


def validate_env():
    """
    Validates the environment configuration and logs warnings for
    missing or problematic settings. Called once on startup.
    """
    warnings = []

    if LLM_STATUS == "ONLINE":
        if not (GROQ_API_KEYS or OPENROUTER_API_KEYS or GEMINI_API_KEYS):
            msg = (
                "LLM_STATUS=ONLINE but no cloud LLM API keys found. "
                "Configure GROQ_API_*, OPENROUTER_API_*, or GEMINI_API_* in .env "
                "or set LLM_STATUS=OFFLINE to use local Ollama."
            )
            warnings.append(msg)
            # In non-development environments, treat this as a hard error
            if ENVIRONMENT != "development":
                raise RuntimeError(f"[Config] {msg}")
        else:
            if GROQ_API_KEYS:
                print(f"[Config] Groq API keys loaded: {len(GROQ_API_KEYS)} key(s)")

    elif LLM_STATUS == "HYBRID":
        if GROQ_API_KEYS:
            print(f"[Config] Groq API keys loaded: {len(GROQ_API_KEYS)} key(s)")
        if not (GROQ_API_KEYS or OPENROUTER_API_KEYS or GEMINI_API_KEYS):
            warnings.append(
                "LLM_STATUS=HYBRID but no cloud LLM API keys found. "
                "Proceeding with OFFLINE fallback (Ollama)."
            )

    elif LLM_STATUS == "OFFLINE":
        print(f"[Config] Ollama base URL: {OLLAMA_BASE_URL}")

    elif LLM_STATUS == "HUGGINGFACE":
        print(
            "[Config] HuggingFace preload: "
            f"{'enabled' if HUGGINGFACE_PRELOAD_ON_STARTUP else 'disabled'} "
            f"(strategy={HUGGINGFACE_PRELOAD_STRATEGY})"
        )

    elif _INVALID_LLM_STATUS:
        warnings.append(
            f"Unknown LLM_STATUS='{_INVALID_LLM_STATUS}'. Expected 'OFFLINE', 'ONLINE', 'HYBRID', or 'HUGGINGFACE'. "
            f"Defaulting to HUGGINGFACE."
        )

    for w in warnings:
        print(f"[Config] ⚠️  WARNING: {w}")
        logger.warning(w)

    return len(warnings) == 0


def get_active_model_profile():
    """Return the active model IDs for the currently selected LLM mode."""
    return {
        "reasoning": MODEL_REASONING,
        "writing": MODEL_WRITING,
        "coding": MODEL_CODING,
        "critical": MODEL_CRITICAL,
    }


def get_huggingface_preload_models():
    """Return unique Hugging Face model IDs that should be warmed on startup."""
    models = [
        MODEL_HF_REASONING,
        MODEL_HF_WRITING,
        MODEL_HF_CODING,
        MODEL_HF_CRITICAL,
    ]
    unique = []
    for model in models:
        if model and model not in unique:
            unique.append(model)
    return unique


# Run validation on import
validate_env()

# Search Provider Configuration
SEARCH_PROVIDERS = {
    "available": ["duckduckgo", "google", "arxiv", "wikipedia", "openalex", "pubmed"],
    "default": ["duckduckgo", "arxiv"],
    "descriptions": {
        "duckduckgo": "General web search with privacy focus",
        "google": "Google search (requires API key)",
        "arxiv": "Academic papers and preprints",
        "wikipedia": "Wikipedia encyclopedia articles",
        "openalex": "Open access scientific literature",
        "pubmed": "Medical and life science literature",
    },
    "config": {
        "google": {
            "api_key": os.getenv("GOOGLE_SEARCH_API_KEY"),
            "cx": os.getenv("GOOGLE_SEARCH_CX"),
        },
        "pubmed": {"email": os.getenv("PUBMED_EMAIL", "research@example.com")},
    },
}
