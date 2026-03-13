"""
Strategy 2: Academic Scraper
=============================
Fetches papers from arXiv, Semantic Scholar, and PubMed APIs.
Returns structured academic content with citations.
"""

import logging
from ..base import BaseScraper, ScrapedContent

logger = logging.getLogger("ai_engine.scraper.academic")

ACADEMIC_DOMAINS = {"arxiv.org", "semanticscholar.org", "pubmed.ncbi.nlm.nih.gov",
                    "scholar.google.com", "researchgate.net", "doi.org", "ncbi.nlm.nih.gov"}


class AcademicScraper(BaseScraper):
    name = "academic"

    def can_handle(self, url: str) -> bool:
        return any(d in url for d in ACADEMIC_DOMAINS)

    def _scrape(self, url: str) -> ScrapedContent:
        if "arxiv.org" in url:
            return self._scrape_arxiv(url)
        if "pubmed" in url or "ncbi.nlm.nih.gov" in url:
            return self._scrape_pubmed(url)
        # Generic academic fallback
        return self._scrape_generic_academic(url)

    def _scrape_arxiv(self, url: str) -> ScrapedContent:
        """Use the arXiv Python client for clean structured data."""
        import re
        arxiv_id = re.search(r"(\d{4}\.\d{4,5})", url)
        if not arxiv_id:
            raise ValueError(f"Cannot extract arXiv ID from {url}")

        try:
            import arxiv
            client = arxiv.Client()
            search = arxiv.Search(id_list=[arxiv_id.group(1)])
            results = list(client.results(search))
            if not results:
                raise ValueError("No arXiv results found")
            paper = results[0]
            text = f"Title: {paper.title}\n\nAbstract: {paper.summary}"
            return ScrapedContent(
                url=url,
                title=paper.title,
                text=text,
                authors=[str(a) for a in paper.authors],
                published_date=str(paper.published.date()),
                source_type="academic",
                metadata={
                    "doi": paper.doi,
                    "primary_category": paper.primary_category,
                    "pdf_url": paper.pdf_url,
                },
            )
        except ImportError:
            # Fallback: arXiv abstract page
            return self._scrape_generic_academic(url)

    def _scrape_pubmed(self, url: str) -> ScrapedContent:
        """Fetch PubMed abstract via E-utilities API."""
        import re
        import requests
        pmid = re.search(r"(\d{6,})", url)
        if not pmid:
            return self._scrape_generic_academic(url)

        api_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
        params = {"db": "pubmed", "id": pmid.group(1), "retmode": "xml"}
        resp = requests.get(api_url, params=params, timeout=10)
        # Simple title/abstract extraction from XML
        from xml.etree import ElementTree as ET
        root = ET.fromstring(resp.text)
        title = root.findtext(".//ArticleTitle") or ""
        abstract = root.findtext(".//AbstractText") or ""
        authors_els = root.findall(".//LastName")
        authors = [a.text for a in authors_els if a.text]
        return ScrapedContent(
            url=url,
            title=title,
            text=f"Title: {title}\n\nAbstract: {abstract}",
            authors=authors,
            source_type="academic",
        )

    def _scrape_generic_academic(self, url: str) -> ScrapedContent:
        """Fallback: article scraper for any academic page."""
        from .article import ArticleScraper
        result = ArticleScraper()._scrape(url)
        result.source_type = "academic"
        return result
