Yes. This is a **serious backend system**, not a simple chatbot. Build it like a **Deep Research + RAG + Paper Writer platform**.

The clean approach:

```text id="693i3l"
Next.js / Frontend
        ↓
Node.js Server = Product API, Auth, Jobs, Realtime, Billing, User Projects
        ↓
Redis Queue / BullMQ
        ↓
FastAPI Server = AI Agents, RAG, Scraping, Crawling, Embeddings, Paper Writing
        ↓
PostgreSQL + pgvector + Object Storage
```

Use **Node.js as the main backend gateway** and **FastAPI as the AI/research engine**.

---


Add SSE => 50 chunks generarted then start showing 4-4  so sse work 


# 1. Why Node Server + FastAPI Server?

## Node.js Server Responsibility

Node should handle product/backend logic:

```text id="cvacfy"
Auth
User projects
Chat sessions
Research job creation
Realtime progress using SSE / WebSocket
API key management
Rate limits
Frontend-facing APIs
Queue dispatch
Report versioning
Export requests
```

Node is good for real-time web apps and queue-based systems. BullMQ is a Redis-backed Node.js queue system designed for distributed jobs, retries, delayed jobs, priorities, concurrency, and horizontal workers. ([docs.bullmq.io][1])

## FastAPI Server Responsibility

FastAPI should handle AI-heavy work:

```text id="174wke"
Planner agent
Search agent
Crawler agent
Scraper agent
Raw page extractor
Embedding pipeline
RAG retrieval
Reasoning agent
Citation agent
Paper writer agent
Paper editor agent
Chat-with-paper agent
```

FastAPI is production-ready for Python APIs, and it supports async APIs and WebSockets, but for long research jobs you should still use an external queue instead of relying only on in-process background tasks. FastAPI background tasks are mainly for tasks that run after returning a response, not as a full production job system. ([FastAPI][2])

---

# 2. Main Architecture

```text id="m97x89"
                    ┌────────────────────────┐
                    │       Frontend          │
                    │ Chat + Research UI      │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │      Node Server        │
                    │ Auth, Jobs, SSE, APIs   │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ Redis Queue / BullMQ    │
                    │ research_job_queue      │
                    │ scrape_queue            │
                    │ embedding_queue         │
                    │ paper_queue             │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │      FastAPI Server     │
                    │ Multi-Agent AI Engine   │
                    └───────────┬────────────┘
                                │
        ┌───────────────────────┼────────────────────────┐
        ▼                       ▼                        ▼
┌──────────────┐       ┌─────────────────┐       ┌────────────────┐
│ PostgreSQL   │       │ pgvector         │       │ Object Storage │
│ Metadata     │       │ Embeddings       │       │ HTML/PDF/Image │
└──────────────┘       └─────────────────┘       └────────────────┘
```

---

# 3. Multi-Agent System Design

Do **not** make each agent a separate microservice in MVP. Make each agent a **logical worker class** inside FastAPI.

## Agents You Need

### 1. Planner Agent

Input:

```text id="c986en"
User prompt:
"Write IEEE-style paper on multi-agent RAG systems"
```

Output:

```json id="gc7p1h"
{
  "research_goal": "Understand multi-agent RAG systems",
  "steps": [
    "Define multi-agent RAG architecture",
    "Search recent papers and technical blogs",
    "Compare orchestration methods",
    "Extract system design patterns",
    "Generate IEEE-style paper"
  ],
  "search_queries": [
    "multi agent RAG architecture 2026",
    "agentic RAG survey paper",
    "LLM research agent architecture",
    "pgvector production RAG PostgreSQL"
  ]
}
```

This agent converts user intent into a research plan.

---

### 2. Search Agent

Searches:

```text id="9jh641"
Web search
Academic search
PDF search
GitHub search
Company docs
Image search
```

Use APIs where possible. For Google images, do **not** directly scrape Google Images pages. Use Google Custom Search JSON API, SerpAPI, Bing Image Search, Brave Search, Tavily, or another search API. Google’s Custom Search JSON API officially supports programmatic web and image search results in JSON format, but it requires a Programmable Search Engine and API key; Google also notes existing customers must transition by January 1, 2027, so you should design a provider abstraction instead of locking into one search API. ([Google for Developers][3])

---

### 3. Crawler Agent

This agent manages URLs.

Responsibilities:

```text id="q013yu"
Take search result URLs
Normalize URLs
Remove duplicates
Respect robots.txt
Apply domain rate limits
Prioritize official/reliable sources
Detect PDF/HTML/image/document pages
Send URLs to scraper queue
```

Crawler should not blindly crawl the full internet. It should crawl with a **depth limit**.

Example:

```text id="msd031"
Depth 0: Search result page URL
Depth 1: Links from same article
Depth 2: Only if user selected Deep Research
```

---

### 4. Scraper Agent

Scraper fetches raw pages.

Use:

```text id="rvylai"
HTTP client for normal HTML
Playwright for JavaScript-heavy pages
PDF parser for PDFs
Image metadata extractor for images
Readability extractor for article body
```

Playwright supports browser automation across Chromium, Firefox, and WebKit, and its Python docs also mention scripting and AI-agent workflows; for scraping/crawling in Docker, Playwright recommends using a separate user and seccomp profile. ([Playwright][4])

Scraper output:

```json id="ydx1qq"
{
  "url": "https://example.com/paper",
  "title": "Agentic RAG Systems",
  "raw_html": "...",
  "clean_text": "...",
  "published_at": "2026-05-01",
  "author": "Example Author",
  "source_type": "article",
  "status": "fetched"
}
```

---

### 5. Extraction Agent

This converts messy raw pages into structured research data.

Extract:

```text id="soqg73"
Title
Author
Published date
Main body
Headings
Tables
Figures
Images
Claims
Statistics
Definitions
Methods
Limitations
References
```

Important: store both:

```text id="c3w6sm"
raw_html / raw_pdf
clean_text
structured_json
```

Why? Because later you may need citation verification.

---

### 6. Chunking + Embedding Agent

This prepares data for RAG.

Use:

```text id="s6su1t"
Semantic chunking
Heading-aware chunking
Table-aware chunking
Citation-aware chunking
Code-block-aware chunking
```

Bad chunking:

```text id="r970z2"
Every 1000 characters blindly
```

Good chunking:

```text id="rhwzty"
Section title + paragraph group + source metadata + neighboring context
```

Store embeddings in `pgvector`. pgvector supports exact and approximate nearest-neighbor search, multiple vector types, cosine/L2/inner-product distance, HNSW/IVFFlat-style indexing, and lets you keep vectors together with normal Postgres data. ([GitHub][5])

---

### 7. Reasoning Agent

This agent does not browse. It reasons over extracted evidence.

Responsibilities:

```text id="i5zn2w"
Cluster similar findings
Detect repeated claims
Detect contradictions
Rank source quality
Build key findings
Build comparison tables
Create research gaps
Generate final thesis/argument
```

Output:

```json id="7bqqw4"
{
  "key_findings": [
    {
      "finding": "Production RAG requires metadata filtering, reranking, and citation grounding.",
      "evidence_chunk_ids": ["chunk_11", "chunk_29", "chunk_44"],
      "confidence": 0.87
    }
  ]
}
```

---

### 8. Citation Agent

This is critical.

Every important claim should map to:

```text id="uz3i3c"
source_id
chunk_id
URL
title
published date
quote span
confidence score
```

Without this, your “IEEE paper” will hallucinate.

---

### 9. Paper Writer Agent

Generates IEEE-style paper.

Sections:

```text id="2jshq6"
Title
Abstract
Keywords
I. Introduction
II. Literature Review
III. Proposed Architecture
IV. Methodology
V. System Implementation
VI. Evaluation
VII. Results and Discussion
VIII. Limitations
IX. Conclusion
References
```

This agent should write from the **Evidence Ledger**, not directly from random context.

---

### 10. Reviewer Agent

Checks paper quality.

It should verify:

```text id="5d4owk"
Are claims cited?
Are references real?
Are sections logically connected?
Is the paper too generic?
Are there unsupported statements?
Does abstract match conclusion?
Are images/tables relevant?
```

---

### 11. Chat-with-Paper Agent

After paper is generated, user can ask:

```text id="04hf1y"
Explain section 3.
Add more technical depth.
Convert methodology into diagram.
Find weak citations.
Rewrite abstract.
```

This uses RAG over:

```text id="w1y0s8"
Generated paper sections
Original sources
Evidence chunks
Citations
User edits
Version history
```

---

### 12. Paper Editor Agent

Editing should be version-based.

Do not overwrite the paper directly.

Flow:

```text id="psexq2"
User asks edit
→ Retrieve relevant paper sections
→ Retrieve original evidence
→ Generate patch/diff
→ Save new paper version
→ User can accept/reject
```

---

# 4. Full Research Flow

```text id="3cr5s3"
1. User creates research request
2. Node creates research_job
3. Node pushes job to Redis/BullMQ
4. FastAPI Planner Agent creates plan
5. Search Agent generates search queries
6. Crawler Agent collects URLs
7. Scraper Agent fetches raw pages/PDFs/images
8. Extractor Agent cleans and structures data
9. Chunking Agent creates RAG chunks
10. Embedding Agent stores vectors in pgvector
11. Reasoning Agent creates findings
12. Citation Agent maps findings to evidence
13. Paper Writer Agent writes IEEE paper
14. Reviewer Agent improves paper
15. Node streams progress to frontend
16. User chats with paper
17. Paper Editor Agent creates new paper versions
```

---

# 5. PostgreSQL + pgvector Database Design

Use **PostgreSQL as the main database**. Use `pgvector` inside the same database for MVP.

## Core Tables

```sql id="spo32h"
users
projects
chat_sessions
messages
research_jobs
research_plans
research_tasks
sources
raw_documents
document_chunks
images
evidence_items
key_findings
papers
paper_sections
paper_versions
paper_edits
citations
api_keys
job_events
```

---

## Important Tables

### users

```sql id="yfi9r6"
id
name
email
password_hash
created_at
```

---

### projects

```sql id="zwbk1r"
id
user_id
title
description
created_at
updated_at
```

One user can have many research projects.

---

### research_jobs

```sql id="5coftn"
id
project_id
user_id
topic
depth                  -- fast / balanced / deep
status                 -- planning/searching/scraping/reasoning/writing/completed/failed
model_provider         -- openrouter/groq/openai/local
created_at
started_at
completed_at
error_message
```

---

### research_plans

```sql id="3r6b0g"
id
job_id
plan_json
approved_by_user
created_at
updated_at
```

---

### research_tasks

```sql id="4n1bce"
id
job_id
task_title
task_type              -- search/scrape/extract/embed/reason/write/review
status
priority
started_at
completed_at
metadata_json
```

---

### sources

```sql id="e9xe4h"
id
job_id
url
canonical_url
title
author
published_at
source_type            -- webpage/pdf/github/image/video
trust_score
relevance_score
freshness_score
status
created_at
```

---

### raw_documents

```sql id="yjcdq9"
id
source_id
raw_html
raw_text
clean_text
content_hash
language
token_count
object_storage_path
created_at
```

For big HTML/PDF, better store in S3/R2/local object storage and keep path in DB.

---

### document_chunks

```sql id="ud1o2t"
id
source_id
document_id
job_id
chunk_index
section_title
chunk_text
chunk_summary
embedding vector(1536)
metadata jsonb
created_at
```

Index:

```sql id="8i87lm"
CREATE INDEX document_chunks_embedding_idx
ON document_chunks
USING hnsw (embedding vector_cosine_ops);
```

Also add full-text search:

```sql id="c622lp"
search_tsvector tsvector
```

Why? Best RAG should use **hybrid retrieval**:

```text id="dtmzys"
Vector search + keyword search + metadata filters + reranking
```

---

### images

```sql id="0b5hot"
id
job_id
source_id
image_url
thumbnail_url
context_url
alt_text
width
height
license_info
local_storage_path
relevance_score
created_at
```

For Google images, store `contextLink`, image dimensions, thumbnail, and license/rights metadata when available. Google’s Custom Search image result schema includes image metadata such as context page URL, height, and width. ([Google for Developers][6])

---

### evidence_items

This is one of the most important tables.

```sql id="2em3jc"
id
job_id
source_id
chunk_id
claim
supporting_text
evidence_type          -- definition/statistic/method/result/opinion
confidence_score
created_at
```

---

### key_findings

```sql id="dbm1ca"
id
job_id
finding_title
finding_text
confidence_score
evidence_item_ids jsonb
created_at
```

---

### papers

```sql id="juh1ek"
id
project_id
job_id
title
abstract
status
active_version_id
created_at
updated_at
```

---

### paper_versions

```sql id="dm5iud"
id
paper_id
version_number
full_markdown
full_latex
change_summary
created_at
```

---

### paper_sections

```sql id="9du0eg"
id
paper_id
version_id
section_name
section_order
content_markdown
content_latex
embedding vector(1536)
created_at
```

---

### citations

```sql id="0xzd11"
id
paper_id
version_id
section_id
source_id
chunk_id
citation_number
claim_text
citation_text
url
created_at
```

---

# 6. RAG Quality Grade Design

Your RAG should not be basic.

## Bad RAG

```text id="1l5bsn"
Embed chunks
Retrieve top 5
Send to LLM
Generate answer
```

This gives hallucination.

## Quality-Grade RAG

```text id="1n3jp9"
Query understanding
Query decomposition
Hybrid retrieval
Metadata filtering
Reranking
Context compression
Citation grounding
Answer generation
Faithfulness check
Source confidence scoring
```

---

## RAG Pipeline

```text id="xjy2im"
User question
   ↓
Query Rewriter Agent
   ↓
Sub-question Generator
   ↓
Hybrid Retriever
   ↓
Reranker
   ↓
Context Compressor
   ↓
Citation Mapper
   ↓
Answer Generator
   ↓
Verifier Agent
   ↓
Final Answer
```

---

## Retrieval Strategy

Use 4 retrieval methods together:

```text id="ysga15"
1. pgvector semantic search
2. PostgreSQL full-text search
3. Metadata filtering
4. Reranker model
```

Example:

```text id="eh9r5z"
User asks:
"What are the limitations of the proposed architecture?"

System retrieves from:
- Paper limitations section
- Original source chunks
- Reviewer comments
- Evidence items related to limitations
```

---

# 7. External API Design: OpenRouter + Groq

Create one internal abstraction:

```text id="c0s9lc"
LLMProviderService
```

Do not call OpenRouter/Groq directly everywhere.

```text id="j6i610"
LLMProviderService
   ├── OpenRouterClient
   ├── GroqClient
   ├── OpenAIClient
   ├── GeminiClient
   └── LocalModelClient
```

OpenRouter normalizes access across many models/providers with an API schema very similar to OpenAI Chat API, which makes it useful as a multi-model gateway. ([OpenRouter][7]) Groq exposes an OpenAI-compatible chat completions endpoint at `/openai/v1/chat/completions`, so it can fit into the same provider abstraction. ([GroqCloud][8])

## Suggested Use

```text id="r3fvod"
Groq:
Fast summarization
Fast extraction
Quick classification
Cheap intermediate reasoning

OpenRouter:
Access to stronger models
Fallback provider
Paper writing
Complex reasoning
Reviewer agent
```

## API Key Storage

Never store raw API keys directly.

Use:

```text id="nc815v"
api_keys table
encrypted_key
provider
user_id
last_used_at
usage_limit
```

---

# 8. Queues You Should Create

```text id="28qe9j"
research.plan.queue
research.search.queue
research.crawl.queue
research.scrape.queue
research.extract.queue
research.embed.queue
research.reason.queue
research.paper.queue
research.review.queue
```

For MVP, you can reduce:

```text id="predu8"
research_queue
scrape_queue
embedding_queue
paper_queue
```

BullMQ supports retries and backoff for failed jobs, so use retries for scraping, extraction, embeddings, and paper generation. ([docs.bullmq.io][9])

---

# 9. API Endpoints

## Node Server APIs

```text id="nr8m04"
POST   /api/auth/register
POST   /api/auth/login

POST   /api/projects
GET    /api/projects
GET    /api/projects/:id

POST   /api/research-jobs
GET    /api/research-jobs/:id
GET    /api/research-jobs/:id/events
POST   /api/research-jobs/:id/approve-plan

GET    /api/papers/:id
POST   /api/papers/:id/chat
POST   /api/papers/:id/edit
GET    /api/papers/:id/versions
POST   /api/papers/:id/export

POST   /api/settings/keys
GET    /api/settings/keys
DELETE /api/settings/keys/:id
```

## FastAPI Internal APIs

```text id="32m0i0"
POST /internal/agents/plan
POST /internal/agents/search
POST /internal/agents/scrape
POST /internal/agents/extract
POST /internal/agents/embed
POST /internal/agents/reason
POST /internal/agents/write-paper
POST /internal/agents/review-paper
POST /internal/rag/query
```

FastAPI should be private/internal. Frontend should not directly call FastAPI.

---

# 10. How Images Should Work

User asks:

```text id="3el3ep"
Gather images for IEEE paper on AI research agents
```

Flow:

```text id="wo5v6b"
Image Search Agent
   ↓
Google Custom Search / Bing / SerpAPI
   ↓
Store image metadata
   ↓
Visit image context page
   ↓
Check relevance + license
   ↓
Generate caption
   ↓
Attach to paper section
```

Do not blindly download and reuse random copyrighted images. Better options:

```text id="zty6t2"
Use images from official docs
Use open-license images
Generate your own diagrams
Use user-approved image URLs
Store source attribution
```

For IEEE-style papers, the safest approach is to generate your own architecture diagrams instead of using random Google images.

---

# 11. How “Key Findings” Are Generated

Do not ask LLM directly:

```text id="jr0jag"
"Give key findings"
```

Instead:

```text id="atq1mj"
1. Extract claims from every source
2. Cluster similar claims
3. Rank by source trust
4. Check if multiple sources support same claim
5. Detect contradictions
6. Generate finding
7. Attach evidence IDs
```

Example key finding object:

```json id="nbl510"
{
  "title": "Hybrid retrieval improves RAG reliability",
  "finding": "A production-grade RAG system should combine vector retrieval, keyword search, metadata filtering, and reranking instead of relying only on embeddings.",
  "confidence": 0.91,
  "evidence": ["evidence_101", "evidence_119", "evidence_203"]
}
```

---

# 12. Paper Generation Flow

```text id="xk1zu6"
Evidence Items
   ↓
Key Findings
   ↓
Paper Outline
   ↓
Section Drafting
   ↓
Citation Injection
   ↓
Reviewer Agent
   ↓
Final IEEE Paper
   ↓
Version Save
```

The paper writer should never invent references. It should only use sources present in the `sources`, `chunks`, and `citations` tables.

---

# 13. Chat With Paper

When user asks:

```text id="8msi6j"
"Why did you say pgvector is good for this architecture?"
```

Retrieve from:

```text id="o241g6"
paper_sections
citations
source_chunks
evidence_items
```

Then answer:

```text id="kzc6p8"
In Section III, the paper recommends pgvector because...
This is supported by source chunks X, Y, Z.
```

---

# 14. Edit Paper

User:

```text id="0a8mch"
"Make the abstract more professional and add more about multi-agent orchestration."
```

Backend flow:

```text id="ebdynu"
1. Load active paper version
2. Retrieve Abstract section
3. Retrieve related evidence about multi-agent orchestration
4. Generate edited abstract
5. Run citation check
6. Save new paper_version
7. Return diff
```

Response should include:

```text id="9pljm6"
Old text
New text
Change summary
Citations affected
Accept / Reject option
```

---

# 15. Best MVP Build Order

Do not build everything at once.

## Phase 1: AI Chat Backend

```text id="qionyb"
Node auth
Chat sessions
Messages
OpenRouter/Groq provider abstraction
Basic streaming response
PostgreSQL storage
```

## Phase 2: Research Job System

```text id="vm5wp3"
Research job table
BullMQ queue
FastAPI worker
Planner agent
Progress events
```

## Phase 3: Web Search + Scraping

```text id="28w7pq"
Search API integration
Crawler
Scraper
HTML cleaner
PDF extractor
Source table
```

## Phase 4: RAG

```text id="ta1n49"
Chunking
Embeddings
pgvector
Hybrid retrieval
Reranking
Citation mapping
```

## Phase 5: Deep Research

```text id="6v2p8s"
Reasoning agent
Key findings
Contradiction detection
Source scoring
Research summary
```

## Phase 6: IEEE Paper Writer

```text id="3ygzp5"
Paper outline
Section writer
Citation manager
Reviewer agent
Version history
Export markdown/PDF/LaTeX
```

## Phase 7: Chat + Edit Paper

```text id="7xo0wf"
Chat with generated paper
Edit section
Save versions
Show diff
Regenerate section
```

---

# 16. Final Recommended Stack

```text id="1efb1m"
Node.js:
Express or NestJS
Prisma / Drizzle
BullMQ
Redis
Socket.IO or SSE
JWT auth

FastAPI:
LangGraph or custom agent graph
Pydantic
Playwright
BeautifulSoup / Readability
PyMuPDF
SentenceTransformers or API embeddings
Reranker model
OpenRouter client
Groq client

Database:
PostgreSQL
pgvector
JSONB
Full-text search

Storage:
Cloudflare R2 / S3 / local MinIO

Search:
Tavily / Brave / SerpAPI / Google Custom Search / Bing Search

Observability:
Job events table
Structured logs
Token usage table
Source fetch logs
```

---

# 17. The Core Design Rule

The system should not work like this:

```text id="75mjvh"
User prompt → LLM → Final answer
```

It should work like this:

```text id="cjykpu"
User prompt
→ Research plan
→ Search
→ Crawl
→ Scrape
→ Extract
→ Chunk
→ Embed
→ Retrieve
→ Reason
→ Cite
→ Write paper
→ Review
→ Save version
→ Chat/Edit with RAG
```

That is the real difference between a normal AI chatbot backend and a **Deep Research agent backend**.

[1]: https://docs.bullmq.io/?utm_source=chatgpt.com "What is BullMQ | BullMQ"
[2]: https://fastapi.tiangolo.com/?utm_source=chatgpt.com "FastAPI - FastAPI"
[3]: https://developers.google.com/custom-search/v1/overview?utm_source=chatgpt.com "Custom Search JSON API"
[4]: https://playwright.dev/python/?utm_source=chatgpt.com "Fast and reliable end-to-end testing for modern web apps"
[5]: https://github.com/pgvector/pgvector?utm_source=chatgpt.com "GitHub - pgvector/pgvector: Open-source vector similarity search for Postgres · GitHub"
[6]: https://developers.google.com/custom-search/v1/reference/rest/v1/Search?utm_source=chatgpt.com "Custom Search JSON API | Google for Developers"
[7]: https://openrouter.ai/docs/api/reference/overview?utm_source=chatgpt.com "OpenRouter API Reference | Complete API Documentation | OpenRouter | Documentation"
[8]: https://console.groq.com/docs/api-reference?utm_source=chatgpt.com "API Reference - GroqDocs"
[9]: https://docs.bullmq.io/guide/retrying-failing-jobs?utm_source=chatgpt.com "Retrying failing jobs"
