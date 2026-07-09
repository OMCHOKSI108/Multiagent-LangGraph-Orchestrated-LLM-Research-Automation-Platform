from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db, DocumentChunk
from ..services.rag import hybrid_search, enhanced_rag_search, rag_answer_with_verification

router = APIRouter(prefix="/api/rag", tags=["rag"])


class RAGQueryRequest(BaseModel):
    query: str
    session_id: str
    top_k: int | None = None
    min_score: float | None = None
    source_type: str | None = None
    min_trust_score: float | None = None


class RAGQueryResponse(BaseModel):
    results: list[dict]
    total: int


class RAGAnswerRequest(BaseModel):
    query: str
    session_id: str
    top_k: int | None = None
    min_score: float | None = None


@router.post("/query")
async def rag_query(req: RAGQueryRequest, db: AsyncSession = Depends(get_db)):
    results = await hybrid_search(
        query=req.query,
        session_id=req.session_id,
        db=db,
        top_k=req.top_k,
        min_score=req.min_score,
        source_type=req.source_type,
        min_trust_score=req.min_trust_score,
    )
    return RAGQueryResponse(results=results, total=len(results))


@router.post("/enhanced-search")
async def rag_enhanced_search(req: RAGQueryRequest, db: AsyncSession = Depends(get_db)):
    compressed = await enhanced_rag_search(
        query=req.query,
        session_id=req.session_id,
        db=db,
        top_k=req.top_k or 10,
        min_score=req.min_score or 0.2,
    )
    return {"compressed_context": compressed}


@router.post("/answer")
async def rag_answer(req: RAGAnswerRequest, db: AsyncSession = Depends(get_db)):
    result = await rag_answer_with_verification(
        query=req.query,
        session_id=req.session_id,
        db=db,
        top_k=req.top_k or 10,
        min_score=req.min_score or 0.2,
    )
    return result
