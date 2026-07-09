Overview
========

What is it?
-----------

A **multi-agent AI research automation platform** that takes a research question and autonomously
produces a comprehensive, cited research report or IEEE-format paper. Instead of manually browsing
dozens of tabs, a team of LangGraph-powered agents handles the entire pipeline:

#. **Plans** the research strategy
#. **Searches** the web for relevant sources
#. **Crawls** each source (static HTTP, JavaScript-rendered, or PDF)
#. **Extracts** structured claims and evidence
#. **Chunks** and **embeds** content into a vector database
#. **Reasons** over findings to synthesize insights
#. **Writes** a structured report or IEEE paper
#. **Reviews** and **revises** for quality
#. **Validates** citations against actual sources

Architecture at a Glance
------------------------

:Client: Next.js 16 / React 19 / Tailwind 4 — ``:3000``
:API Gateway: Node.js + Express + Apollo GraphQL + BullMQ — ``:4000``
:AI Engine: FastAPI + LangGraph + Groq/OpenRouter — ``:8000``
:Database: PostgreSQL 16 + pgvector
:Queue / Pub-Sub: Redis 7

.. code-block::

   ┌─────────┐  GraphQL   ┌──────────┐   POST    ┌──────────┐
   │ Client  │ ─────────> │ Node.js  │ ────────> │ FastAPI  │
   │ :3000   │ <───────── │ :4000    │  SSE      │ :8000    │
   └─────────┘   SSE     └─────┬────┘  stream   └────┬─────┘
                               │                      │
                               │ Redis                │ PostgreSQL
                               │ (BullMQ + Pub/Sub)   │ (pgvector)
                               └──────────────────────┘

Key Features
------------

* **10-agent LangGraph pipeline** — planner, searcher, crawler, extractor, chunker, reasoner,
  paper writer, citation mapper, reviewer, reviser
* **Hybrid RAG** — vector (pgvector cosine) + keyword (PostgreSQL FTS) + cross-encoder reranking
* **Dual LLM provider** — Groq (fast inference) with automatic fallback to OpenRouter
* **Real-time SSE** — live token streaming and progress updates to the frontend
* **IEEE-format paper generation** — auto-structured with numbered sections, citations, references
* **Version-controlled paper editing** — every edit creates a new version with full diff
* **Citation validation** — post-generation scan strips any ``[N]`` reference that exceeds the
  available source list
* **Dynamic/static web scraping** — Playwright for SPA sites, HTTPX for static HTML, PyMuPDF for PDFs
* **Transactional emails** — verification, magic link, password reset, welcome, password changed
* **BullMQ job queues** — research, scrape, embed, and paper queues with Retry-Delay-DLQ pattern

Technology Stack
----------------

=============== ============================================================
Layer           Technologies
=============== ============================================================
Frontend        Next.js 16, React 19, Tailwind 4, Apollo Client 4
API Gateway     Node.js 22, Express 4, Apollo Server 4, TypeScript 5
AI Engine       Python 3.12, FastAPI, LangGraph, LangChain
LLM Providers   Groq (llama-3.1-8b-instant), OpenRouter (meta-llama/Llama)
Search          Exa, Tavily, DuckDuckGo (fallback)
Database        PostgreSQL 16, pgvector, SQLAlchemy (async), Sequelize
Queue           BullMQ, Redis 7
Scraping        HTTPX + BeautifulSoup, Playwright, PyMuPDF
Embeddings      SentenceTransformers (all-MiniLM-L6-v2)
Reranker        cross-encoder/ms-marco-MiniLM-L-6-v2
Email           Resend
Auth            JWT (bcrypt + jsonwebtoken)
Deployment      Docker Compose (5 services)
=============== ============================================================

Project Structure
-----------------

::

   ├── client/                     # Next.js frontend
   │   └── src/
   │       ├── app/                # Pages (dashboard, auth, settings)
   │       ├── components/         # React components
   │       └── lib/                # Apollo Client, SSE hook, auth helpers
   ├── server/
   │   ├── ts_server/              # Node.js GraphQL gateway
   │   │   └── src/
   │   │       ├── index.ts        # Express app, proxy, worker init
   │   │       ├── graphql.ts      # Schema + resolvers
   │   │       ├── db.ts           # Sequelize models (10 tables)
   │   │       ├── queue.ts        # BullMQ queues + workers
   │   │       ├── sse.ts          # SSE manager (Redis pub/sub)
   │   │       ├── email.ts        # Transactional email templates
   │   │       └── authDirective.ts# @auth GraphQL directive
   │   └── fastapi_server/         # Python LangGraph engine
   │       └── app/
   │           ├── graph.py        # LangGraph pipeline (10 nodes)
   │           ├── agents/         # 14 agent modules
   │           ├── routers/        # 6 API routers
   │           ├── services/       # 10 service modules
   │           └── db.py           # SQLAlchemy models (18 tables)
   ├── docs/                       # Architecture documentation
   └── docker-compose.yml          # Full stack orchestration
