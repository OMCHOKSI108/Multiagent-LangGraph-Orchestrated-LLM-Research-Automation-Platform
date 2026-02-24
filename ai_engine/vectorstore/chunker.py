"""
Text Chunker — splits documents for embedding and vector storage.

Strategy:
  • RecursiveCharacterTextSplitter with 512-token chunks, 64-token overlap
  • Falls back to simple character splitting if langchain is unavailable
  • Supports PDF text, web-scraped HTML, and plain text
"""

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("ai_engine.vectorstore.chunker")

# Approximate token-to-character ratio (1 token ≈ 4 chars for English text)
CHARS_PER_TOKEN = 4
DEFAULT_CHUNK_SIZE = 512   # in tokens
DEFAULT_CHUNK_OVERLAP = 64  # in tokens


def chunk_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
    source_url: Optional[str] = None,
    source_type: str = "scraped",
    metadata: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Split text into overlapping chunks suitable for embedding.

    Returns a list of dicts:
      [{"text": "...", "metadata": {"source_url": "...", "chunk_index": 0, ...}}, ...]
    """
    if not text or not text.strip():
        return []

    char_chunk_size = chunk_size * CHARS_PER_TOKEN
    char_overlap = chunk_overlap * CHARS_PER_TOKEN

    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=char_chunk_size,
            chunk_overlap=char_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
            length_function=len,
        )
        raw_chunks = splitter.split_text(text)
    except ImportError:
        # Fallback: simple character-based splitting
        logger.warning("[Chunker] langchain_text_splitters not available, using simple split")
        raw_chunks = _simple_split(text, char_chunk_size, char_overlap)

    base_meta = {
        "source_url": source_url or "",
        "source_type": source_type,
        **(metadata or {}),
    }

    results = []
    for i, chunk in enumerate(raw_chunks):
        chunk_text_clean = chunk.strip()
        if not chunk_text_clean:
            continue
        results.append({
            "text": chunk_text_clean,
            "metadata": {
                **base_meta,
                "chunk_index": i,
                "char_count": len(chunk_text_clean),
            },
        })

    logger.info(f"[Chunker] Split {len(text)} chars into {len(results)} chunks "
                f"(size={chunk_size}tok, overlap={chunk_overlap}tok)")
    return results


def _simple_split(text: str, chunk_size: int, overlap: int) -> List[str]:
    """Simple character-based splitting with overlap."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
        if start >= len(text):
            break
    return chunks


def chunk_documents(
    documents: List[Dict[str, Any]],
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[Dict[str, Any]]:
    """
    Chunk multiple documents at once.

    Each document should have:
      {"text": "...", "url": "...", "source_type": "scraped", ...}
    """
    all_chunks = []
    for doc in documents:
        text = doc.get("text") or doc.get("content") or ""
        url = doc.get("url") or doc.get("source_url") or ""
        source_type = doc.get("source_type", "scraped")
        meta = {k: v for k, v in doc.items() if k not in ("text", "content")}

        chunks = chunk_text(
            text=text,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            source_url=url,
            source_type=source_type,
            metadata=meta,
        )
        all_chunks.extend(chunks)

    return all_chunks
