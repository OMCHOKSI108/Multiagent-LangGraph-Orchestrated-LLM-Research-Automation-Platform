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
    "duckduckgo",
    "google",
    "arxiv",
    "wikipedia",
    "openalex",
    "pubmed",
]

DEFAULT_PROVIDERS = ["duckduckgo", "arxiv"]


def _query_variants(query: str) -> List[str]:
    """Build lightweight fallback variants for zero-hit queries."""
    q = (query or "").strip()
    if not q:
        return []

    compact = " ".join(q.split())
    alnum = "".join(
        ch if ch.isalnum() or ch.isspace() else " " for ch in compact
    )
    simplified = " ".join(alnum.split())

    variants = [compact]
    if simplified and simplified.lower() != compact.lower():
        variants.append(simplified)
    if simplified:
        variants.append(f"{simplified} overview")

    # Deduplicate while preserving order
    seen = set()
    ordered = []
    for v in variants:
        key = v.lower()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(v)
    return ordered


def _fallback_results(query: str) -> List[Dict[str, Any]]:
    """Return deterministic fallback links when providers return no hits."""
    from urllib.parse import quote_plus

    q = quote_plus((query or "").strip())
    if not q:
        return []

    return [
        {
            "title": "DuckDuckGo search results",
            "url": f"https://duckduckgo.com/?q={q}",
            "description": (
                "Fallback search page generated because providers returned "
                "no direct hits."
            ),
            "source": "fallback",
            "favicon": _get_favicon("https://duckduckgo.com"),
            "thumbnail": None,
            "published": None,
        },
        {
            "title": "Wikipedia search",
            "url": f"https://en.wikipedia.org/w/index.php?search={q}",
            "description": (
                "Fallback encyclopedia search page for topic discovery."
            ),
            "source": "fallback",
            "favicon": _get_favicon("https://wikipedia.org"),
            "thumbnail": None,
            "published": None,
        },
        {
            "title": "Google search results",
            "url": f"https://www.google.com/search?q={q}",
            "description": (
                "Fallback web search page for manual result expansion."
            ),
            "source": "fallback",
            "favicon": _get_favicon("https://google.com"),
            "thumbnail": None,
            "published": None,
        },
    ]


def _get_favicon(url: str) -> str:
    """Generate a favicon URL from a page URL."""
    if not url:
        return ""
    try:
        hostname = urlparse(url).netloc
        if hostname:
            return (
                "https://s2.googleusercontent.com/s2/favicons"
                f"?domain={hostname}&sz=32"
            )
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
        from .providers import PROVIDER_REGISTRY

        provider = PROVIDER_REGISTRY["duckduckgo"]
        raw_results = provider.search(query, max_results=max_results)
        from .metrics import inc as metrics_inc

        results = [
            _normalize_result(r, "duckduckgo")
            for r in raw_results
            if "error" not in r
        ]
        if results:
            metrics_inc("provider_duckduckgo_success")
        else:
            metrics_inc("provider_duckduckgo_empty")
        return results
    except Exception as e:
        from .metrics import inc as metrics_inc

        metrics_inc("provider_duckduckgo_failure")
        logger.error(f"[SearchService] DuckDuckGo error: {e}")
        return []


def _search_google(query: str, max_results: int) -> List[Dict[str, Any]]:
    """Search using Google provider."""
    try:
        from .providers import PROVIDER_REGISTRY

        provider = PROVIDER_REGISTRY["google"]
        raw_results = provider.search(query, max_results=max_results)
        from .metrics import inc as metrics_inc

        results = [
            _normalize_result(r, "google")
            for r in raw_results
            if "error" not in r
        ]
        if results:
            metrics_inc("provider_google_success")
        else:
            metrics_inc("provider_google_empty")
        return results
    except Exception as e:
        from .metrics import inc as metrics_inc

        metrics_inc("provider_google_failure")
        logger.error(f"[SearchService] Google error: {e}")
        return []


def _search_arxiv(query: str, max_results: int) -> List[Dict[str, Any]]:
    """Search using Arxiv provider."""
    try:
        from .providers import PROVIDER_REGISTRY

        provider = PROVIDER_REGISTRY["arxiv"]
        raw_results = provider.search(query, max_results=max_results)
        from .metrics import inc as metrics_inc

        results = [
            _normalize_result(r, "arxiv")
            for r in raw_results
            if "error" not in r
        ]
        if results:
            metrics_inc("provider_arxiv_success")
        else:
            metrics_inc("provider_arxiv_empty")
        return results
    except Exception as e:
        from .metrics import inc as metrics_inc

        metrics_inc("provider_arxiv_failure")
        logger.error(f"[SearchService] Arxiv error: {e}")
        return []


def _search_wikipedia(query: str, max_results: int) -> List[Dict[str, Any]]:
    """Search using Wikipedia provider."""
    try:
        from .providers import PROVIDER_REGISTRY

        provider = PROVIDER_REGISTRY["wikipedia"]
        raw_results = provider.search(query, max_results=max_results)
        from .metrics import inc as metrics_inc

        results = [
            _normalize_result(r, "wikipedia")
            for r in raw_results
            if "error" not in r
        ]
        if results:
            metrics_inc("provider_wikipedia_success")
        else:
            metrics_inc("provider_wikipedia_empty")
        return results
    except Exception as e:
        from .metrics import inc as metrics_inc

        metrics_inc("provider_wikipedia_failure")
        logger.error(f"[SearchService] Wikipedia error: {e}")
        return []


def _search_openalex(query: str, max_results: int) -> List[Dict[str, Any]]:
    """Search using OpenAlex provider."""
    try:
        from .providers import PROVIDER_REGISTRY

        provider = PROVIDER_REGISTRY["openalex"]
        raw_results = provider.search(query, max_results=max_results)
        from .metrics import inc as metrics_inc

        results = [
            _normalize_result(r, "openalex")
            for r in raw_results
            if "error" not in r
        ]
        if results:
            metrics_inc("provider_openalex_success")
        else:
            metrics_inc("provider_openalex_empty")
        return results
    except Exception as e:
        from .metrics import inc as metrics_inc

        metrics_inc("provider_openalex_failure")
        logger.error(f"[SearchService] OpenAlex error: {e}")
        return []


def _search_pubmed(query: str, max_results: int) -> List[Dict[str, Any]]:
    """Search using PubMed provider."""
    try:
        from .providers import PROVIDER_REGISTRY

        provider = PROVIDER_REGISTRY["pubmed"]
        raw_results = provider.search(query, max_results=max_results)
        from .metrics import inc as metrics_inc

        results = [
            _normalize_result(r, "pubmed")
            for r in raw_results
            if "error" not in r
        ]
        if results:
            metrics_inc("provider_pubmed_success")
        else:
            metrics_inc("provider_pubmed_empty")
        return results
    except Exception as e:
        from .metrics import inc as metrics_inc

        metrics_inc("provider_pubmed_failure")
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


class SearchService:
    """Unified search service wrapper for use by route handlers."""

    def get_available_providers(self) -> List[str]:
        return AVAILABLE_PROVIDERS.copy()

    async def search(
        self,
        query: str,
        providers: Optional[List[str]] = None,
        max_results: int = 10,
    ) -> Dict[str, Any]:
        import time

        start = time.time()
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            _search_executor, search_sync, query, providers, max_results
        )
        result["execution_time"] = round(time.time() - start, 3)
        return result


def search_sync(
    query: str, providers: Optional[List[str]] = None, max_results: int = 10
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
        return {
            "query": query,
            "results": [],
            "total_results": 0,
            "providers_used": [],
            "errors": [],
        }

    explicit_providers = providers is not None
    selected = providers or DEFAULT_PROVIDERS
    selected = [p for p in selected if p in PROVIDER_FUNCTIONS]
    if not selected:
        selected = DEFAULT_PROVIDERS

    all_results: List[Dict[str, Any]] = []
    providers_used: List[str] = []
    errors: List[Dict[str, Any]] = []

    import concurrent.futures

    def run_once(active_query: str, active_providers: List[str]):
        per_provider = max(1, max_results // max(1, len(active_providers)))
        local_results: List[Dict[str, Any]] = []
        local_used: List[str] = []
        with concurrent.futures.ThreadPoolExecutor(
            max_workers=max(1, len(active_providers))
        ) as pool:
            future_map = {
                pool.submit(
                    PROVIDER_FUNCTIONS[p], active_query, per_provider
                ): p
                for p in active_providers
            }
            completed = set()
            try:
                for future in concurrent.futures.as_completed(
                    future_map, timeout=20
                ):
                    completed.add(future)
                    provider_name = future_map[future]
                    try:
                        results = future.result()
                        if results:
                            error_results = [r for r in results if "error" in r]
                            valid_results = [
                                r for r in results if "error" not in r
                            ]
                            if error_results:
                                for err in error_results:
                                    errors.append(
                                        {
                                            "provider": provider_name,
                                            "error": err.get(
                                                "error", "Unknown error"
                                            ),
                                        }
                                    )
                            if valid_results:
                                local_results.extend(valid_results)
                                local_used.append(provider_name)
                        else:
                            logger.warning(
                                "[SearchService] "
                                f"{provider_name}: no results for query "
                                f"'{active_query}'"
                            )
                    except Exception as e:
                        logger.error(
                            f"[SearchService] Provider {provider_name} "
                            f"failed: {e}"
                        )
                        errors.append({"provider": provider_name, "error": str(e)})
            except concurrent.futures.TimeoutError:
                unfinished = [
                    future_map[f]
                    for f in future_map
                    if f not in completed
                ]
                for provider_name in unfinished:
                    errors.append(
                        {
                            "provider": provider_name,
                            "error": "timeout",
                        }
                    )
        return local_results, local_used

    # Pass 1: requested providers, variant queries
    for qv in _query_variants(query):
        pass_results, pass_used = run_once(qv, selected)
        all_results.extend(pass_results)
        providers_used.extend(pass_used)
        if pass_results:
            break

    # Pass 2: broaden provider set if still empty.
    # Keep provider tests strict when caller explicitly asks for providers.
    if not all_results and not explicit_providers:
        broadened = [p for p in AVAILABLE_PROVIDERS if p in PROVIDER_FUNCTIONS]
        for qv in _query_variants(query):
            pass_results, pass_used = run_once(qv, broadened)
            all_results.extend(pass_results)
            providers_used.extend(pass_used)
            if pass_results:
                break

    seen_urls = set()
    deduplicated = []
    for r in all_results:
        url = r.get("url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            deduplicated.append(r)
        elif not url:
            deduplicated.append(r)

    deduplicated = deduplicated[:max_results]

    # Hard fallback for zero-result scenarios to avoid empty UX states.
    if not deduplicated:
        deduplicated = _fallback_results(query)[:max_results]
        if deduplicated:
            providers_used.append("fallback")

    return {
        "query": query,
        "results": deduplicated,
        "total_results": len(deduplicated),
        "providers_used": providers_used,
        "errors": errors,
    }
