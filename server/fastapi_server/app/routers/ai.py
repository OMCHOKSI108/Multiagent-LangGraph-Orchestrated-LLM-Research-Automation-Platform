from __future__ import annotations

import json
import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..services.generator import (
    BaseGenerator,
    GenerateResult,
    StreamingGenerator,
    FaithfulGenerator,
    TrackingGenerator,
    gen,
    streaming_gen,
    faithful_gen,
    tracking_gen,
)
from ..services.llm import call_llm as _call_llm

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class GenerateRequest(BaseModel):
    prompt: str | None = None
    system_prompt: str | None = None
    user_prompt: str | None = None
    messages: list[ChatMessage] | None = None
    temperature: float = 0.7
    max_tokens: int = 4096
    stream: bool = False
    session_id: str | None = None
    agent_name: str | None = None
    generator: Literal["base", "streaming", "faithful", "tracking"] = "base"


class GenerateResponse(BaseModel):
    content: str
    provider: str
    model: str
    usage: dict | None = None


class RewriteRequest(BaseModel):
    query: str


class SubQuestionsRequest(BaseModel):
    query: str


class ContextCompressRequest(BaseModel):
    chunks: list[dict]
    query: str
    max_chars: int = 3000


class FaithfulnessCheckRequest(BaseModel):
    answer: str
    context: str


class ReflexionRequest(BaseModel):
    answer: str
    context: str
    unsupported_claims: list[str]


def _select_generator(kind: str) -> BaseGenerator:
    mapping: dict[str, BaseGenerator] = {
        "base": gen,
        "streaming": streaming_gen,
        "faithful": faithful_gen,
        "tracking": tracking_gen,
    }
    return mapping.get(kind, gen)


@router.post("/generate", response_model=GenerateResponse)
async def generate_endpoint(req: GenerateRequest, db: AsyncSession = Depends(get_db)):
    g = _select_generator(req.generator)

    msgs_dict = None
    if req.messages is not None:
        msgs_dict = [m.model_dump() for m in req.messages]

    if req.stream:
        return StreamingResponse(
            _stream_generator(g, req, db),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    result: GenerateResult = g.generate(
        prompt=req.prompt,
        system_prompt=req.system_prompt,
        user_prompt=req.user_prompt,
        messages=msgs_dict,
        temperature=req.temperature,
        max_tokens=req.max_tokens,
        session_id=req.session_id,
        agent_name=req.agent_name,
        db=db,
    )

    return GenerateResponse(
        content=result.content,
        provider=result.usage.provider if result.usage else "unknown",
        model=result.usage.model if result.usage else "unknown",
        usage=result.usage.to_dict() if result.usage else None,
    )


async def _stream_generator(g: BaseGenerator, req: GenerateRequest, db):
    msgs_dict = None
    if req.messages is not None:
        msgs_dict = [m.model_dump() for m in req.messages]

    async def token_cb(token: str):
        yield f"data: {json.dumps({'token': token})}\n\n"

    result = await g.generate_stream(
        prompt=req.prompt,
        system_prompt=req.system_prompt,
        user_prompt=req.user_prompt,
        messages=msgs_dict,
        temperature=req.temperature,
        max_tokens=req.max_tokens,
        token_callback=token_cb,
        session_id=req.session_id,
        agent_name=req.agent_name,
        db=db,
    )

    yield f"data: {json.dumps({'done': True, 'content': result.content, 'usage': result.usage.to_dict() if result.usage else None})}\n\n"


@router.post("/rewrite")
async def rewrite_query(req: RewriteRequest):
    result = _call_llm(
        "You rewrite user questions into precise, self-contained search queries for a RAG system. "
        "Remove ambiguity, add technical terms, keep it a single sentence.",
        f"Original: {req.query}\n\nRewritten query:",
        temperature=0.2,
    )
    return {"rewritten": result.strip()}


@router.post("/sub-questions")
async def sub_questions(req: SubQuestionsRequest):
    result = _call_llm(
        "Break the following research question into 2-3 specific sub-questions. "
        "Return as a JSON list of strings only. Example: [\"sub question 1\", \"sub question 2\"]",
        f"Question: {req.query}\n\nSub-questions (JSON list):",
        temperature=0.2,
    )
    try:
        json_match = re.search(r"\[.*?\]", result, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group())
            if parsed and isinstance(parsed, list) and isinstance(parsed[0], dict):
                sub_qs = [list(d.values())[0] for d in parsed]
            else:
                sub_qs = parsed
        else:
            sub_qs = [req.query]
    except (json.JSONDecodeError, IndexError):
        sub_qs = [req.query]

    return {"sub_questions": sub_qs}


@router.post("/context-compress")
async def context_compress(req: ContextCompressRequest):
    raw_ctx = "\n\n---\n\n".join(
        f"[{r.get('section_title') or 'Untitled'}] {r.get('chunk_text', r.get('text', ''))}"
        for r in req.chunks
    )
    if not raw_ctx.strip():
        return {"compressed": ""}

    compressed = _call_llm(
        "You are a context compression system. Extract ONLY the sentences and facts "
        "from the provided context that are directly relevant to answering the question. "
        "Remove irrelevant information. Preserve exact wording of relevant sentences. "
        "Keep all technical terms, numbers, and proper names intact.",
        f"Question: {req.query}\n\nContext:\n{raw_ctx}\n\nCompressed relevant context:",
        temperature=0.1,
    )
    if len(compressed) > req.max_chars:
        compressed = compressed[:req.max_chars]
    return {"compressed": compressed.strip()}


@router.post("/faithfulness-check")
async def faithfulness_check(req: FaithfulnessCheckRequest):
    if not req.context.strip():
        return {"faithful": True, "unsupported_claims": [], "score": 10}

    result = _call_llm(
        "You are a faithfulness verifier. Given an answer and the source context, "
        "identify any claims in the answer that are NOT supported by the context. "
        "Return JSON: {\"faithful\": true/false, \"unsupported_claims\": [\"...\"], \"score\": 0-10}",
        f"Context:\n{req.context}\n\nAnswer:\n{req.answer}\n\nVerification:",
        temperature=0.1,
    )
    try:
        json_match = re.search(r"\{.*\}", result, re.DOTALL)
        if json_match:
            verdict = json.loads(json_match.group())
        else:
            verdict = {"faithful": True, "unsupported_claims": [], "score": 10}
    except (json.JSONDecodeError, AttributeError):
        verdict = {"faithful": True, "unsupported_claims": [], "score": 10}

    return verdict


@router.post("/reflexion")
async def reflexion_revise(req: ReflexionRequest):
    revised = _call_llm(
        "You are a research assistant. Your previous answer contained unsupported claims. "
        "Revise it to ONLY include information supported by the provided context. "
        "If the context doesn't fully answer the question, say so explicitly.",
        f"Context:\n{req.context}\n\nPrevious Answer:\n{req.answer}\n\n"
        f"Unsupported Claims:\n{chr(10).join(req.unsupported_claims)}\n\nRevised Answer:",
        temperature=0.2,
    )
    return {"revised": revised.strip()}
