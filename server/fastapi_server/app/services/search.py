import asyncio

import httpx
from exa_py import Exa

from ..config import settings

_exa_client: Exa | None = None


def get_exa() -> Exa:
    global _exa_client
    if _exa_client is None:
        _exa_client = Exa(api_key=settings.exa_api_key)
    return _exa_client


async def search_web(query: str, max_results: int = None) -> list[dict]:
    provider = settings.web_search_provider
    max_results = max_results or settings.web_max_search_results

    if provider == "exa" and settings.exa_api_key:
        return await _search_exa(query, max_results)
    elif provider == "tavily" and settings.tavily_api_key:
        return await _search_tavily(query, max_results)
    elif provider == "searchspace" and settings.searchspace_api_key:
        return await _search_searchspace(query, max_results)
    else:
        return await _search_fallback(query, max_results)


async def _search_exa(query: str, max_results: int) -> list[dict]:
    try:
        exa = get_exa()
        results = exa.search(
            query,
            type="auto",
            num_results=max_results,
            contents={"highlights": True},
        )
        return [
            {
                "title": r.title or "",
                "url": r.url or "",
                "snippet": (r.highlights[0] if r.highlights else r.text or "") or "",
            }
            for r in results.results
        ]
    except Exception as e:
        return [{"title": f"Exa search error: {e}", "url": "", "snippet": ""}]


SEARCHSPACE_BASE = "https://q.searchspace.io"


async def _search_searchspace(query: str, max_results: int) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{SEARCHSPACE_BASE}/v1/search",
                headers={
                    "authorization": f"Bearer {settings.searchspace_api_key}",
                    "content-type": "application/json",
                },
                json={
                    "query": query,
                    "top_k": max_results,
                    "contents": {
                        "highlights": {"num_sentences": 2},
                    },
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return [
                {
                    "title": r.get("title") or "",
                    "url": r.get("url") or "",
                    "snippet": (
                        r["highlights"][0] if r.get("highlights") else r.get("snippet") or ""
                    ),
                }
                for r in data.get("results", [])
            ]
    except Exception as e:
        return [{"title": f"SearchSpace error: {e}", "url": "", "snippet": ""}]


async def _search_tavily(query: str, max_results: int) -> list[dict]:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.tavily.com/search",
            json={"api_key": settings.tavily_api_key, "query": query, "max_results": max_results},
        )
        data = resp.json()
        return [
            {"title": r.get("title", ""), "url": r.get("url", ""), "snippet": r.get("content", "")}
            for r in data.get("results", [])
        ]


async def _search_fallback(query: str, max_results: int) -> list[dict]:
    try:
        from duckduckgo_search import DDGS

        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", ""),
                })
        return results
    except Exception as e:
        return [{"title": f"Search error: {e}", "url": "", "snippet": ""}]


async def crawl_pages(urls: list[str], max_sources: int = None) -> list[dict]:
    from .scraper import scrape_url

    max_sources = max_sources or settings.web_max_sources_to_crawl
    urls = urls[:max_sources]

    semaphore = asyncio.Semaphore(settings.web_crawl_concurrency)

    async def limited_crawl(url: str):
        async with semaphore:
            return await scrape_url(url)

    tasks = [limited_crawl(url) for url in urls if url]
    results = await asyncio.gather(*tasks)
    return [r for r in results if r is not None]
