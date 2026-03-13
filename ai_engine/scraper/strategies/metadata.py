"""
Strategy 3: Metadata Extraction
=================================
Extracts structured metadata embedded in HTML:
JSON-LD, OpenGraph, RDFa, microdata.
Best for pages that expose structured data (products, events, articles, datasets).
"""

import logging
import requests
from ..base import BaseScraper, ScrapedContent

logger = logging.getLogger("ai_engine.scraper.metadata")


class MetadataScraper(BaseScraper):
    name = "metadata"

    def can_handle(self, url: str) -> bool:
        return True  # Works on any page

    def _scrape(self, url: str) -> ScrapedContent:
        resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        html = resp.text

        metadata = {}
        structured = {}

        # ── extruct for JSON-LD, OG, RDFa ────────────────────────────────
        try:
            import extruct
            data = extruct.extract(
                html,
                base_url=url,
                syntaxes=["json-ld", "opengraph", "rdfa", "microdata"],
                uniform=True,
            )
            structured = data
            # Flatten all items into metadata dict
            for syntax, items in data.items():
                if items:
                    for item in items[:3]:
                        if isinstance(item, dict):
                            metadata.update(
                                {f"{syntax}_{k}": v for k, v in item.items()
                                 if isinstance(v, (str, int, float))}
                            )
        except Exception as e:
            logger.debug(f"[MetadataScraper] extruct failed: {e}")

        # ── OpenGraph fallback via BeautifulSoup ──────────────────────────
        title = metadata.get("opengraph_name", "") or metadata.get("json-ld_name", "")
        description = (metadata.get("opengraph_description", "")
                       or metadata.get("json-ld_description", ""))

        if not title:
            try:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(html, "html.parser")
                og_title = soup.find("meta", property="og:title")
                title = og_title["content"] if og_title else (soup.title.string if soup.title else "")
                og_desc = soup.find("meta", property="og:description")
                if og_desc and not description:
                    description = og_desc["content"]
            except Exception:
                pass

        text = f"{title}\n\n{description}\n\n{str(structured)[:2000]}".strip()
        return ScrapedContent(
            url=url,
            title=title,
            text=text or "No metadata extracted",
            source_type="metadata",
            metadata=metadata,
        )
