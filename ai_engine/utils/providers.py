import arxiv
import requests
import io
import wikipedia
import warnings
# Suppress the "ddgs" renaming warning
warnings.filterwarnings("ignore", message=".*renamed to 'ddgs'.*")

try:
    from ddgs import DDGS
except ImportError:
    # Fallback if user installed 'ddgs' directly
    from ddgs import DDGS
from googlesearch import search
from typing import List, Dict, Any
from pypdf import PdfReader
from bs4 import BeautifulSoup
from bs4 import BeautifulSoup
from xml.etree import ElementTree
from .event_emitter import emit_source, emit_search

class ArxivProvider:
    def __init__(self):
        self.client = arxiv.Client()

    def search_papers(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        Searches Arxiv for papers.
        """
        try:
            search = arxiv.Search(
                query=query,
                max_results=max_results,
                sort_by=arxiv.SortCriterion.Relevance
            )
            
            results = []
            if query:
                emit_search(query, "arxiv", research_id=None) # job_id handled by global context
            
            for result in self.client.results(search):
                results.append({
                    "title": result.title,
                    "summary": result.summary,
                    "authors": [a.name for a in result.authors],
                    "url": result.pdf_url,
                    "published": result.published.strftime("%Y-%m-%d")
                })
                # Emit source event
                emit_source(
                    source_type="arxiv",
                    domain="arxiv.org",
                    url=result.pdf_url,
                    title=result.title,
                    description=result.summary[:200],
                    published_date=result.published.strftime("%Y-%m-%d"),
                    items_found=1
                )
            return results
        except Exception as e:
            print(f"[ArxivProvider] Error: {e}")
            return []

class ImageSearchProvider:
    def __init__(self):
        self.ddgs = DDGS()

    def search(self, query: str, max_results: int = 4) -> List[str]:
        """
        Searches for images using DuckDuckGo.
        Returns a list of image URLs.
        """
        try:
            # emit_search(query, "image_search") - handled by agent or omitted for simplicity
            results = list(self.ddgs.images(query, max_results=max_results))
            return [r['image'] for r in results if 'image' in r]
        except Exception as e:
            print(f"[ImageSearchProvider] Error: {e}")
            return []

class WebSearchProvider:
    def __init__(self):
        self.ddgs = DDGS()

    def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        Performs a web search using DuckDuckGo.
        """
        try:
            if query:
                emit_search(query, "duckduckgo")
                
            results = list(self.ddgs.text(query, max_results=max_results))
            
            # Emit source events
            for r in results:
                emit_source(
                    source_type="web",
                    domain="duckduckgo.com", # Proxy
                    url=r.get("href"),
                    title=r.get("title"),
                    description=r.get("body"),
                    items_found=1
                )
            
            return results
        except Exception as e:
            print(f"[WebSearchProvider] Error: {e}")
            return []

class GoogleSearchProvider:
    def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        Performs a web search using Google.
        """
        try:
            results = []
            if query:
                emit_search(query, "google")
                
            # googlesearch-python returns simple URLs. We will try to fetch title if possible, 
            # or just return the URL as title for now to keep it fast/offline-ish
            for url in search(query, num_results=max_results, advanced=True):
                # advanced=True returns SearchResult objects with title/desc
                results.append({
                    "title": url.title,
                    "body": url.description,
                    "url": url.url,
                    "source": "google"
                })
                
                emit_source(
                    source_type="web",
                    domain="google.com", 
                    url=url.url,
                    title=url.title,
                    description=url.description,
                    items_found=1
                )
                
            return results
        except Exception as e:
            print(f"[GoogleSearchProvider] Error: {e}")
            return []

class WikipediaProvider:
    def search(self, query: str, max_results: int = 3) -> List[Dict[str, Any]]:
        """
        Searches Wikipedia for summaries.
        """
        try:
            results = []
            if query:
                emit_search(query, "wikipedia")
                
            # 'search' returns a list of titles
            titles = wikipedia.search(query, results=max_results)
            for title in titles:
                try:
                    summary = wikipedia.summary(title, sentences=3)
                    page = wikipedia.page(title, auto_suggest=False)
                    results.append({
                        "title": title,
                        "body": summary,
                        "url": page.url,
                        "source": "wikipedia"
                    })
                    
                    emit_source(
                        source_type="web",
                        domain="wikipedia.org",
                        url=page.url,
                        title=title,
                        description=summary[:200],
                        items_found=1
                    )
                except Exception:
                    continue
            return results
        except Exception as e:
            print(f"[WikipediaProvider] Error: {e}")
            return []

class PDFReaderProvider:
    def read_pdf(self, url: str) -> str:
        """
        Downloads a PDF from a URL, extracts text AND analyzes images (charts/diagrams).
        """
        try:
            print(f"[PDFReaderProvider] Downloading PDF from: {url}")
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            f = io.BytesIO(response.content)
            reader = PdfReader(f)
            
            text = ""
            
            # Lazy load Vision Provider
            vision = None
            try:
                from .vision import VisionProvider
                vision = VisionProvider()
            except Exception as e:
                print(f"[PDFReaderProvider] Vision Init Failed: {e}")

            # Limit to first 20 pages
            for i, page in enumerate(reader.pages[:20]):
                text += page.extract_text() + "\n"
                
                # Analyze Images on Page
                if vision and hasattr(page, 'images') and len(page.images) > 0:
                    print(f"   - Analyzing {len(page.images)} images on page {i+1}...")
                    for img in page.images:
                        try:
                            # img.data is bytes
                            caption = vision.analyze_image(img.data)
                            text += f"\n\n[FIGURE/CHART FOUND on Page {i+1}: {caption}]\n\n"
                        except Exception as e:
                            print(f"   - Image analysis failed: {e}")
                
            return text
        except Exception as e:
            print(f"[PDFReaderProvider] Error reading PDF: {e}")
            return ""

class OpenAlexProvider:
    def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        Searches OpenAlex (Global Research Database).
        """
        try:
            # OpenAlex API is free and doesn't explicitly require a key for low volume, 
            # but polite pool is used.
            if query:
                emit_search(query, "openalex")
                
            url = f"https://api.openalex.org/works?search={query}&per-page={max_results}&sort=publication_date:desc"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                results = []
                for item in data.get("results", []):
                    title = item.get("title")
                    # simple abstract reconstruction (OpenAlex uses inverted index)
                    # We skip complex reconstruction for speed, just grab title + location
                    matches = []
                    landing_page = item.get("primary_location", {}).get("landing_page_url")
                    
                    results.append({
                        "title": title,
                        "summary": f"Published in {item.get('publication_year')}. Citations: {item.get('cited_by_count')}.",
                        "url": landing_page,
                        "source": "openalex",
                        "published": str(item.get("publication_year"))
                    })
                    
                    emit_source(
                        source_type="openalex",
                        domain="openalex.org",
                        url=landing_page,
                        title=title,
                        description=f"Published in {item.get('publication_year')}. Citations: {item.get('cited_by_count')}.",
                        published_date=str(item.get("publication_year")),
                        items_found=1
                    )
                return results
            return []
        except Exception as e:
            print(f"[OpenAlexProvider] Error: {e}")
            return []

class PubMedProvider:
    def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        Searches PubMed (Biomedical Research).
        """
        try:
            # 1. ESearch to get IDs
            if query:
                emit_search(query, "pubmed")
                
            base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
            search_url = f"{base_url}/esearch.fcgi?db=pubmed&term={query}&retmode=json&retmax={max_results}&sort=date"
            
            resp = requests.get(search_url, timeout=10)
            if resp.status_code != 200: return []
            
            ids = resp.json().get("esearchresult", {}).get("idlist", [])
            if not ids: return []
            
            # 2. ESummary to get details
            ids_str = ",".join(ids)
            summary_url = f"{base_url}/esummary.fcgi?db=pubmed&id={ids_str}&retmode=json"
            resp = requests.get(summary_url, timeout=10)
            if resp.status_code != 200: return []
            
            data = resp.json().get("result", {})
            results = []
            for uid in ids:
                if uid not in data: continue
                item = data[uid]
                results.append({
                    "title": item.get("title", ""),
                    "summary": f"Journal: {item.get('source', '')}. PubDate: {item.get('pubdate', '')}",
                    "url": f"https://pubmed.ncbi.nlm.nih.gov/{uid}/",
                    "source": "pubmed",
                    "published": item.get("pubdate", "")
                })
                
                emit_source(
                    source_type="pubmed",
                    domain="pubmed.ncbi.nlm.nih.gov",
                    url=f"https://pubmed.ncbi.nlm.nih.gov/{uid}/",
                    title=item.get("title", ""),
                    description=f"Journal: {item.get('source', '')}. PubDate: {item.get('pubdate', '')}",
                    published_date=item.get("pubdate", ""),
                    items_found=1
                )
            return results
        except Exception as e:
            print(f"[PubMedProvider] Error: {e}")
            return []

class HtmlScraperProvider:
    def scrape_url(self, url: str) -> str:
        """
        Scrapes the textual content of a webpage using BeautifulSoup.
        """
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code != 200:
                return f"Error: Status code {response.status_code}"
                
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.extract()
                
            # Get text
            text = soup.get_text()
            
            # Break into lines and remove leading and trailing space on each
            lines = (line.strip() for line in text.splitlines())
            # Break multi-headlines into a line each
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            # Drop blank lines
            text = '\n'.join(chunk for chunk in chunks if chunk)
            
            return text[:15000] # Return first 15k chars
            
        except Exception as e:
            print(f"[HtmlScraperProvider] Error: {e}")
            return str(e)

class NewsSearchProvider:
    def __init__(self):
        self.ddgs = DDGS()

    def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        Searches for news using DuckDuckGo News.
        """
        try:
            if query:
                emit_search(query, "news")
                
            # DuckDuckGo News search
            results = list(self.ddgs.news(query, max_results=max_results))
            
            normalized_results = []
            for r in results:
                # DDGS news results typically have: title, body, url, source, date
                normalized_results.append({
                    "title": r.get("title"),
                    "summary": r.get("body"),
                    "url": r.get("url"),
                    "source": r.get("source"),
                    "published": r.get("date")
                })
                
                emit_source(
                    source_type="news",
                    domain=r.get("source", "news"),
                    url=r.get("url"),
                    title=r.get("title"),
                    description=r.get("body", "")[:200],
                    published_date=r.get("date"),
                    items_found=1
                )
            
            return normalized_results
        except Exception as e:
            print(f"[NewsSearchProvider] Error: {e}")
            return []
