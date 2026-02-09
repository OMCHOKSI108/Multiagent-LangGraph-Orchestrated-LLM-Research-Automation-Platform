import io
import time
import json
import requests
from typing import List, Dict, Any
from urllib.parse import quote_plus

# =========================
# Optional Dependencies
# =========================

try:
    from duckduckgo_search import DDGS
except ImportError:
    try:
        from ddgs import DDGS
    except ImportError:
        DDGS = None

try:
    import arxiv
except ImportError:
    arxiv = None

try:
    import wikipedia
except ImportError:
    wikipedia = None

try:
    from googlesearch import search
except ImportError:
    search = None

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

from .event_emitter import emit_source, emit_search


# =========================
# Base Provider
# =========================

class SearchProvider:
    def __init__(self, name: str):
        self.name = name

    def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        raise NotImplementedError


# =========================
# DuckDuckGo
# =========================

class DuckDuckGoProvider(SearchProvider):
    def __init__(self):
        super().__init__("duckduckgo")
        self.ddgs = DDGS() if DDGS else None

    def search(self, query: str, max_results: int = 5):
        if not self.ddgs:
            return [{"error": "DuckDuckGo not available"}]

        emit_search(query, "duckduckgo")
        results = []

        try:
            for r in self.ddgs.text(query, max_results=max_results):
                item = {
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "description": r.get("body", ""),
                    "source": "duckduckgo",
                }
                results.append(item)

                emit_source(
                    source_type="web",
                    domain="duckduckgo.com",
                    url=item["url"],
                    title=item["title"],
                    description=item["description"][:200],
                    items_found=1,
                )
        except Exception as e:
            return [{"error": str(e)}]

        return results


# =========================
# Google
# =========================

class GoogleProvider(SearchProvider):
    def __init__(self):
        super().__init__("google")

    def search(self, query: str, max_results: int = 5):
        if not search:
            return [{"error": "googlesearch-python not installed"}]

        emit_search(query, "google")
        results = []

        try:
            for r in search(query, num_results=max_results, advanced=True):
                item = {
                    "title": getattr(r, "title", r.url),
                    "url": r.url,
                    "description": getattr(r, "description", ""),
                    "source": "google",
                }
                results.append(item)

                emit_source(
                    source_type="web",
                    domain="google.com",
                    url=item["url"],
                    title=item["title"],
                    description=item["description"][:200],
                    items_found=1,
                )
        except Exception as e:
            return [{"error": str(e)}]

        return results


# =========================
# ArXiv
# =========================

class ArxivProvider(SearchProvider):
    def __init__(self):
        super().__init__("arxiv")

    def search(self, query: str, max_results: int = 5):
        if not arxiv:
            return [{"error": "arxiv package not installed"}]

        emit_search(query, "arxiv")
        results = []

        try:
            search_obj = arxiv.Search(
                query=query,
                max_results=max_results,
                sort_by=arxiv.SortCriterion.Relevance,
            )
            client = arxiv.Client()

            for r in client.results(search_obj):
                item = {
                    "title": r.title,
                    "url": r.pdf_url,
                    "description": r.summary[:300],
                    "source": "arxiv",
                    "published": r.published.strftime("%Y-%m-%d"),
                    "authors": [a.name for a in r.authors],
                }
                results.append(item)

                emit_source(
                    source_type="arxiv",
                    domain="arxiv.org",
                    url=item["url"],
                    title=item["title"],
                    description=item["description"],
                    published_date=item["published"],
                    items_found=1,
                )
        except Exception as e:
            return [{"error": str(e)}]

        return results


# =========================
# Wikipedia
# =========================

class WikipediaProvider(SearchProvider):
    def __init__(self):
        super().__init__("wikipedia")

    def search(self, query: str, max_results: int = 5):
        if not wikipedia:
            return [{"error": "wikipedia package not installed"}]

        emit_search(query, "wikipedia")
        results = []

        try:
            for title in wikipedia.search(query, results=max_results):
                try:
                    summary = wikipedia.summary(title, sentences=3)
                    page = wikipedia.page(title, auto_suggest=False)

                    item = {
                        "title": title,
                        "url": page.url,
                        "description": summary,
                        "source": "wikipedia",
                    }
                    results.append(item)

                    emit_source(
                        source_type="web",
                        domain="wikipedia.org",
                        url=item["url"],
                        title=item["title"],
                        description=item["description"][:200],
                        items_found=1,
                    )
                except Exception:
                    continue
        except Exception as e:
            return [{"error": str(e)}]

        return results


# =========================
# OpenAlex
# =========================

class OpenAlexProvider(SearchProvider):
    def __init__(self):
        super().__init__("openalex")

    def search(self, query: str, max_results: int = 5):
        emit_search(query, "openalex")
        url = (
            f"https://api.openalex.org/works"
            f"?search={quote_plus(query)}"
            f"&per-page={max_results}&sort=publication_date:desc"
        )

        try:
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            data = r.json()

            results = []
            for item in data.get("results", []):
                landing = item.get("primary_location", {}).get("landing_page_url")
                result = {
                    "title": item.get("title", ""),
                    "url": landing,
                    "description": f"Year {item.get('publication_year')} | Citations {item.get('cited_by_count')}",
                    "source": "openalex",
                }
                results.append(result)

                emit_source(
                    source_type="openalex",
                    domain="openalex.org",
                    url=landing,
                    title=result["title"],
                    description=result["description"],
                    published_date=str(item.get("publication_year")),
                    items_found=1,
                )
            return results
        except Exception as e:
            return [{"error": str(e)}]


# =========================
# PubMed
# =========================

class PubMedProvider(SearchProvider):
    def __init__(self):
        super().__init__("pubmed")

    def search(self, query: str, max_results: int = 5):
        emit_search(query, "pubmed")
        base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

        try:
            s = requests.get(
                f"{base}/esearch.fcgi?db=pubmed&term={quote_plus(query)}"
                f"&retmode=json&retmax={max_results}&sort=date",
                timeout=10,
            )
            ids = s.json().get("esearchresult", {}).get("idlist", [])
            if not ids:
                return []

            ids_str = ",".join(ids)
            d = requests.get(
                f"{base}/esummary.fcgi?db=pubmed&id={ids_str}&retmode=json",
                timeout=10,
            ).json()

            results = []
            for uid in ids:
                item = d["result"].get(uid)
                if not item:
                    continue

                result = {
                    "title": item.get("title", ""),
                    "url": f"https://pubmed.ncbi.nlm.nih.gov/{uid}/",
                    "description": f"{item.get('source')} | {item.get('pubdate')}",
                    "source": "pubmed",
                }
                results.append(result)

                emit_source(
                    source_type="pubmed",
                    domain="pubmed.ncbi.nlm.nih.gov",
                    url=result["url"],
                    title=result["title"],
                    description=result["description"],
                    published_date=item.get("pubdate"),
                    items_found=1,
                )
            return results
        except Exception as e:
            return [{"error": str(e)}]


# =========================
# PDF Reader
# =========================

class PDFReaderProvider:
    def read_pdf(self, url: str) -> str:
        if not PdfReader:
            return "pypdf not installed"

        try:
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            reader = PdfReader(io.BytesIO(r.content))

            text = ""
            for page in reader.pages[:20]:
                text += (page.extract_text() or "") + "\n"

            return text
        except Exception as e:
            return str(e)


# =========================
# HTML Scraper
# =========================

class HtmlScraperProvider:
    def scrape_url(self, url: str) -> str:
        if not BeautifulSoup:
            return "beautifulsoup4 not installed"

        try:
            r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()

            soup = BeautifulSoup(r.content, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.extract()

            text = "\n".join(line.strip() for line in soup.get_text().splitlines() if line.strip())
            return text[:15000]
        except Exception as e:
            return str(e)


# =========================
# News (DuckDuckGo)
# =========================

class NewsSearchProvider(SearchProvider):
    def __init__(self):
        super().__init__("news")
        self.ddgs = DDGS() if DDGS else None

    def search(self, query: str, max_results: int = 5):
        if not self.ddgs:
            return [{"error": "DuckDuckGo news unavailable"}]

        emit_search(query, "news")
        results = []

        try:
            for r in self.ddgs.news(query, max_results=max_results):
                item = {
                    "title": r.get("title"),
                    "url": r.get("url"),
                    "description": r.get("body"),
                    "source": r.get("source"),
                    "published": r.get("date"),
                }
                results.append(item)

                emit_source(
                    source_type="news",
                    domain=item["source"],
                    url=item["url"],
                    title=item["title"],
                    description=item["description"][:200],
                    published_date=item["published"],
                    items_found=1,
                )
        except Exception as e:
            return [{"error": str(e)}]

        return results


# =========================
# Registry
# =========================

PROVIDER_REGISTRY = {
    "duckduckgo": DuckDuckGoProvider(),
    "google": GoogleProvider(),
    "arxiv": ArxivProvider(),
    "wikipedia": WikipediaProvider(),
    "openalex": OpenAlexProvider(),
    "pubmed": PubMedProvider(),
    "news": NewsSearchProvider(),
}
