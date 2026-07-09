import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db, ResearchSessionModel, ResearchMessage, ResearchSource, ResearchReport, ResearchPlan
from ..db import ResearchSessionStatus
from ..graph import run_research
from ..services.progress import emit_progress

router = APIRouter(prefix="/api/research", tags=["research"])


class ResearchRequest(BaseModel):
    question: str = Field(..., examples=["How do quantum computing algorithms improve drug discovery?", "What are the latest advances in RAG-based LLM systems?", "Explain the transformer architecture in deep learning"])
    session_id: str | None = Field(None, examples=["550e8400-e29b-41d4-a716-446655440000"])
    user_id: str = Field("00000000-0000-0000-0000-000000000000", examples=["00000000-0000-0000-0000-000000000000"])
    max_revisions: int = Field(2, examples=[0, 1, 2], description="0=Fast, 1=Balanced, 2=Deep")
    job_id: str | None = Field(None, examples=["research-12345"])


class ResearchResponse(BaseModel):
    session_id: str
    report: str
    sources: list[dict]
    status: str
    error: str = ""


@router.post("/start")
async def start_research(req: ResearchRequest, db: AsyncSession = Depends(get_db)):
    session_id = req.session_id or str(uuid.uuid4())
    job_id = req.job_id or session_id

    existing = await db.execute(
        select(ResearchSessionModel).where(ResearchSessionModel.id == session_id)
    )
    session = existing.scalar_one_or_none()

    if not session:
        session = ResearchSessionModel(
            id=uuid.UUID(session_id) if req.session_id else uuid.UUID(session_id),
            user_id=uuid.UUID(req.user_id),
            title=req.question[:100],
            status=ResearchSessionStatus.in_progress,
        )
        db.add(session)

    msg = ResearchMessage(
        session_id=session.id,
        role="user",
        content=req.question,
    )
    db.add(msg)
    await db.commit()

    await emit_progress(job_id, "pipeline", "started", "Research pipeline started.", {"session_id": session_id, "question": req.question[:100]})

    result = await run_research(req.question, str(session.id), job_id, req.max_revisions, db)

    session.status = (
        ResearchSessionStatus.completed
        if result["status"] != "failed"
        else ResearchSessionStatus.failed
    )
    session.updated_at = datetime.now(timezone.utc)

    report_msg = ResearchMessage(
        session_id=session.id,
        role="assistant",
        content=result["report"],
    )
    db.add(report_msg)

    for src in result["sources"]:
        source = ResearchSource(
            session_id=session.id,
            url=src["url"],
            title=src["title"],
        )
        db.add(source)

    report_record = ResearchReport(
        session_id=session.id,
        content=result["report"],
    )
    db.add(report_record)

    await db.commit()

    await emit_progress(job_id, "pipeline", "complete", "Research complete.", {
        "session_id": session_id,
        "status": result["status"],
        "report_length": len(result["report"]),
        "source_count": len(result["sources"]),
        "report": result["report"],
        "sources": result["sources"],
    })

    return ResearchResponse(
        session_id=str(session.id),
        report=result["report"],
        sources=result["sources"],
        status=result["status"],
        error=result.get("error", ""),
    )


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ResearchSessionModel).where(ResearchSessionModel.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")

    messages_result = await db.execute(
        select(ResearchMessage)
        .where(ResearchMessage.session_id == session_id)
        .order_by(ResearchMessage.created_at)
    )
    messages = messages_result.scalars().all()

    sources_result = await db.execute(
        select(ResearchSource).where(ResearchSource.session_id == session_id)
    )
    sources = sources_result.scalars().all()

    return {
        "id": str(session.id),
        "title": session.title,
        "status": session.status.value,
        "messages": [
            {"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
            for m in messages
        ],
        "sources": [
            {"title": s.title, "url": s.url} for s in sources
        ],
    }


@router.post("/plans/{session_id}/approve")
async def approve_plan(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ResearchPlan).where(ResearchPlan.session_id == session_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(404, "Research plan not found")
    plan.approved_by_user = True
    plan.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "approved"}
