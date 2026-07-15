import os
from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    postgres_user: str = "kuchi_user"
    postgres_password: str = "kuchi_password"
    postgres_db: str = "kuchi_db"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    default_llm_provider: Literal["groq", "openrouter", "cerebras"] = "groq"

    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    openrouter_api_key: str = ""
    openrouter_model: str = "meta-llama/llama-3.1-8b-instruct"
    cerebras_api_key: str = ""
    cerebras_model: str = "gemma-4-31b"

    llm_request_timeout: int = 60
    max_context_messages: int = 12

    web_search_provider: Literal["duckduckgo", "tavily", "brave", "exa", "searchspace"] = "exa"
    tavily_api_key: str = ""
    brave_search_api_key: str = ""
    exa_api_key: str = ""
    searchspace_api_key: str = ""
    web_max_search_results: int = 10
    web_max_sources_to_crawl: int = 5
    web_crawl_timeout: int = 60
    web_crawl_concurrency: int = 3
    web_chunk_size_chars: int = 4000
    web_chunk_overlap_chars: int = 500
    web_rag_top_k: int = 8
    web_rag_min_score: float = 0.25

    embedding_provider: Literal["local", "openai"] = "local"
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dimension: int = 384
    openai_api_key: str = ""
    openai_base_url: str = ""
    openai_embedding_model: str = "text-embedding-3-small"

    chunk_size: int = 900
    chunk_overlap: int = 150
    top_k_retrieval: int = 5
    min_retrieval_score: float = 0.30

    feature_document_rag: bool = True
    feature_web_research: bool = True
    feature_research_projects: bool = True
    feature_draft_writer: bool = True
    feature_latex: bool = False
    feature_voice: bool = False
    feature_jobs: bool = False
    feature_scheduler: bool = False
    feature_notifications: bool = False
    feature_evaluation: bool = False

    demo_mode: bool = False

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        extra = "ignore"


settings = Settings()
