"""
Base Scraper
============
Abstract base class for all 7 scraping strategies.
Every strategy must implement .scrape(url) → ScrapedContent.
"""

from dataclasses import dataclass, field
from typing import Optional
from abc import ABC, abstractmethod
import logging
import hashlib

logger = logging.getLogger("ai_engine.scraper")


@dataclass
class ScrapedContent:
    url: str
    title: str = ""
    text: str = ""
    authors: list = field(default_factory=list)
    published_date: str = ""
    source_type: str = "web"          # web | academic | pdf | table | news
    strategy: str = "article"         # which strategy was used
    metadata: dict = field(default_factory=dict)
    error: Optional[str] = None

    @property
    def content_hash(self) -> str:
        return hashlib.sha256(self.text.encode()).hexdigest()[:16]

    @property
    def word_count(self) -> int:
        return len(self.text.split())

    def to_dict(self) -> dict:
        return {
            "url": self.url,
            "title": self.title,
            "text": self.text[:8000],          # cap at 8k chars for state
            "authors": self.authors,
            "published_date": self.published_date,
            "source_type": self.source_type,
            "strategy": self.strategy,
            "metadata": self.metadata,
            "word_count": self.word_count,
            "content_hash": self.content_hash,
        }


class BaseScraper(ABC):
    """Abstract base for all scraping strategies."""

    name: str = "base"

    def scrape(self, url: str) -> ScrapedContent:
        """
        Public entry point. Wraps _scrape() with error handling.
        """
        try:
            result = self._scrape(url)
            if result.text:
                result.text = self._clean_text(result.text)
            result.strategy = self.name
            return result
        except Exception as e:
            logger.warning(f"[{self.name}] Failed to scrape {url}: {e}")
            return ScrapedContent(url=url, strategy=self.name, error=str(e))

    @abstractmethod
    def _scrape(self, url: str) -> ScrapedContent:
        """Subclasses implement the actual scraping logic."""
        ...

    def _clean_text(self, text: str) -> str:
        """Basic whitespace normalization."""
        import re
        text = re.sub(r"\s+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def can_handle(self, url: str) -> bool:
        """Override to indicate when this strategy is best for a URL."""
        return True
