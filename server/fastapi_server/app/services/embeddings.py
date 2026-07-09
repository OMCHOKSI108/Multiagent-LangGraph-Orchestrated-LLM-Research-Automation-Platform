import numpy as np
from ..config import settings

_encoder = None


def _get_local_encoder():
    global _encoder
    if _encoder is None:
        from sentence_transformers import SentenceTransformer
        _encoder = SentenceTransformer(settings.embedding_model)
    return _encoder


async def embed_text(text: str) -> list[float]:
    if settings.embedding_provider == "local":
        return _embed_local(text)
    elif settings.embedding_provider == "openai":
        return await _embed_openai(text)
    raise ValueError(f"Unknown embedding provider: {settings.embedding_provider}")


async def embed_batch(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    if settings.embedding_provider == "local":
        return _embed_local_batch(texts)
    elif settings.embedding_provider == "openai":
        return await _embed_openai_batch(texts)
    raise ValueError(f"Unknown embedding provider: {settings.embedding_provider}")


def _embed_local(text: str) -> list[float]:
    encoder = _get_local_encoder()
    vec = encoder.encode(text, normalize_embeddings=True)
    return vec.tolist()


def _embed_local_batch(texts: list[str]) -> list[list[float]]:
    encoder = _get_local_encoder()
    vecs = encoder.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return [v.tolist() for v in vecs]


async def _embed_openai(text: str) -> list[float]:
    results = await _embed_openai_batch([text])
    return results[0] if results else []


async def _embed_openai_batch(texts: list[str]) -> list[list[float]]:
    import httpx

    api_key = settings.openai_api_key or settings.openrouter_api_key
    if not api_key:
        raise ValueError("No API key for OpenAI-compatible embedding")

    base = settings.openai_base_url or "https://api.openai.com/v1"
    model = settings.openai_embedding_model or "text-embedding-3-small"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{base}/embeddings",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"input": texts, "model": model},
        )
        resp.raise_for_status()
        data = resp.json()
        sorted_data = sorted(data["data"], key=lambda x: x["index"])
        return [item["embedding"] for item in sorted_data]
