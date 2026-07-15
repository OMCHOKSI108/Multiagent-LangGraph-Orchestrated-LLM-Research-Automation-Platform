from __future__ import annotations

import re
from typing import Any

CHUNK_SIZE = 1200
CHUNK_OVERLAP = 200


def split_text(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> list[dict[str, Any]]:
    if not text.strip():
        return []

    paragraphs = re.split(r"\n\s*\n", text)
    chunks: list[dict[str, Any]] = []
    current: list[str] = []
    current_len = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        para_len = len(para)

        if current_len + para_len > chunk_size and current:
            chunk_text = "\n\n".join(current)
            chunks.append({
                "chunk_text": chunk_text,
                "chunk_size": len(chunk_text),
                "start_idx": 0,
            })
            overlap_text = current[-int(len(current) * (overlap / chunk_size)):] if len(current) > 1 else []
            current = overlap_text
            current_len = sum(len(p) for p in current)
            current.append(para)
            current_len += para_len
        else:
            current.append(para)
            current_len += para_len

    if current:
        chunk_text = "\n\n".join(current)
        chunks.append({
            "chunk_text": chunk_text,
            "chunk_size": len(chunk_text),
            "start_idx": 0,
        })

    return chunks


def chunk_paper(
    title: str,
    abstract: str,
    sections: list[dict[str, str]],
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    full_text = f"Title: {title}\n\nAbstract: {abstract}"
    chunks.extend(split_text(full_text, chunk_size, overlap))

    for section in sections:
        heading = section.get("heading", "")
        body = section.get("body", "")
        section_text = f"## {heading}\n\n{body}"
        section_chunks = split_text(section_text, chunk_size, overlap)
        for c in section_chunks:
            c["section_title"] = heading
        chunks.extend(section_chunks)

    return chunks


def chunk_scraped_content(
    content: str,
    url: str = "",
    title: str = "",
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> list[dict[str, Any]]:
    if not content.strip():
        return []

    chunks = split_text(content, chunk_size, overlap)
    for c in chunks:
        c["url"] = url
        c["title"] = title
    return chunks
