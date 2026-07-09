FastAPI Server (``server/fastapi_server/``)
============================================

The Python FastAPI server is the **AI engine** — it runs the multi-agent LangGraph pipeline,
RAG system, LLM orchestration, and all database persistence.

Directory Structure
-------------------

::

   app/
   ├── config.py           # Pydantic Settings (all env vars)
   ├── db.py               # SQLAlchemy async models (18 tables)
   ├── graph.py            # LangGraph StateGraph (10 nodes)
   ├── main.py             # FastAPI app entry, router mounts
   ├── agents/             # 14 agent modules
   ├── routers/            # 6 API routers
   └── services/           # 10 service modules

Entry Point — ``main.py``
--------------------------

* CORS (all origins allowed)
* Routers mounted: ``research``, ``rag``, ``paper``, ``images``, ``ai``, ``agents``
* ``init_db()`` on startup creates all tables
* ``GET /api/health`` returns ``{"status":"ok","service":"fastapi-server"}``
* ``GET /`` returns inline HTML API documentation

LangGraph Pipeline — ``app/graph.py``
--------------------------------------

The pipeline is a 10-node ``StateGraph`` with conditional routing:

.. code-block::

   planner ──> searcher ──> crawler ──> extractor ──> chunker
       │                                                    │
       │                                                    ▼
       │                                              reasoning
       │                                                    │
       │                                                    ▼
       │                                            paper_writer
       │                                                    │
       │                                                    ▼
       │                                             citation
       │                                                    │
       │                                                    ▼
       │                                             reviewer
       │                                              │      │
       │                                              │      ▼
       │                                              │   revise ──> reviewer (loop)
       │                                              │
       │                                              ▼
       │                                              END

Each node checks ``state.get("error")`` — if set, it short-circuits to ``END``.
The reviewer loop cycles up to ``max_revisions`` times (default 2).

The graph is invoked via ``run_research()`` which accepts a research question,
optional session/user IDs, and returns the final state with report, sources,
paper metadata, and status.

Database Models — ``app/db.py``
--------------------------------

+---------------------+------------------------------------------------+
| Model               | Key Fields                                     |
+---------------------+------------------------------------------------+
| ResearchSessionModel| id, user_id, title, status                     |
+---------------------+------------------------------------------------+
| ResearchMessage     | id, session_id (FK), role, content             |
+---------------------+------------------------------------------------+
| ResearchSource      | id, session_id (FK), url, title, source_type,  |
|                     | trust/relevance/freshness scores               |
+---------------------+------------------------------------------------+
| ResearchReport      | id, session_id (FK, unique), content           |
+---------------------+------------------------------------------------+
| ResearchJob         | id, session_id (FK, unique), depth, status,    |
|                     | model_provider                                 |
+---------------------+------------------------------------------------+
| ResearchPlan        | id, session_id (FK, unique), plan_json (JSONB) |
+---------------------+------------------------------------------------+
| ResearchTask        | id, session_id (FK), task_title, task_type,    |
|                     | status, metadata_json                          |
+---------------------+------------------------------------------------+
| DocumentChunk       | id, session_id (FK), source_id (FK),           |
|                     | chunk_index, chunk_text, embedding (Vector),   |
|                     | search_tsvector, meta_json — HNSW + GIN indexes|
+---------------------+------------------------------------------------+
| EvidenceItem        | id, session_id (FK), source_id (FK), claim,    |
|                     | supporting_text, evidence_type, confidence     |
+---------------------+------------------------------------------------+
| KeyFinding          | id, session_id (FK), finding_title,            |
|                     | finding_text, evidence_item_ids (JSONB)        |
+---------------------+------------------------------------------------+
| RawDocument         | id, source_id (FK), raw_html, raw_text,        |
|                     | clean_text, content_hash, language, token_count|
+---------------------+------------------------------------------------+
| Image               | id, session_id (FK), image_url, alt_text,      |
|                     | caption, relevance_score, local_storage_path   |
+---------------------+------------------------------------------------+
| Paper               | id, session_id (FK, unique), title, abstract,  |
|                     | status, active_version_id                      |
+---------------------+------------------------------------------------+
| PaperVersion        | id, paper_id (FK), version_number,             |
|                     | full_markdown, full_latex, change_summary      |
+---------------------+------------------------------------------------+
| PaperSection        | id, paper_id (FK), version_id (FK), section_name,|
|                     | section_order, content_markdown, embedding     |
+---------------------+------------------------------------------------+
| Citation            | id, paper_id (FK), session_id (FK),            |
|                     | citation_number, claim_text, citation_text, url|
+---------------------+------------------------------------------------+
| PaperEdit           | id, paper_id (FK), version_id (FK), section_name,|
|                     | old_text, new_text, change_summary, status     |
+---------------------+------------------------------------------------+
| TokenUsage          | id, session_id (FK), provider, model,          |
|                     | prompt_tokens, completion_tokens, duration_ms  |
+---------------------+------------------------------------------------+

Routers
-------

+-------------+------------------+------------------------------------------+
| Router      | Prefix           | Endpoints                                |
+-------------+------------------+------------------------------------------+
| research    | /api/research    | POST /start, GET /sessions/{id},          |
|             |                  | POST /plans/{id}/approve                 |
+-------------+------------------+------------------------------------------+
| rag         | /api/rag         | POST /query, POST /enhanced-search,       |
|             |                  | POST /answer                             |
+-------------+------------------+------------------------------------------+
| paper       | /api/papers      | POST /{id}/chat, POST /{id}/edit,         |
|             |                  | GET /{id}/versions, GET /{id}/export      |
+-------------+------------------+------------------------------------------+
| images      | /api/images      | POST /search, POST /attach, GET /{id}    |
+-------------+------------------+------------------------------------------+
| ai          | /api/ai          | POST /generate, /rewrite, /sub-questions, |
|             |                  | /context-compress, /faithfulness-check,   |
|             |                  | /reflexion                               |
+-------------+------------------+------------------------------------------+
| agents      | /internal/agents | 15 individual agent endpoints             |
|             |                  | (internal — proxied from Node)            |
+-------------+------------------+------------------------------------------+
