import asyncio
import logging
import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from ..config import settings

logger = logging.getLogger(__name__)

MAX_TEXT_LENGTH = settings.web_chunk_size_chars * 4

JS_HEAVY_DOMAINS = {
    "twitter.com", "x.com", "reddit.com", "www.reddit.com",
    "medium.com", "dev.to", "hashnode.com",
    "reactjs.org", "nextjs.org", "angular.io",
    "app.diagrams.net", "excalidraw.com",
    "observablehq.com", "codepen.io", "codesandbox.io",
    "stackblitz.com", "glitch.com",
}

SPA_INDICATORS = [
    "__NEXT_DATA__", "__NUXT__", "__REACT_DEVTOOLS_GLOBAL_HOOK__",
    "ng-version", "vue-app", "ember-application",
    "sapper", "svelte", "create-react-app",
    "wp-block-library", "data-reactroot", "data-reactid",
    "router-link", "nuxt-config",
]


def is_pdf_url(url: str) -> bool:
    path = urlparse(url).path.lower()
    if path.endswith(".pdf"):
        return True
    return False


def needs_dynamic_scrape(url: str) -> bool:
    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    if domain in JS_HEAVY_DOMAINS:
        return True
    return False


async def _detect_spa_with_head(url: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "KuchiBot/1.0 (research assistant)"})
            text = resp.text[:50000]
            for indicator in SPA_INDICATORS:
                if indicator in text:
                    logger.info("SPA indicator '%s' detected at %s", indicator, url)
                    return True
            return False
    except Exception:
        return False


async def scrape_url(url: str, timeout: int | None = None) -> dict | None:
    timeout = timeout or settings.web_crawl_timeout
    httpx_result: dict | None = None
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            head = await client.head(url, headers={"User-Agent": "KuchiBot/1.0 (research assistant)"})
            ctype = head.headers.get("content-type", "").lower()

        if is_pdf_url(url) or "application/pdf" in ctype:
            return await _scrape_pdf(url, timeout)
        elif needs_dynamic_scrape(url):
            return await _scrape_playwright(url, timeout)
        elif await _detect_spa_with_head(url):
            logger.info("SPA detected at %s, switching to Playwright", url)
            return await _scrape_playwright(url, timeout)
        else:
            httpx_result = await _scrape_httpx(url, timeout)
            if httpx_result is None:
                logger.info("httpx returned None for %s, falling back to Playwright", url)
                return await _scrape_playwright(url, timeout)
            return httpx_result
    except Exception as e:
        logger.warning("scrape_url failed via httpx for %s: %s, falling back to Playwright", url, e)
        return await _scrape_playwright(url, timeout)


async def _scrape_httpx(url: str, timeout: int) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "KuchiBot/1.0 (research assistant)"})
            resp.raise_for_status()

        content_type = resp.headers.get("content-type", "")
        if "application/pdf" in content_type:
            return await _scrape_pdf(url, timeout)

        if "text/html" not in content_type and "application/xhtml" not in content_type:
            return {"url": url, "title": "", "content": resp.text[:MAX_TEXT_LENGTH], "source_type": "raw"}

        soup = BeautifulSoup(resp.text, "lxml")

        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        title = soup.title.string.strip() if soup.title and soup.title.string else ""
        text = soup.get_text(separator="\n", strip=True)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = text[:MAX_TEXT_LENGTH]

        return {"url": url, "title": title, "content": text, "source_type": "webpage"}
    except Exception as e:
        logger.warning("httpx scrape failed for %s: %s", url, e)
        return None


async def _scrape_playwright(url: str, timeout: int) -> dict | None:
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            page = await browser.new_page(
                user_agent="KuchiBot/1.0 (research assistant)",
                viewport={"width": 1280, "height": 800},
            )
            await page.goto(url, wait_until="networkidle", timeout=timeout * 1000)
            await asyncio.sleep(1)

            title = await page.title()

            content = await page.evaluate("""
                () => {
                    const clone = document.body.cloneNode(true);
                    const removals = clone.querySelectorAll('script, style, nav, footer, header, aside');
                    removals.forEach(el => el.remove());
                    return clone.innerText;
                }
            """)
            text = re.sub(r"\n{3,}", "\n\n", content.strip())
            text = text[:MAX_TEXT_LENGTH]

            result: dict = {
                "url": url,
                "title": title or "",
                "content": text,
                "source_type": "webpage_dynamic",
                "images": [],
            }

            images = await page.evaluate("""
                () => {
                    const imgs = document.querySelectorAll('img[src]');
                    return Array.from(imgs).slice(0, 10).map(img => ({
                        src: img.src,
                        alt: img.alt || '',
                        width: img.naturalWidth || img.width,
                        height: img.naturalHeight || img.height,
                    }));
                }
            """)
            if images:
                result["images"] = images

            await browser.close()

            return result
    except Exception as e:
        logger.warning("Playwright scrape failed for %s: %s", url, e)
        return {"url": url, "title": "", "content": f"[Playwright scrape failed: {e}]", "source_type": "error"}


async def _scrape_pdf(url: str, timeout: int) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "KuchiBot/1.0 (research assistant)"})
            resp.raise_for_status()

        import fitz

        pdf_data = resp.content
        doc = fitz.open(stream=pdf_data, filetype="pdf")

        title = doc.metadata.get("title", "") or ""
        text_parts = []
        for page_num in range(min(len(doc), 50)):
            page = doc[page_num]
            text_parts.append(page.get_text())

        doc.close()
        text = "\n\n".join(text_parts)
        text = re.sub(r"\n{3,}", "\n\n", text.strip())
        text = text[:MAX_TEXT_LENGTH]

        return {"url": url, "title": title, "content": text, "source_type": "pdf"}
    except Exception as e:
        logger.warning("PDF scrape failed for %s: %s", url, e)
        return {"url": url, "title": "", "content": f"[PDF scrape failed: {e}]", "source_type": "error"}
