import os
import logging
from dotenv import load_dotenv

logger = logging.getLogger("ai_engine.config")

# Set Hugging Face Cache to D: drive (Local Project Folder)
# MUST BE SET BEFORE IMPORTING TRANSFORMERS
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
hf_cache_dir = os.path.join(project_root, "data", "huggingface")
os.makedirs(hf_cache_dir, exist_ok=True)
os.environ["HF_HOME"] = hf_cache_dir
print(f"[Config] HF_HOME set to: {hf_cache_dir}")

load_dotenv()

# ============================
# LLM Mode (Dual-Mode Switching)
# ============================
# LLM_STATUS controls which provider is used:
#   OFFLINE → Ollama (local models)
#   ONLINE  → Groq (cloud API with key rotation)
#
# Backward compatibility: falls back to LLM_MODE if LLM_STATUS is not set.
_raw_status = os.getenv("LLM_STATUS", os.getenv("LLM_MODE", "OFFLINE"))
LLM_STATUS = _raw_status.upper().strip()

# Backward compat: map old values to new
if LLM_STATUS in ("OFFLINE", "OFF"):
    LLM_STATUS = "OFFLINE"
elif LLM_STATUS in ("ONLINE", "ON"):
    LLM_STATUS = "ONLINE"

# Also keep LLM_MODE for any code that still references it
LLM_MODE = "offline" if LLM_STATUS == "OFFLINE" else "online"

print(f"[Config] LLM_STATUS = {LLM_STATUS} (mode={LLM_MODE})")

# ============================
# API Keys (for Online Mode)
# ============================

def _parse_keys(prefix: str, legacy_key: str = None):
    """Helper to parse multi-keys like OPENROUTER_API_1,_2, etc."""
    raw = [
        os.getenv(f"{prefix}_1", ""),
        os.getenv(f"{prefix}_2", ""),
        os.getenv(f"{prefix}_3", "")
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

# ============================
# Offline Model Settings (Ollama)
# ============================
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# Specialized Models (optimized for low storage / efficient performance)
# 'phi3:mini' is already installed and excellent for reasoning.
MODEL_REASONING = os.getenv("MODEL_REASONING", "phi3:mini")        # Logic, reasoning (Existing)
MODEL_WRITING = os.getenv("MODEL_WRITING", "gemma2:2b")            # Prose (Small, 1.6GB)
MODEL_CODING = os.getenv("MODEL_CODING", "qwen2.5-coder:1.5b")     # Code/JSON (Tiny, 1GB)
MODEL_CRITICAL = os.getenv("MODEL_CRITICAL", "phi3:mini")          # Critique (Reuse reasoning model) 

# Common Settings
MAX_TOKENS = int(os.getenv("MAX_TOKENS", 4096))


def validate_env():
    """
    Validates the environment configuration and logs warnings for
    missing or problematic settings. Called once on startup.
    """
    warnings = []

    if LLM_STATUS == "ONLINE":
        if not GROQ_API_KEYS:
            warnings.append(
                "LLM_STATUS=ONLINE but no Groq API keys found. "
                "Set GROQ_API_1, GROQ_API_2, or GROQ_API_3 in .env"
            )
        else:
            print(f"[Config] Groq API keys loaded: {len(GROQ_API_KEYS)} key(s)")

    elif LLM_STATUS == "OFFLINE":
        print(f"[Config] Ollama base URL: {OLLAMA_BASE_URL}")

    else:
        warnings.append(
            f"Unknown LLM_STATUS='{LLM_STATUS}'. Expected 'OFFLINE' or 'ONLINE'. "
            f"Defaulting to OFFLINE."
        )

    for w in warnings:
        print(f"[Config] ⚠️  WARNING: {w}")
        logger.warning(w)

    return len(warnings) == 0


# Run validation on import
validate_env()

# Search Provider Configuration
SEARCH_PROVIDERS = {
    "available": [
        "duckduckgo",
        "google",
        "arxiv", 
        "wikipedia",
        "openalex",
        "pubmed"
    ],
    "default": [
        "duckduckgo",
        "arxiv"
    ],
    "descriptions": {
        "duckduckgo": "General web search with privacy focus",
        "google": "Google search (requires API key)",
        "arxiv": "Academic papers and preprints",
        "wikipedia": "Wikipedia encyclopedia articles",
        "openalex": "Open access scientific literature", 
        "pubmed": "Medical and life science literature"
    },
    "config": {
        "google": {
            "api_key": os.getenv("GOOGLE_SEARCH_API_KEY"),
            "cx": os.getenv("GOOGLE_SEARCH_CX")
        },
        "pubmed": {
            "email": os.getenv("PUBMED_EMAIL", "research@example.com")
        }
    }
}
