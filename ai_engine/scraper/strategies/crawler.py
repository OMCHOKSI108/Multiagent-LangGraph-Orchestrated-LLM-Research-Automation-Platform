"""
Strategy 6: Multi-Page Crawler
================================
Crawls multiple pages from a domain starting from a seed URL.
Uses httpx for async requests + BeautifulSoup for link extraction.
Respects depth limit and domain boundary.
"""

import logging
import re
from urllib.parse import urljoin, urlparse
from ..base import BaseScraper, ScrapedContent

logger = logging.getLogger("ai_engine.scraper.crawler")


class CrawlerScraper(BaseScraper):
    name = "crawler"

    def __init__(self, max_pages: int = 5, max_depth: int = 2):
        self.max_pages = max_pages
        self.max_depth = max_depth

    def can_handle(self, url: str) -> bool:
        return False  # Only used when explicitly requested

    def _scrape(self, url: str) -> ScrapedContent:
        """Crawls up to max_pages pages starting from url."""
        import requests
        from bs4 import BeautifulSoup

        base_domain = urlparse(url).netloc
        visited = set()
        queue = [(url, 0)]
        all_text_parts = []
        all_titles = []

        while queue and len(visited) < self.max_pages:
            current_url, depth = queue.pop(0)
            if current_url in visited or depth > self.max_depth:
                continue
            visited.add(current_url)

            try:
                resp = requests.get(
                    current_url, timeout=10,
                    headers={"User-Agent": "Mozilla/5.0"}
                )
                soup = BeautifulSoup(resp.text, "html.parser")

                # Extract text
                for tag in soup(["script", "style", "nav", "footer"]):
                    tag.decompose()
                page_text = soup.get_text(separator=" ", strip=True)
                if page_text:
                    all_text_parts.append(f"--- Page: {current_url} ---\n{page_text[:3000]}")

                if soup.title:
                    all_titles.append(soup.title.string or "")

                # Discover links (same domain only)
                if depth < self.max_depth:
                    for link in soup.find_all("a", href=True):
                        href = urljoin(current_url, link["href"])
                        parsed = urlparse(href)
                        if (parsed.netloc == base_domain
                                and href not in visited
                                and parsed.scheme in ("http", "https")):
                            queue.append((href, depth + 1))

                logger.debug(f"[CrawlerScraper] Crawled: {current_url} (depth={depth})")

            except Exception as e:
                logger.debug(f"[CrawlerScraper] Skipping {current_url}: {e}")

        return ScrapedContent(
            url=url,
            title=all_titles[0] if all_titles else url,
            text="\n\n".join(all_text_parts),
            source_type="web",
            metadata={
                "pages_crawled": len(visited),
                "urls": list(visited),
            },
        )
