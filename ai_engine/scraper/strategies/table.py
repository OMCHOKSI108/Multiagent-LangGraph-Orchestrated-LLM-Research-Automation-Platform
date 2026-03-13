"""
Strategy 4: Table/Data Scraper
================================
Extracts structured tabular data from HTML pages.
Uses pandas.read_html for speed, BeautifulSoup for complex tables.
Returns tables as Markdown text for LLM consumption.
"""

import logging
import requests
from ..base import BaseScraper, ScrapedContent

logger = logging.getLogger("ai_engine.scraper.table")

TABLE_HINTS = {"table", "data", "statistics", "dataset", "csv", "comparison",
               "benchmark", "results", "numbers", "metrics"}


class TableScraper(BaseScraper):
    name = "table"

    def can_handle(self, url: str) -> bool:
        url_lower = url.lower()
        return any(h in url_lower for h in TABLE_HINTS)

    def _scrape(self, url: str) -> ScrapedContent:
        resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        tables_md = []

        # ── pandas.read_html ──────────────────────────────────────────────
        try:
            import pandas as pd
            from io import StringIO
            dfs = pd.read_html(StringIO(resp.text))
            for i, df in enumerate(dfs[:5]):  # cap at 5 tables
                df = df.fillna("").astype(str)
                try:
                    md = df.to_markdown(index=False)
                except ImportError:
                    md = df.to_string(index=False)
                if md:
                    tables_md.append(f"### Table {i + 1}\n\n{md}")
        except Exception as e:
            logger.debug(f"[TableScraper] pandas failed: {e}")

        # ── BeautifulSoup fallback for table headers/rows ─────────────────
        if not tables_md:
            try:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(resp.text, "html.parser")
                html_tables = soup.find_all("table")
                for i, tbl in enumerate(html_tables[:5]):
                    rows = []
                    for row in tbl.find_all("tr"):
                        cells = [c.get_text(strip=True) for c in row.find_all(["td", "th"])]
                        if cells:
                            rows.append(" | ".join(cells))
                    if rows:
                        tables_md.append(f"### Table {i + 1}\n\n" + "\n".join(rows))
            except Exception as e:
                logger.debug(f"[TableScraper] BeautifulSoup table failed: {e}")

        text = "\n\n".join(tables_md) if tables_md else "No tables found on this page."

        # Get page title
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(resp.text, "html.parser")
            title = soup.title.string if soup.title else url
        except Exception:
            title = url

        return ScrapedContent(
            url=url,
            title=title,
            text=text,
            source_type="table",
            metadata={"table_count": len(tables_md)},
        )
