"""
Strategy 7: Search Engine Scraper
===================================
Searches the web and returns a list of URLs + snippets.
Uses duckduckgo-search (no API key needed).
Returns search results as structured ScrapedContent for downstream scraping.
"""

import logging
from urllib.parse import quote_plus
from ..base import BaseScraper, ScrapedContent

logger = logging.getLogger("ai_engine.scraper.search_engine")


class SearchEngineScraper(BaseScraper):
    name = "search_engine"

    def can_handle(self, url: str) -> bool:
        return False  # Not a URL-based scraper; used with query strings

    def _scrape(self, url: str) -> ScrapedContent:
        """url is treated as a search query string here."""
        return self.search(url)

    def _query_variants(self, query: str) -> list[str]:
        base = " ".join((query or "").split())
        if not base:
            return []

        simplified = "".join(
            ch if ch.isalnum() or ch.isspace() else " " for ch in base
        )
        simplified = " ".join(simplified.split())

        candidates = [base]
        if simplified and simplified.lower() != base.lower():
            candidates.append(simplified)
        if simplified:
            candidates.append(f"{simplified} overview")

        out = []
        seen = set()
        for c in candidates:
            key = c.lower()
            if key in seen:
                continue
            seen.add(key)
            out.append(c)
        return out

    def _fallback_results(self, query: str, max_results: int) -> list[dict]:
        q = quote_plus((query or "").strip())
        if not q:
            return []
        candidates = [
            {
                "title": "DuckDuckGo search results",
                "url": f"https://duckduckgo.com/?q={q}",
                "snippet": "Fallback search page.",
            },
            {
                "title": "Google search results",
                "url": f"https://www.google.com/search?q={q}",
                "snippet": "Fallback search page.",
            },
            {
                "title": "Wikipedia search",
                "url": f"https://en.wikipedia.org/w/index.php?search={q}",
                "snippet": "Fallback encyclopedia search page.",
            },
            {
                "title": "ArXiv search",
                "url": f"https://arxiv.org/search/?query={q}&searchtype=all",
                "snippet": "Fallback academic search page.",
            },
        ]
        return candidates[:max_results]

    def search(self, query: str, max_results: int = 8) -> ScrapedContent:
        """
        Search via DuckDuckGo and return formatted ScrapedContent.
        Also stores metadata['results'] as structured result objects.
        """
        results = []

        for candidate_query in self._query_variants(query):
            # ── Primary: duckduckgo-search ────────────────────────────────
            try:
                from duckduckgo_search import DDGS

                with DDGS() as ddgs:
                    ddg_results = ddgs.text(
                        candidate_query, max_results=max_results
                    )
                    for r in ddg_results:
                        results.append(
                            {
                                "title": r.get("title", ""),
                                "url": r.get("href", ""),
                                "snippet": r.get("body", ""),
                            }
                        )
            except Exception as e:
                logger.warning(f"[SearchEngineScraper] DuckDuckGo failed: {e}")

            # ── Fallback: googlesearch-python ─────────────────────────────
            if not results:
                try:
                    from googlesearch import search as google_search

                    for url_ in google_search(
                        candidate_query,
                        num_results=max_results,
                        lang="en",
                    ):
                        results.append(
                            {"title": "", "url": url_, "snippet": ""}
                        )
                except Exception as e:
                    logger.warning(
                        "[SearchEngineScraper] Google fallback failed: "
                        f"{e}"
                    )

            if results:
                break

        if not results:
            results = self._fallback_results(query, max_results)

        # Format as readable text for LLM consumption
        text_parts = [f"Search Results for: {query}\n"]
        for i, r in enumerate(results, 1):
            title = r.get("title", "")
            url = r.get("url", "")
            snippet = r.get("snippet", "")
            text_parts.append(
                f"[{i}] {title}\n    URL: {url}\n    {snippet}"
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
                "urls": [r.get("url", "") for r in results if r.get("url")],
            },
        )
