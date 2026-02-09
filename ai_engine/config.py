import os
from dotenv import load_dotenv

# Set Hugging Face Cache to D: drive (Local Project Folder)
# MUST BE SET BEFORE IMPORTING TRANSFORMERS
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
hf_cache_dir = os.path.join(project_root, "data", "huggingface")
os.makedirs(hf_cache_dir, exist_ok=True)
os.environ["HF_HOME"] = hf_cache_dir
print(f"[Config] HF_HOME set to: {hf_cache_dir}")

load_dotenv()

# Global Settings
LLM_MODE = os.getenv("LLM_MODE", "offline") # offline, online

# API Keys (for Online Mode)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Offline Model Settings (Ollama)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# Specialized Models (optimized for low storage / efficient performance)
# 'phi3:mini' is already installed and excellent for reasoning.
MODEL_REASONING = os.getenv("MODEL_REASONING", "phi3:mini")        # Logic, reasoning (Existing)
MODEL_WRITING = os.getenv("MODEL_WRITING", "gemma2:2b")            # Prose (Small, 1.6GB)
MODEL_CODING = os.getenv("MODEL_CODING", "qwen2.5-coder:1.5b")     # Code/JSON (Tiny, 1GB)
MODEL_CRITICAL = os.getenv("MODEL_CRITICAL", "phi3:mini")          # Critique (Reuse reasoning model) 

# Common Settings
MAX_TOKENS = int(os.getenv("MAX_TOKENS", 4096))

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
