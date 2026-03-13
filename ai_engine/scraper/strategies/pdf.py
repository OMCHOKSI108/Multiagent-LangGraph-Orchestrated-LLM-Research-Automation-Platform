"""
Strategy 5: PDF Scraper
========================
Extracts text from PDF documents.
Primary: pdfplumber (layout-aware)
Fallback: PyMuPDF (fitz)
"""

import logging
from ..base import BaseScraper, ScrapedContent

logger = logging.getLogger("ai_engine.scraper.pdf")


class PdfScraper(BaseScraper):
    name = "pdf"

    def can_handle(self, url: str) -> bool:
        return url.lower().endswith(".pdf") or "pdf" in url.lower()

    def _scrape(self, url: str) -> ScrapedContent:
        import requests
        import io

        resp = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        pdf_bytes = io.BytesIO(resp.content)

        # ── Primary: pdfplumber ───────────────────────────────────────────
        try:
            import pdfplumber
            text_parts = []
            title = ""
            with pdfplumber.open(pdf_bytes) as pdf:
                meta = pdf.metadata or {}
                title = meta.get("Title", "") or ""
                for page in pdf.pages[:30]:   # cap at 30 pages
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
            text = "\n\n".join(text_parts)
            if text.strip():
                return ScrapedContent(
                    url=url,
                    title=title or url.split("/")[-1],
                    text=text,
                    source_type="pdf",
                    metadata={"page_count": len(text_parts)},
                )
        except ImportError:
            logger.debug("[PdfScraper] pdfplumber not installed")
        except Exception as e:
            logger.debug(f"[PdfScraper] pdfplumber failed: {e}")

        # ── Fallback: PyMuPDF (fitz) ──────────────────────────────────────
        try:
            import fitz  # PyMuPDF
            pdf_bytes.seek(0)
            doc = fitz.open(stream=pdf_bytes.read(), filetype="pdf")
            text_parts = []
            for page_num in range(min(30, doc.page_count)):
                page = doc[page_num]
                text_parts.append(page.get_text())
            text = "\n\n".join(text_parts)
            meta = doc.metadata or {}
            return ScrapedContent(
                url=url,
                title=meta.get("title", "") or url.split("/")[-1],
                text=text,
                source_type="pdf",
                metadata={"page_count": doc.page_count},
            )
        except ImportError:
            logger.debug("[PdfScraper] PyMuPDF not installed")
        except Exception as e:
            logger.warning(f"[PdfScraper] Both PDF extractors failed for {url}: {e}")

        raise RuntimeError(f"No PDF extractor available. Install pdfplumber or PyMuPDF.")
