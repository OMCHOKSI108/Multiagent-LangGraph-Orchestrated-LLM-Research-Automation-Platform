import re
from ..config import settings


def chunk_text(text: str, source_url: str = "", source_title: str = "") -> list[dict]:
    sections = _split_by_headings(text)
    chunks = []
    chunk_idx = 0

    for section_title, section_text in sections:
        if not section_text.strip():
            continue
        section_chunks = _split_section(section_text, settings.chunk_size, settings.chunk_overlap)
        for i, chunk_str in enumerate(section_chunks):
            chunks.append({
                "chunk_index": chunk_idx,
                "section_title": section_title or "",
                "chunk_text": chunk_str,
                "metadata": {
                    "source_url": source_url,
                    "source_title": source_title,
                    "section": section_title or "",
                    "chunk_in_section": i,
                },
            })
            chunk_idx += 1

    return chunks


def _split_by_headings(text: str) -> list[tuple[str, str]]:
    pattern = re.compile(r"^(#{1,3})\s+(.+)$", re.MULTILINE)
    splits = list(pattern.finditer(text))

    if not splits:
        return [("", text.strip())]

    sections = []
    prev_end = 0

    for match in splits:
        start = match.start()
        if start > prev_end:
            between = text[prev_end:start].strip()
            if between:
                sections.append(("", between))
        heading_level = len(match.group(1))
        heading_text = match.group(2).strip()
        prev_end = match.end()

    remaining = text[prev_end:].strip()
    if remaining:
        last_heading_match = list(pattern.finditer(text))
        if last_heading_match:
            last = last_heading_match[-1]
            sections.append((last.group(2).strip(), remaining))

    return sections


def _split_section(text: str, chunk_size: int, overlap: int) -> list[str]:
    paragraphs = re.split(r"\n\s*\n", text)
    paragraphs = [p.strip() for p in paragraphs if p.strip()]

    chunks = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 2 <= chunk_size:
            current = (current + "\n\n" + para).strip()
        else:
            if current:
                chunks.append(current)
            if len(para) > chunk_size:
                sub_chunks = _split_long_paragraph(para, chunk_size, overlap)
                chunks.extend(sub_chunks)
                current = ""
            else:
                current = para

    if current:
        chunks.append(current)

    return chunks


def _split_long_paragraph(text: str, chunk_size: int, overlap: int) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks = []
    current = ""
    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= chunk_size:
            current = (current + " " + sentence).strip()
        else:
            if current:
                chunks.append(current)
            current = sentence

    if current:
        chunks.append(current)

    if overlap > 0 and len(chunks) > 1:
        overlapped = []
        for i, c in enumerate(chunks):
            if i > 0:
                prev_end = chunks[i - 1][-overlap:] if len(chunks[i - 1]) > overlap else chunks[i - 1]
                c = prev_end + " " + c
            overlapped.append(c)
        chunks = overlapped

    return chunks
