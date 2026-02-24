"""
Vector Store Manager — ChromaDB workspace-scoped collections.

Each workspace gets its own ChromaDB collection: `ws_{workspace_id}`
This ensures complete data isolation between workspaces.

Features:
  • Add documents (with chunking + embedding)
  • Similarity search (top-k retrieval)
  • Delete collection (workspace cleanup)
  • Workspace-scoped metadata filtering
  • Uses sentence-transformers/all-MiniLM-L6-v2 for embeddings
"""

import os
import logging
import hashlib
from typing import List, Dict, Any, Optional

logger = logging.getLogger("ai_engine.vectorstore.manager")

# ============================
# ChromaDB Client Singleton
# ============================
_chroma_client = None


def _get_chroma_client():
    """Lazily initialize the ChromaDB persistent client."""
    global _chroma_client
    if _chroma_client is not None:
        return _chroma_client

    try:
        import chromadb
        from chromadb.config import Settings

        persist_dir = os.getenv(
            "CHROMA_PERSIST_DIR",
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chromadb"),
        )
        os.makedirs(persist_dir, exist_ok=True)

        _chroma_client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True,
            ),
        )
        logger.info(f"[VectorStore] ChromaDB initialized at: {persist_dir}")
        return _chroma_client

    except ImportError:
        logger.error("[VectorStore] chromadb not installed. Run: pip install chromadb")
        raise ImportError("chromadb is required for vector store. Install with: pip install chromadb")


# ============================
# Embedding Function
# ============================
_embedding_fn = None


def _get_embedding_function():
    """Get or create the ChromaDB-compatible embedding function."""
    global _embedding_fn
    if _embedding_fn is not None:
        return _embedding_fn

    try:
        from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
        _embedding_fn = SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        logger.info("[VectorStore] Using SentenceTransformer embedding: all-MiniLM-L6-v2")
        return _embedding_fn
    except Exception as e:
        logger.error(f"[VectorStore] Failed to load embedding function: {e}")
        raise


# ============================
# Collection Name Helper
# ============================
def _collection_name(workspace_id: str) -> str:
    """Generate a valid ChromaDB collection name for a workspace."""
    # ChromaDB collection names must be 3-63 chars, alphanumeric + underscores
    # UUID is 36 chars with hyphens, so we replace hyphens
    safe_id = workspace_id.replace("-", "")
    return f"ws_{safe_id}"


# ============================
# Public API
# ============================

def get_or_create_collection(workspace_id: str):
    """Get or create a ChromaDB collection for a workspace."""
    client = _get_chroma_client()
    embed_fn = _get_embedding_function()
    name = _collection_name(workspace_id)

    collection = client.get_or_create_collection(
        name=name,
        embedding_function=embed_fn,
        metadata={"workspace_id": workspace_id},
    )
    logger.info(f"[VectorStore] Collection '{name}' ready (count: {collection.count()})")
    return collection


def add_documents(
    workspace_id: str,
    documents: List[Dict[str, Any]],
    session_id: Optional[int] = None,
) -> int:
    """
    Add pre-chunked documents to the workspace's vector collection.

    Each document should have:
      {"text": "...", "metadata": {"source_url": "...", "chunk_index": 0, ...}}

    Returns the number of documents added.
    """
    if not documents:
        return 0

    collection = get_or_create_collection(workspace_id)

    ids = []
    texts = []
    metadatas = []

    for doc in documents:
        text = doc.get("text", "")
        if not text.strip():
            continue

        # Generate a deterministic ID from content + workspace to avoid duplicates
        content_hash = hashlib.md5(
            f"{workspace_id}:{text[:200]}".encode()
        ).hexdigest()[:16]
        doc_id = f"{workspace_id[:8]}_{content_hash}"

        meta = doc.get("metadata", {})
        if session_id is not None:
            meta["session_id"] = session_id
        meta["workspace_id"] = workspace_id

        ids.append(doc_id)
        texts.append(text)
        metadatas.append(meta)

    if not texts:
        return 0

    # ChromaDB handles batching internally, but we batch for safety (max 5000)
    batch_size = 5000
    total_added = 0

    for i in range(0, len(texts), batch_size):
        batch_ids = ids[i : i + batch_size]
        batch_texts = texts[i : i + batch_size]
        batch_metas = metadatas[i : i + batch_size]

        collection.upsert(
            ids=batch_ids,
            documents=batch_texts,
            metadatas=batch_metas,
        )
        total_added += len(batch_ids)

    logger.info(
        f"[VectorStore] Added {total_added} chunks to workspace {workspace_id[:8]}... "
        f"(total: {collection.count()})"
    )
    return total_added


def similarity_search(
    workspace_id: str,
    query: str,
    top_k: int = 10,
    session_id: Optional[int] = None,
    source_type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Search for similar documents in a workspace's collection.

    Returns a list of results:
      [{"text": "...", "metadata": {...}, "distance": 0.123}, ...]
    """
    collection = get_or_create_collection(workspace_id)

    if collection.count() == 0:
        logger.info(f"[VectorStore] Collection for {workspace_id[:8]}... is empty")
        return []

    # Build optional where filter
    where_filter = None
    conditions = []
    if session_id is not None:
        conditions.append({"session_id": session_id})
    if source_type:
        conditions.append({"source_type": source_type})

    if len(conditions) == 1:
        where_filter = conditions[0]
    elif len(conditions) > 1:
        where_filter = {"$and": conditions}

    try:
        results = collection.query(
            query_texts=[query],
            n_results=min(top_k, collection.count()),
            where=where_filter if where_filter else None,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as e:
        logger.error(f"[VectorStore] Search failed: {e}")
        # Retry without filter in case of metadata issues
        results = collection.query(
            query_texts=[query],
            n_results=min(top_k, collection.count()),
            include=["documents", "metadatas", "distances"],
        )

    # Flatten ChromaDB results format
    output = []
    if results and results.get("documents"):
        docs = results["documents"][0]
        metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
        dists = results["distances"][0] if results.get("distances") else [0.0] * len(docs)

        for doc, meta, dist in zip(docs, metas, dists):
            output.append({
                "text": doc,
                "metadata": meta,
                "distance": dist,
                "relevance_score": max(0, 1 - dist),  # Convert distance to similarity
            })

    logger.info(
        f"[VectorStore] Search in {workspace_id[:8]}...: "
        f"query='{query[:50]}...' returned {len(output)} results"
    )
    return output


def delete_collection(workspace_id: str) -> bool:
    """Delete the entire collection for a workspace."""
    try:
        client = _get_chroma_client()
        name = _collection_name(workspace_id)
        client.delete_collection(name)
        logger.info(f"[VectorStore] Deleted collection '{name}'")
        return True
    except Exception as e:
        logger.warning(f"[VectorStore] Failed to delete collection for {workspace_id}: {e}")
        return False


def get_collection_stats(workspace_id: str) -> Dict[str, Any]:
    """Get stats about a workspace's vector collection."""
    try:
        collection = get_or_create_collection(workspace_id)
        return {
            "workspace_id": workspace_id,
            "collection_name": _collection_name(workspace_id),
            "document_count": collection.count(),
        }
    except Exception as e:
        return {
            "workspace_id": workspace_id,
            "error": str(e),
            "document_count": 0,
        }


def add_text(
    workspace_id: str,
    text: str,
    source_url: str = "",
    source_type: str = "scraped",
    session_id: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> int:
    """
    Convenience method: chunk text and add to vector store in one call.
    """
    from vectorstore.chunker import chunk_text

    chunks = chunk_text(
        text=text,
        source_url=source_url,
        source_type=source_type,
        metadata=metadata,
    )

    return add_documents(workspace_id, chunks, session_id=session_id)
