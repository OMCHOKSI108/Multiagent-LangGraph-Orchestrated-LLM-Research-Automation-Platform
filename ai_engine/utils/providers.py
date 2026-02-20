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
from .http_retry import http_get
from .metrics import inc as metrics_inc


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

    def search_papers(self, query: str, max_results: int = 5):
        """
        Backward-compatible wrapper expected by older agents.
        Returns keys commonly used across agents: summary/body/link/url.
        """
        results = self.search(query, max_results=max_results)
        if not isinstance(results, list):
            return []

        normalized = []
        for item in results:
            if not isinstance(item, dict):
                continue
            normalized.append({
                "title": item.get("title", ""),
                "summary": item.get("description", ""),
                "body": item.get("description", ""),
                "description": item.get("description", ""),
                "published": item.get("published", ""),
                "authors": item.get("authors", []),
                "url": item.get("url", ""),
                "link": item.get("url", ""),
                "source": item.get("source", "arxiv"),
            })
        return normalized


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
            resp = http_get(url, timeout=10, retries=3)
            data = resp.json()

            results = []
            for item in data.get("results", []):
                landing = item.get("primary_location", {}).get("landing_page_url")
                pub_year = item.get("publication_year", "")
                abstract_inv = item.get("abstract_inverted_index", {})
                # Reconstruct abstract from inverted index (OpenAlex format)
                abstract_text = ""
                if abstract_inv and isinstance(abstract_inv, dict):
                    try:
                        word_positions = []
                        for word, positions in abstract_inv.items():
                            for pos in positions:
                                word_positions.append((pos, word))
                        word_positions.sort()
                        abstract_text = " ".join(w for _, w in word_positions)[:300]
                    except Exception:
                        pass
                desc = abstract_text or f"Year {pub_year} | Citations {item.get('cited_by_count')}"
                result = {
                    "title": item.get("title", ""),
                    "url": landing,
                    "description": desc,
                    "summary": desc,
                    "source": "openalex",
                    "published": str(pub_year),
                    "published_date": str(pub_year),
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
            metrics_inc('provider_openalex_success')
            return results
        except Exception as e:
            metrics_inc('provider_openalex_failure')
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
            s = http_get(
                f"{base}/esearch.fcgi?db=pubmed&term={quote_plus(query)}&retmode=json&retmax={max_results}&sort=date",
                timeout=10,
                retries=3
            )
            ids = s.json().get("esearchresult", {}).get("idlist", [])
            if not ids:
                metrics_inc('provider_pubmed_empty')
                return []

            ids_str = ",".join(ids)
            d = http_get(
                f"{base}/esummary.fcgi?db=pubmed&id={ids_str}&retmode=json",
                timeout=10,
                retries=3
            ).json()

            results = []
            for uid in ids:
                item = d["result"].get(uid)
                if not item:
                    continue

                pubdate = item.get("pubdate", "")
                source_journal = item.get("source", "")
                desc = f"{source_journal} | {pubdate}" if source_journal else pubdate
                result = {
                    "title": item.get("title", ""),
                    "url": f"https://pubmed.ncbi.nlm.nih.gov/{uid}/",
                    "description": desc,
                    "summary": desc,
                    "source": "pubmed",
                    "published": pubdate,
                    "published_date": pubdate,
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
            metrics_inc('provider_pubmed_success')
            return results
        except Exception as e:
            metrics_inc('provider_pubmed_failure')
            return [{"error": str(e)}]


# =========================
# PDF Reader
# =========================

class PDFReaderProvider:
    def read_pdf(self, url: str) -> str:
        if not PdfReader:
            return "pypdf not installed"

        try:
            r = http_get(url, timeout=15, retries=2)
            r.raise_for_status()
            reader = PdfReader(io.BytesIO(r.content))

            text = ""
            for page in reader.pages[:20]:
                text += (page.extract_text() or "") + "\n"

            metrics_inc('pdf_read_success')
            return text
        except Exception as e:
            metrics_inc('pdf_read_failure')
            return str(e)


# =========================
# HTML Scraper
# =========================

class HtmlScraperProvider:
    def scrape_url(self, url: str) -> str:
        if not BeautifulSoup:
            return "beautifulsoup4 not installed"

        try:
            r = http_get(url, timeout=10, retries=2, headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()

            soup = BeautifulSoup(r.content, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.extract()

            text = "\n".join(line.strip() for line in soup.get_text().splitlines() if line.strip())
            metrics_inc('html_scrape_success')
            return text[:15000]
        except Exception as e:
            metrics_inc('html_scrape_failure')
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


class ImageSearchProvider(SearchProvider):
    def __init__(self):
        super().__init__("image_search")
        self.ddgs = DDGS() if DDGS else None

    def search(self, query: str, max_results: int = 5):
        if not self.ddgs:
            return []

        emit_search(query, "image_search")
        urls = []
        try:
            for r in self.ddgs.images(query, max_results=max_results):
                image_url = r.get("image") or r.get("url") or r.get("thumbnail")
                if image_url:
                    urls.append(image_url)
            return urls
        except Exception:
            return []


class WebSearchProvider(DuckDuckGoProvider):
    """
    Backward-compatible alias used by legacy agent modules.
    Normalizes result keys used in older code paths (`link`, `body`).
    """

    def __init__(self):
        super().__init__()
        self.name = "web"

    def search(self, query: str, max_results: int = 5):
        results = super().search(query, max_results=max_results)
        if not isinstance(results, list):
            return []

        normalized = []
        for item in results:
            if not isinstance(item, dict):
                continue
            normalized.append({
                **item,
                "link": item.get("url", ""),
                "body": item.get("description", ""),
            })
        return normalized


class GoogleSearchProvider(GoogleProvider):
    """
    Backward-compatible alias used by legacy agent modules.
    Normalizes result keys used in older code paths (`link`, `body`).
    """

    def __init__(self):
        super().__init__()
        self.name = "google_search"

    def search(self, query: str, max_results: int = 5):
        results = super().search(query, max_results=max_results)
        if not isinstance(results, list):
            return []

        normalized = []
        for item in results:
            if not isinstance(item, dict):
                continue
            normalized.append({
                **item,
                "link": item.get("url", ""),
                "body": item.get("description", ""),
            })
        return normalized


# =========================
# Registry
# =========================

PROVIDER_REGISTRY = {
    "duckduckgo": DuckDuckGoProvider(),
    "web": WebSearchProvider(),
    "google": GoogleProvider(),
    "google_search": GoogleSearchProvider(),
    "images": ImageSearchProvider(),
    "arxiv": ArxivProvider(),
    "wikipedia": WikipediaProvider(),
    "openalex": OpenAlexProvider(),
    "pubmed": PubMedProvider(),
    "news": NewsSearchProvider(),
}
