"""
Scraper Selector
=================
Auto-selects the best scraping strategy for a given URL.
Also provides search() as the primary entry point for query-based scraping.
"""

from urllib.parse import urlparse
from .base import BaseScraper
from .strategies.article import ArticleScraper
from .strategies.academic import AcademicScraper
from .strategies.metadata import MetadataScraper
from .strategies.table import TableScraper
from .strategies.pdf import PdfScraper
from .strategies.crawler import CrawlerScraper
from .strategies.search_engine import SearchEngineScraper

# Instances of each strategy (cheap to create, stateless)
_article  = ArticleScraper()
_academic = AcademicScraper()
_metadata = MetadataScraper()
_table    = TableScraper()
_pdf      = PdfScraper()
_search   = SearchEngineScraper()

ACADEMIC_DOMAINS = {
    "arxiv.org", "semanticscholar.org", "pubmed.ncbi.nlm.nih.gov",
    "scholar.google.com", "researchgate.net", "doi.org",
    "ncbi.nlm.nih.gov", "biorxiv.org", "medrxiv.org",
}


def select_strategy(url: str) -> BaseScraper:
    """
    Choose the best scraping strategy for a URL.
    Order of priority: PDF → Academic → Table → Article (default)
    """
    url_lower = url.lower()
    parsed = urlparse(url_lower)
    domain = parsed.netloc.replace("www.", "")

    if url_lower.endswith(".pdf") or "/pdf/" in url_lower:
        return _pdf

    if any(d in domain for d in ACADEMIC_DOMAINS):
        return _academic

    if any(h in url_lower for h in ("table", "dataset", "statistics", "data")):
        return _table

    return _article  # default for everything else


def search_and_scrape(query: str, n_sources: int = 5) -> list:
    """
    1. Search DuckDuckGo for `query`
    2. Scrape top n_sources URLs with auto-selected strategy
    3. Return list of ScrapedContent.to_dict()
    """
    from .strategies.search_engine import SearchEngineScraper
    searcher = SearchEngineScraper()
    search_result = searcher.search(query, max_results=n_sources * 2)
    urls = search_result.metadata.get("urls", [])[:n_sources]

    scraped = []
    for url in urls:
        strategy = select_strategy(url)
        content = strategy.scrape(url)
        if content.text and not content.error:
            scraped.append(content)

    return [s.to_dict() for s in scraped]
