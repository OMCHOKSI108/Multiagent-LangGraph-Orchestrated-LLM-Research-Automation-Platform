"""
Strategy 7: Search Engine Scraper
===================================
Searches the web and returns a list of URLs + snippets.
Uses duckduckgo-search (no API key needed).
Returns search results as structured ScrapedContent for downstream scraping.
"""

import logging
from ..base import BaseScraper, ScrapedContent

logger = logging.getLogger("ai_engine.scraper.search_engine")


class SearchEngineScraper(BaseScraper):
    name = "search_engine"

    def can_handle(self, url: str) -> bool:
        return False  # Not a URL-based scraper; used with query strings

    def _scrape(self, url: str) -> ScrapedContent:
        """url is treated as a search query string here."""
        return self.search(url)

    def search(self, query: str, max_results: int = 8) -> ScrapedContent:
        """
        Search via DuckDuckGo. Returns ScrapedContent with text = formatted results.
        Also stored in metadata['results'] as list of dicts for structured access.
        """
        results = []

        # ── Primary: duckduckgo-search ────────────────────────────────────
        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                ddg_results = ddgs.text(query, max_results=max_results)
                for r in ddg_results:
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", ""),
                    })
        except Exception as e:
            logger.warning(f"[SearchEngineScraper] DuckDuckGo failed: {e}")

        # ── Fallback: googlesearch-python ─────────────────────────────────
        if not results:
            try:
                from googlesearch import search as google_search
                for url_ in google_search(query, num_results=max_results, lang="en"):
                    results.append({"title": "", "url": url_, "snippet": ""})
            except Exception as e:
                logger.warning(f"[SearchEngineScraper] Google fallback failed: {e}")

        # Format as readable text for LLM consumption
        text_parts = [f"Search Results for: {query}\n"]
        for i, r in enumerate(results, 1):
            text_parts.append(
                f"[{i}] {r['title']}\n    URL: {r['url']}\n    {r['snippet']}"
            )

        return ScrapedContent(
            url=f"search://{query}",
            title=f"Search: {query}",
            text="\n\n".join(text_parts),
            source_type="search",
            metadata={
                "query": query,
                "results": results,
                "result_count": len(results),
                "urls": [r["url"] for r in results],
            },
        )
