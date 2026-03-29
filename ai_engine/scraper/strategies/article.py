"""
Strategy 1: Article Extraction
================================
Uses trafilatura (primary) and newspaper3k (fallback) to extract
clean article text from news sites, blogs, and general web pages.
"""

import logging
from ..base import BaseScraper, ScrapedContent

logger = logging.getLogger("ai_engine.scraper.article")


class ArticleScraper(BaseScraper):
    name = "article"

    def can_handle(self, url: str) -> bool:
        return True  # Default handler for anything that isn't specialized

    def _scrape(self, url: str) -> ScrapedContent:
        # ── Primary: trafilatura ──────────────────────────────────────────
        try:
            import trafilatura
            downloaded = trafilatura.fetch_url(url)
            if downloaded:
                text = trafilatura.extract(
                    downloaded,
                    include_comments=False,
                    include_tables=True,
                    no_fallback=False,
                )
                if text and len(text) > 100:
                    # Try to get metadata
                    meta = trafilatura.extract_metadata(downloaded)
                    return ScrapedContent(
                        url=url,
                        title=getattr(meta, "title", "") or "",
                        text=text,
                        authors=[getattr(meta, "author", "")] if getattr(meta, "author", "") else [],
                        published_date=str(getattr(meta, "date", "") or ""),
                        source_type="web",
                    )
        except Exception as e:
            logger.debug(f"[ArticleScraper] trafilatura failed for {url}: {e}")

        # ── Fallback: newspaper3k ─────────────────────────────────────────
        try:
            from newspaper import Article
            article = Article(url)
            article.download()
            article.parse()
            if article.text and len(article.text) > 100:
                return ScrapedContent(
                    url=url,
                    title=article.title or "",
                    text=article.text,
                    authors=article.authors,
                    published_date=str(article.publish_date or ""),
                    source_type="web",
                )
        except Exception as e:
            logger.debug(f"[ArticleScraper] newspaper3k failed for {url}: {e}")

        # ── Last resort: raw requests + BeautifulSoup ─────────────────────
        try:
            import requests
            from bs4 import BeautifulSoup
            resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "ads"]):
                tag.decompose()
            
            # Extract image URLs
            image_urls = []
            for img in soup.find_all("img"):
                img_url = img.get("src")
                if img_url and img_url.startswith("http"):
                    image_urls.append(img_url)
                elif img_url and img_url.startswith("//"):
                    image_urls.append("https:" + img_url)
            
            text = soup.get_text(separator=" ", strip=True)
            title = soup.title.string if soup.title else ""
            return ScrapedContent(
                url=url, 
                title=title, 
                text=text, 
                source_type="web",
                metadata={"image_urls": image_urls[:5]} # Top 5 images
            )
        except Exception as e:
            raise RuntimeError(f"All article scrapers failed: {e}")
