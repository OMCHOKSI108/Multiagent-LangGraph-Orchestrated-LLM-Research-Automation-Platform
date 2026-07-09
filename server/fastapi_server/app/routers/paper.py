from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db, Paper, PaperVersion
from ..agents.chat_with_paper import chat_with_paper
from ..agents.paper_editor import edit_paper, list_versions, get_version

router = APIRouter(prefix="/api/papers", tags=["paper"])


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str


class EditRequest(BaseModel):
    edit_request: str
    section_name: str | None = None


class EditResponse(BaseModel):
    version_number: int
    version_id: str
    section_name: str
    old_text: str
    new_text: str
    diff: list[dict]
    change_summary: str
    citations_affected: list[str]


@router.post("/{session_id}/chat")
async def paper_chat(session_id: str, req: ChatRequest, db: AsyncSession = Depends(get_db)):
    result = await chat_with_paper(req.question, session_id, db)
    return ChatResponse(**result)


@router.post("/{session_id}/edit")
async def paper_edit(session_id: str, req: EditRequest, db: AsyncSession = Depends(get_db)):
    result = await edit_paper(session_id, req.section_name, req.edit_request, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    return EditResponse(**result)


@router.get("/{session_id}/versions")
async def paper_versions(session_id: str, db: AsyncSession = Depends(get_db)):
    versions = await list_versions(session_id, db)
    return {"versions": versions}


@router.get("/{session_id}/versions/{version_id}")
async def paper_version_detail(session_id: str, version_id: str, db: AsyncSession = Depends(get_db)):
    result = await get_version(session_id, version_id, db)
    if not result:
        raise HTTPException(404, "Version not found")
    return result


@router.get("/{session_id}/export")
async def paper_export(session_id: str, format: str = "markdown", db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Paper).where(Paper.session_id == session_id))
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(404, "Paper not found")
    if not paper.active_version_id:
        raise HTTPException(404, "No active version found")

    version_result = await db.execute(select(PaperVersion).where(PaperVersion.id == paper.active_version_id))
    version = version_result.scalar_one_or_none()
    if not version:
        raise HTTPException(404, "Active version not found")

    if format == "markdown":
        content = version.full_markdown
        media_type = "text/markdown"
        filename = f"paper-{session_id}.md"
    elif format == "latex":
        content = version.full_latex or version.full_markdown
        media_type = "application/x-latex"
        filename = f"paper-{session_id}.tex"
    elif format == "pdf":
        return Response(status_code=501, content="PDF export not implemented")
    else:
        raise HTTPException(400, f"Unsupported format: {format}")

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
