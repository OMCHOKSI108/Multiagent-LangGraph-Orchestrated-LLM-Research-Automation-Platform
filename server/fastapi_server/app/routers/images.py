from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db, Image
from ..agents.image_searcher import search_images

router = APIRouter(prefix="/api/images", tags=["images"])


class ImageSearchRequest(BaseModel):
    query: str
    session_id: str
    max_images: int = 5


class ImageSearchResponse(BaseModel):
    images: list[dict]


class AttachImageRequest(BaseModel):
    image_id: str
    section_name: str
    caption: str | None = None


@router.post("/attach")
async def attach_image_to_section(req: AttachImageRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Image).where(Image.id == req.image_id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(404, "Image not found")
    if req.caption:
        image.caption = req.caption
        image.alt_text = req.caption[:200]
    await db.commit()
    return {"status": "attached", "image_id": req.image_id, "section_name": req.section_name}


@router.post("/search")
async def image_search(req: ImageSearchRequest, db: AsyncSession = Depends(get_db)):
    images = await search_images(req.query, req.session_id, db, req.max_images)
    return ImageSearchResponse(images=images)


@router.get("/{session_id}")
async def get_session_images(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Image).where(Image.session_id == session_id).order_by(Image.created_at.desc())
    )
    images = result.scalars().all()
    return {
        "images": [
            {
                "id": str(img.id),
                "image_url": img.image_url,
                "thumbnail_url": img.thumbnail_url,
                "caption": img.caption,
                "alt_text": img.alt_text,
                "relevance_score": img.relevance_score,
            }
            for img in images
        ]
    }
