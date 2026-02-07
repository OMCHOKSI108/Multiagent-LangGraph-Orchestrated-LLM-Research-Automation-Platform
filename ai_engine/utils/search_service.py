"""
Unified Search Service.

Wraps all existing search providers into a single service
with a normalized response format. Inspired by opensearch-ai's
Brave Search integration but using our existing providers.
"""
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse

logger = logging.getLogger("ai_engine.search")

# Thread pool for parallel provider queries
_search_executor = ThreadPoolExecutor(max_workers=6)

# Provider name → class mapping
AVAILABLE_PROVIDERS = [
    "duckduckgo", "google", "arxiv", "wikipedia", "openalex", "pubmed"
]

DEFAULT_PROVIDERS = ["duckduckgo", "arxiv"]


def _get_favicon(url: str) -> str:
    """Generate a favicon URL from a page URL."""
    if not url:
        return ""
    try:
        hostname = urlparse(url).netloc
        if hostname:
            return f"https://s2.googleusercontent.com/s2/favicons?domain={hostname}&sz=32"
    except Exception:
        pass
    return ""


def _normalize_result(raw: Dict[str, Any], source: str) -> Dict[str, Any]:
    """Normalize a provider-specific result into the unified schema."""
    url = raw.get("url") or raw.get("href") or ""
    title = raw.get("title") or ""
    description = (
        raw.get("body")
        or raw.get("summary")
        or raw.get("description")
        or raw.get("snippet")
        or ""
    )
    return {
        "title": title,
        "url": url,
        "description": description,
        "source": source,
        "favicon": _get_favicon(url),
        "thumbnail": raw.get("thumbnail") or raw.get("image") or None,
        "published": raw.get("published") or None,
    }


def _search_duckduckgo(query: str, max_results: int) -> List[Dict[str, Any]]:
    """Search using DuckDuckGo provider."""
    try:
        from .providers import WebSearchProvider
        provider = WebSearchProvider()
        raw_results = provider.search(query, max_results=max_results)
        return [_normalize_result(r, "duckduckgo") for r in raw_results]
    except Exception as e:
        logger.error(f"[SearchService] DuckDuckGo error: {e}")
        return []


def _search_google(query: str, max_results: int) -> List[Dict[str, Any]]:
    """Search using Google provider."""
    
    try:
        from .providers import GoogleSearchProvider
        provider = GoogleSearchProvider()
        raw_results = provider.search(query, max_results=max_results)
        return [_normalize_result(r, "google") for r in raw_results]
    except Exception as e:
        logger.error(f"[SearchService] Google error: {e}")
        return []


def _search_arxiv(query: str, max_results: int) -> List[Dict[str, Any]]:
    """Search using Arxiv provider."""
    try:
        from .providers import ArxivProvider
        provider = ArxivProvider()
        raw_results = provider.search_papers(query, max_results=max_results)
        return [_normalize_result(r, "arxiv") for r in raw_results]
    except Exception as e:
        logger.error(f"[SearchService] Arxiv error: {e}")
        return []


def _search_wikipedia(query: str, max_results: int) -> List[Dict[str, Any]]:
    """Search using Wikipedia provider."""
    try:
        from .providers import WikipediaProvider
        provider = WikipediaProvider()
        raw_results = provider.search(query, max_results=max_results)
        return [_normalize_result(r, "wikipedia") for r in raw_results]
    except Exception as e:
        logger.error(f"[SearchService] Wikipedia error: {e}")
        return []


def _search_openalex(query: str, max_results: int) -> List[Dict[str, Any]]:
    """Search using OpenAlex provider."""
    try:
        from .providers import OpenAlexProvider
        provider = OpenAlexProvider()
        raw_results = provider.search(query, max_results=max_results)
        return [_normalize_result(r, "openalex") for r in raw_results]
    except Exception as e:
        logger.error(f"[SearchService] OpenAlex error: {e}")
        return []


def _search_pubmed(query: str, max_results: int) -> List[Dict[str, Any]]:
    """Search using PubMed provider."""
    try:
        from .providers import PubMedProvider
        provider = PubMedProvider()
        raw_results = provider.search(query, max_results=max_results)
        return [_normalize_result(r, "pubmed") for r in raw_results]
    except Exception as e:
        logger.error(f"[SearchService] PubMed error: {e}")
        return []


# Provider dispatcher
PROVIDER_FUNCTIONS = {
    "duckduckgo": _search_duckduckgo,
    "google": _search_google,
    "arxiv": _search_arxiv,
    "wikipedia": _search_wikipedia,
    "openalex": _search_openalex,
    "pubmed": _search_pubmed,
}


def search_sync(
    query: str,
    providers: Optional[List[str]] = None,
    max_results: int = 10
) -> Dict[str, Any]:
    """
    Synchronous unified search across multiple providers.

    Args:
        query: Search query string.
        providers: List of provider names. Defaults to duckduckgo + arxiv.
        max_results: Max results per provider.

    Returns:
        Unified search response with normalized results.
    """
    if not query or not query.strip():
        return {"query": query, "results": [], "total_results": 0, "providers_used": []}

    selected = providers or DEFAULT_PROVIDERS
    selected = [p for p in selected if p in PROVIDER_FUNCTIONS]

    if not selected:
        selected = DEFAULT_PROVIDERS

    per_provider = max(1, max_results // len(selected))
    all_results = []
    providers_used = []

    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(selected)) as pool:
        future_map = {
            pool.submit(PROVIDER_FUNCTIONS[p], query, per_provider): p
            for p in selected
        }
        for future in concurrent.futures.as_completed(future_map, timeout=15):
            provider_name = future_map[future]
            try:
                results = future.result()
                if results:
                    all_results.extend(results)
                    providers_used.append(provider_name)
            except Exception as e:
                logger.error(f"[SearchService] Provider {provider_name} failed: {e}")

    # Deduplicate by URL
    seen_urls = set()
    deduplicated = []
    for r in all_results:
        url = r.get("url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            deduplicated.append(r)
        elif not url:
            deduplicated.append(r)

    # Trim to max_results
    deduplicated = deduplicated[:max_results]

    return {
        "query": query,
        "results": deduplicated,
        "total_results": len(deduplicated),
        "providers_used": providers_used,
    }
