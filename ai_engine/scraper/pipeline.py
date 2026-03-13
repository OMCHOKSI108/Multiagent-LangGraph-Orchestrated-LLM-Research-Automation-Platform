"""
Scraping Pipeline
==================
Orchestrates the full scraping flow:
  1. Search for URLs
  2. Scrape each URL with auto-selected strategy
  3. Deduplicate by content hash
  4. Clean text
  5. Return structured list
"""

import hashlib
import logging
import re
from typing import List
from .selector import select_strategy, search_and_scrape
from .strategies.search_engine import SearchEngineScraper

logger = logging.getLogger("ai_engine.scraper.pipeline")


class ScrapingPipeline:
    """
    Full scraping pipeline: search → scrape → deduplicate → clean.
    Can be called from WebScraperAgent or directly from router_graph.
    """

    def __init__(self, n_search: int = 6, n_scrape: int = 5):
        self.n_search = n_search
        self.n_scrape = n_scrape

    def run(self, query: str, extra_urls: List[str] = None) -> dict:
        """
        Run the full pipeline for a query.
        Returns: { sources: [...], combined_text: str, query: str }
        """
        logger.info(f"[ScrapingPipeline] Starting for query: {query[:60]}")

        # Step 1: Search for URLs
        searcher = SearchEngineScraper()
        search_result = searcher.search(query, max_results=self.n_search)
        urls = search_result.metadata.get("urls", [])

        # Merge any explicitly provided extra URLs
        if extra_urls:
            urls = list(dict.fromkeys(urls + extra_urls))  # dedup, preserve order

        # Step 2: Scrape each URL
        raw_sources = []
        for url in urls[:self.n_scrape]:
            strategy = select_strategy(url)
            logger.debug(f"[ScrapingPipeline] Scraping {url} with {strategy.name}")
            content = strategy.scrape(url)
            if content.text and not content.error and len(content.text) > 80:
                raw_sources.append(content)

        # Step 3: Deduplicate by content hash
        seen_hashes = set()
        unique_sources = []
        for s in raw_sources:
            h = s.content_hash
            if h not in seen_hashes:
                seen_hashes.add(h)
                unique_sources.append(s)

        # Step 4: Format combined text for LLM
        combined_parts = [
            f"=== Source [{i+1}]: {s.title or s.url} ===\nURL: {s.url}\n\n{s.text[:3000]}"
            for i, s in enumerate(unique_sources)
        ]
        combined_text = "\n\n".join(combined_parts)

        logger.info(
            f"[ScrapingPipeline] Done: {len(unique_sources)} unique sources "
            f"({len(combined_text)} chars)"
        )
        return {
            "sources": [s.to_dict() for s in unique_sources],
            "combined_text": combined_text,
            "query": query,
            "source_count": len(unique_sources),
        }

    def scrape_url(self, url: str) -> dict:
        """Scrape a single URL and return as dict."""
        strategy = select_strategy(url)
        content = strategy.scrape(url)
        return content.to_dict()
