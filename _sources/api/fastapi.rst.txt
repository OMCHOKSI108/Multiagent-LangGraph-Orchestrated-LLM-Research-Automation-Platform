REST API (FastAPI)
==================

The FastAPI server exposes comprehensive REST endpoints for research, RAG, papers,
images, AI generation, and individual agents. All endpoints are prefixed and
proxied through the Node.js gateway.

Research (``/api/research``)
----------------------------

**POST /api/research/start**
   Run the full LangGraph research pipeline.

   .. code-block:: json

      {
        "question": "What are the latest advances in retrieval-augmented generation?",
        "session_id": "uuid-optional",
        "user_id": "uuid-optional",
        "max_revisions": 2,
        "job_id": "uuid-optional"
      }

   Response: ``ResearchResponse`` with ``session_id``, ``report``, ``sources``, ``status``.

**GET /api/research/sessions/{session_id}**
   Get session details with messages and sources.

**POST /api/research/plans/{session_id}/approve**
   Approve a generated research plan.

RAG (``/api/rag``)
------------------

**POST /api/rag/query**
   Hybrid search (vector + keyword + reranker).

   .. code-block:: json

      {
        "query": "transformer attention mechanism",
        "session_id": "uuid",
        "top_k": 10,
        "min_score": 0.15,
        "source_type": "webpage",
        "min_trust_score": 0.5
      }

**POST /api/rag/enhanced-search**
   Query rewrite → sub-questions → hybrid search → context compression.

**POST /api/rag/answer**
   Full pipeline: search → answer → faithfulness check → reflexion revision.

   .. code-block:: json

      {
        "query": "How does sparse attention work?",
        "session_id": "uuid",
        "top_k": 10,
        "min_score": 0.2
      }

   Response includes ``answer``, ``faithful``, ``faithfulness_score``,
   ``unsupported_claims``, ``citations``, ``chunks_used``.

Papers (``/api/papers``)
------------------------

**POST /api/papers/{session_id}/chat**
   Conversational Q&A over the generated paper.

   .. code-block:: json

      {
        "message": "Summarize the methodology section",
        "session_id": "uuid"
      }

**POST /api/papers/{session_id}/edit**
   Edit a paper section (creates new version with diff).

   .. code-block:: json

      {
        "section_name": "III. Proposed Architecture",
        "instruction": "Add details about the attention mechanism"
      }

**GET /api/papers/{session_id}/versions**
   List all versions of a paper.

**GET /api/papers/{session_id}/versions/{version_id}**
   Get a specific version's full content.

**GET /api/papers/{session_id}/export?format=markdown**
   Export paper (formats: ``markdown``, ``latex``, ``pdf``).

Images (``/api/images``)
------------------------

**POST /api/images/search**
   Search and store images related to the research.

   .. code-block:: json

      {
        "query": "transformer architecture diagram",
        "session_id": "uuid",
        "max_images": 5
      }

**POST /api/images/attach**
   Attach an image to a paper section.

**GET /api/images/{session_id}**
   Get stored images for a session.

AI Generation (``/api/ai``)
---------------------------

**POST /api/ai/generate**
   Centralized LLM generation with method overloading.

   .. code-block:: json

      {
        "prompt": "Explain the attention mechanism",
        "generator_type": "base",
        "temperature": 0.7,
        "max_tokens": 4096,
        "stream": false
      }

   Also supports:

   .. code-block:: json

      {
        "system_prompt": "You are an AI expert",
        "user_prompt": "Explain transformers",
        "generator_type": "faithful"
      }

   Generator types: ``base``, ``streaming``, ``faithful``, ``tracking``.
   When ``stream: true``, returns SSE stream of tokens.

**POST /api/ai/rewrite**
   Rewrite a search query for precision.

   .. code-block:: json

      { "query": "tell me about RAG" }

**POST /api/ai/sub-questions**
   Break a query into 2-3 sub-questions.

   .. code-block:: json

      { "query": "How do transformers work?" }

**POST /api/ai/context-compress**
   Extract relevant sentences from chunks.

   .. code-block:: json

      {
        "query": "attention is all you need",
        "chunks": [...],
        "max_chars": 3000
      }

**POST /api/ai/faithfulness-check**
   Verify answer claims against source context.

   .. code-block:: json

      {
        "answer": "...",
        "context": "..."
      }

**POST /api/ai/reflexion**
   Rewrite answer to remove unsupported claims.

   .. code-block:: json

      {
        "answer": "...",
        "context": "...",
        "unsupported_claims": ["..."],
        "query": "original question"
      }

Agents (``/internal/agents``)
-----------------------------

These endpoints are **internal only** — called by BullMQ workers, not exposed to clients.
Each accepts a minimal request model (not the full ``ResearchState``).

=============== ============ ==========================================
Endpoint        Method       Purpose
=============== ============ ==========================================
``/planner``    POST         Create research plan
``/searcher``   POST         Search web for queries
``/crawler``    POST         Crawl URLs for content
``/extractor``  POST         Extract structured data
``/chunker``    POST         Chunk and embed content
``/reasoning``  POST         Synthesize key findings
``/paper-writer`` POST       Write IEEE paper
``/citation``   POST         Map claims to sources
``/reviewer``   POST         Review paper quality
``/revise``     POST         Revise paper from feedback
``/writer``     POST         Write Markdown report
``/chat-with-paper`` POST    Q&A over paper
``/search-images`` POST      Search for images
``/edit-paper``  POST        Edit paper section
=============== ============ ==========================================
