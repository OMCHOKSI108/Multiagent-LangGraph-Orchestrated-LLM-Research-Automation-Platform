import difflib

from sqlalchemy import select

from ..services.llm import call_llm
from ..db import Paper, PaperSection, PaperVersion, DocumentChunk, Citation

EDIT_SYSTEM_PROMPT = """You are an IEEE paper editor. Given a user edit request and the relevant paper section, generate an edited version.

Return valid JSON:
{
  "edited_section": "The complete edited section content in markdown",
  "change_summary": "Brief description of what changed",
  "citations_affected": ["citation numbers if any citations were added/removed/modified"]
}

Requirements:
- Keep IEEE format
- Maintain all existing citations
- Add new citations only if supported by the provided evidence
- Do not fabricate claims or references
- Be precise and minimal in edits - only change what the user requested"""

CITATION_CHECK_PROMPT = """You are a citation verifier. Check if the following edited paper section 
contains any claims that are NOT supported by the provided citations. 
List any unsupported claims. Return JSON:
{
  "claims_cited_properly": true/false,
  "unsupported_claims": ["claim 1", "claim 2"],
  "suggested_fixes": ["Add citation for claim 1 from source X"]
}"""


async def edit_paper(
    session_id: str,
    section_name: str | None,
    edit_request: str,
    db,
) -> dict:
    paper_result = await db.execute(
        select(Paper).where(Paper.session_id == session_id)
    )
    paper = paper_result.scalar_one_or_none()
    if not paper:
        return {"error": "No paper found for this session"}

    version_num = await _get_next_version(paper.id, db)

    if section_name:
        sections_result = await db.execute(
            select(PaperSection)
            .where(PaperSection.paper_id == paper.id, PaperSection.section_name.ilike(f"%{section_name}%"))
            .order_by(PaperSection.section_order)
            .limit(1)
        )
        section = sections_result.scalar_one_or_none()
        if not section:
            sections_result = await db.execute(
                select(PaperSection)
                .where(PaperSection.paper_id == paper.id)
                .order_by(PaperSection.section_order)
            )
            all_sections = sections_result.scalars().all()
            return {"error": f"Section '{section_name}' not found", "available_sections": [s.section_name for s in all_sections]}
    else:
        sections_result = await db.execute(
            select(PaperSection)
            .where(PaperSection.paper_id == paper.id)
            .order_by(PaperSection.section_order)
        )
        sections = sections_result.scalars().all()
        if not sections:
            return {"error": "No sections found"}
        section = sections[0]
        section_name = section.section_name

    citations_result = await db.execute(
        select(Citation).where(Citation.session_id == session_id).limit(10)
    )
    citations = citations_result.scalars().all()
    citation_text = ""
    for c in citations:
        citation_text += f"[{c.citation_number}] {c.claim_text[:100]} (confidence: {c.confidence_score})\n"

    user_prompt = (
        f"Section to edit: {section.section_name}\n\n"
        f"Current content:\n{section.content_markdown}\n\n"
        f"Available citations:\n{citation_text or 'No citations available'}\n\n"
        f"Edit request: {edit_request}\n\n"
        f"Generate the edited section."
    )

    result = call_llm(EDIT_SYSTEM_PROMPT, user_prompt, temperature=0.3)

    import json, re
    try:
        json_match = re.search(r"\{.*\}", result, re.DOTALL)
        data = json.loads(json_match.group()) if json_match else json.loads(result)
    except (json.JSONDecodeError, AttributeError):
        data = {"edited_section": result, "change_summary": "Edited based on request", "citations_affected": []}

    edited = data.get("edited_section", result)

    if citations:
        cite_check = call_llm(
            CITATION_CHECK_PROMPT,
            f"Available citations:\n{citation_text}\n\nEdited section:\n{edited[:2000]}\n\nVerification:",
            temperature=0.1,
        )
        try:
            import json, re
            json_match = re.search(r"\{.*\}", cite_check, re.DOTALL)
            if json_match:
                cite_data = json.loads(json_match.group())
                if not cite_data.get("claims_cited_properly", True):
                    warnings = cite_data.get("unsupported_claims", [])
                    data["citation_warnings"] = warnings
        except (json.JSONDecodeError, AttributeError):
            pass

    old_text = section.content_markdown
    diff = _generate_diff(old_text, edited)

    new_version = PaperVersion(
        paper_id=paper.id,
        version_number=version_num,
        full_markdown=edited,
        change_summary=data.get("change_summary", f"Edit: {edit_request[:100]}"),
    )
    db.add(new_version)
    await db.flush()

    edited_section = PaperSection(
        paper_id=paper.id,
        version_id=new_version.id,
        section_name=section.section_name,
        section_order=section.section_order,
        content_markdown=edited,
    )
    db.add(edited_section)

    paper.active_version_id = new_version.id
    await db.commit()

    return {
        "version_number": version_num,
        "version_id": str(new_version.id),
        "section_name": section.section_name,
        "old_text": old_text,
        "new_text": edited,
        "diff": diff,
        "change_summary": data.get("change_summary", ""),
        "citations_affected": data.get("citations_affected", []),
        "citation_warnings": data.get("citation_warnings", []),
    }


async def list_versions(session_id: str, db) -> list[dict]:
    paper_result = await db.execute(
        select(Paper).where(Paper.session_id == session_id)
    )
    paper = paper_result.scalar_one_or_none()
    if not paper:
        return []

    versions_result = await db.execute(
        select(PaperVersion)
        .where(PaperVersion.paper_id == paper.id)
        .order_by(PaperVersion.version_number.desc())
    )
    versions = versions_result.scalars().all()
    return [
        {
            "version_id": str(v.id),
            "version_number": v.version_number,
            "change_summary": v.change_summary or "",
            "created_at": v.created_at.isoformat() if v.created_at else "",
            "is_active": str(paper.active_version_id) == str(v.id),
        }
        for v in versions
    ]


async def get_version(session_id: str, version_id: str, db) -> dict | None:
    paper_result = await db.execute(
        select(Paper).where(Paper.session_id == session_id)
    )
    paper = paper_result.scalar_one_or_none()
    if not paper:
        return None

    version_result = await db.execute(
        select(PaperVersion).where(
            PaperVersion.id == version_id,
            PaperVersion.paper_id == paper.id,
        )
    )
    version = version_result.scalar_one_or_none()
    if not version:
        return None

    sections_result = await db.execute(
        select(PaperSection)
        .where(PaperSection.version_id == version.id)
        .order_by(PaperSection.section_order)
    )
    sections = sections_result.scalars().all()

    return {
        "version_number": version.version_number,
        "full_markdown": version.full_markdown,
        "change_summary": version.change_summary or "",
        "sections": [
            {"name": s.section_name, "content": s.content_markdown}
            for s in sections
        ],
        "created_at": version.created_at.isoformat() if version.created_at else "",
    }


async def _get_next_version(paper_id, db) -> int:
    result = await db.execute(
        select(PaperVersion)
        .where(PaperVersion.paper_id == paper_id)
        .order_by(PaperVersion.version_number.desc())
        .limit(1)
    )
    last = result.scalar_one_or_none()
    return (last.version_number + 1) if last else 1


def _generate_diff(old_text: str, new_text: str) -> list[dict]:
    diff_lines = list(difflib.unified_diff(
        old_text.splitlines(keepends=True),
        new_text.splitlines(keepends=True),
        lineterm="",
    ))
    changes = []
    for line in diff_lines[2:]:
        if line.startswith("+") or line.startswith("-"):
            changes.append({
                "type": "added" if line.startswith("+") else "removed",
                "content": line[1:].strip(),
            })
    return changes[:50]
