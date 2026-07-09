import logging
import httpx
import re
from sqlalchemy import select

from ..db import Image, ResearchSource as Source
from ..config import settings
from ..services.llm import call_llm

logger = logging.getLogger(__name__)


async def _search_images_via_exa(query: str, max_images: int) -> list[dict]:
    try:
        from exa_py import Exa
        exa = Exa(api_key=settings.exa_api_key)
        result = exa.search(f"{query} architecture diagram OR system design", num_results=max_images * 2)
        image_urls = []
        for r in result.results[:max_images]:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(r.url, headers={"User-Agent": "Mozilla/5.0"})
                    if resp.status_code == 200:
                        imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', resp.text)
                        for img_url in imgs[:2]:
                            if img_url.startswith("http") and any(ext in img_url.lower() for ext in ['.png', '.jpg', '.jpeg', '.svg', '.webp']):
                                image_urls.append({
                                    "image_url": img_url,
                                    "source_url": r.url,
                                    "source_title": r.title or "",
                                })
            except Exception:
                continue
        return image_urls
    except Exception as e:
        logger.warning("Exa image search failed: %s", e)
        return []


async def search_images(
    query: str,
    session_id: str,
    db,
    max_images: int = 5,
) -> list[dict]:
    sources_result = await db.execute(
        select(Source).where(
            Source.session_id == session_id,
            Source.source_type.in_(["webpage", "article", "pdf"])
        ).limit(10)
    )
    sources = sources_result.scalars().all()

    image_urls = []
    for src in sources:
        if src.url and not src.url.endswith(".pdf"):
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(src.url, headers={"User-Agent": "Mozilla/5.0"})
                    if resp.status_code == 200:
                        imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', resp.text)
                        for img_url in imgs[:3]:
                            if img_url.startswith("http"):
                                image_urls.append({
                                    "image_url": img_url,
                                    "source_url": src.url,
                                    "source_title": src.title or "",
                                })
            except Exception:
                continue

    exa_images = await _search_images_via_exa(query, max_images)
    seen_urls = {img["image_url"] for img in image_urls}
    for img in exa_images:
        if img["image_url"] not in seen_urls:
            image_urls.append(img)
            seen_urls.add(img["image_url"])

    images = []
    for i, img in enumerate(image_urls[:max_images]):
        caption = call_llm(
            "Generate a brief technical caption for this image in an IEEE research paper context.",
            f"Image URL: {img['image_url']}\nSource: {img['source_title']}\n\nCaption:",
            temperature=0.3,
        )

        image_record = Image(
            session_id=session_id,
            image_url=img["image_url"],
            context_url=img["source_url"],
            alt_text=caption.strip()[:200],
            caption=caption.strip(),
            relevance_score=0.5,
        )
        db.add(image_record)
        await db.commit()

        images.append({
            "id": str(image_record.id),
            "image_url": img["image_url"],
            "caption": caption.strip(),
            "source_url": img["source_url"],
        })

    return images
