Architecture
============

The platform follows a **three-tier architecture** with clear separation of concerns:

:Client (Next.js): User interface, authentication flows, real-time research dashboard
:Node API Gateway (Express+Apollo): Auth, session management, job queuing, SSE streaming, reverse proxy
:FastAPI AI Engine (LangGraph): Multi-agent pipeline, RAG, LLM orchestration, database persistence

Node as API Gateway
-------------------

The Node.js server is the **sole entry point** for the client. It handles:

* **Authentication** — register, login, email verification, magic link, password reset
* **Session management** — research sessions, projects, API keys
* **Job queuing** — BullMQ workers forward research jobs to FastAPI
* **SSE streaming** — subscribes to Redis ``research:*`` channels and pushes token/progress events
* **Reverse proxy** — forwards ``/api/papers/*``, ``/api/rag/*``, ``/api/research/*``, ``/api/ai/*``,
  ``/api/agents/*`` to FastAPI

.. code-block::

   Client ──> Node :4000
                ├── /graphql          (Apollo Server — auth, sessions, settings)
                ├── /api/health       (Health check)
                ├── /api/research-jobs/:jobId/events  (SSE stream)
                └── Proxy to FastAPI :8000
                     ├── /api/papers/*
                     ├── /api/rag/*
                     ├── /api/research/*
                     ├── /api/ai/*
                     └── /api/agents/* → /internal/agents/*

FastAPI as AI Engine
--------------------

FastAPI is a **private internal service** — only accessible via Node's proxy or BullMQ workers.
It hosts:

* **LangGraph pipeline** — a 10-node state graph that orchestrates the research process
* **RAG engine** — hybrid vector + keyword search with cross-encoder reranking
* **Centralized AI generation** — ``BaseGenerator`` with method overloading (prompt, system+user,
  messages) and subclass overrides (streaming, tracking, faithfulness)
* **Provider abstraction** — ``LLMProviderService`` with ``GroqClient``, ``OpenRouterClient``,
  and stubs for OpenAI, Gemini, and local models
* **Full database** — 18 SQLAlchemy models for research sessions, sources, documents, papers,
  citations, token usage, and more

Data Flow
---------

.. code-block::

   User enters question in UI
       │
       ▼
   Client sends GraphQL mutation: startResearch(question)
       │
       ▼
   Node creates ResearchSession (PostgreSQL)
   Node pushes job to BullMQ "research" queue (Redis)
       │
       ▼
   BullMQ worker picks up job
   Worker POSTs to FastAPI /api/research/start
       │
       ▼
   FastAPI builds LangGraph StateGraph with 10 nodes
   FastAPI invokes the graph with initial state
       │
       ├── planner → searcher → crawler
       │         → extractor → chunker → reasoning
       │         → paper_writer → citation → reviewer
       │         → (revise if needed, loop back to reviewer)
       │
       ▼
   Each agent publishes progress via Redis pub/sub
   Node SSE manager streams events to client
       │
       ▼
   Results persisted to PostgreSQL:
     - ResearchSession, ResearchMessage, ResearchSource
     - RawDocument, DocumentChunk (with pgvector embeddings)
     - EvidenceItem, KeyFinding
     - Paper, PaperVersion, PaperSection, Citation
       │
       ▼
   Client receives final report + citations via SSE

SSE Streaming Architecture
--------------------------

.. code-block::

   FastAPI Agent              Redis                     Node SSE Manager          Client
       │                        │                            │                      │
       │── pub research:progress:{jobId} ──> subscribe       │                      │
       │── pub research:tokens:{jobId} ────> subscribe       │                      │
       │                        │                            │── SSE event ──────>  │
       │                        │                            │── "progress" data    │
       │                        │                            │── "token" data       │
       │                        │                            │                      │
       │                        │                            │── flush every        │
       │                        │                            │   30 chunks (<25%)   │
       │                        │                            │   2 chunks  (≥25%)   │
       │                        │                            │   500ms fallback     │

The SSE manager implements **chunk-aware flushing**: when progress is below 25%, tokens are
batched aggressively (30 at a time) to avoid overwhelming the client. After 25%, the batch
size drops to 2 for smoother output. A 500ms fallback timer ensures no chunk waits indefinitely.

Queue Architecture
------------------

Four BullMQ queues run in the Node.js process:

=========== ========= ==========================================================
Queue       Concurrency Purpose
=========== ========= ==========================================================
``research``      1   Full research pipeline (LangGraph)
``scrape``       5   Web scraping tasks
``embed``        3   Embedding generation
``paper``        2   Paper editing / export
=========== ========= ==========================================================

Each queue uses Redis for persistence. Failed jobs are retried based on BullMQ's built-in
retry mechanism with ``maxRetriesPerRequest: null`` for connection resilience.
