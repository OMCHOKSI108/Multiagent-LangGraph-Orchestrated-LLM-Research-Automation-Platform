Multi-Agent Pipeline
====================

The platform uses a **10-node LangGraph StateGraph** to orchestrate research. Each agent
is an async function that receives and returns a ``ResearchState`` TypedDict.

Agent Pipeline
--------------

.. code-block::

   planner
       │ Creates research plan + search queries (3-5)
       ▼
   searcher
       │ Searches web for each query, deduplicates (max 15 results)
       ▼
   crawler
       │ Crawls each URL via HTTPX/Playwright/PDF
       ▼
   extractor
       │ Extracts structured data (claims, stats, methods, limitations)
       ▼
   chunker
       │ Splits content, generates embeddings, stores in pgvector
       ▼
   reasoning
       │ Synthesizes key findings, detects contradictions
       ▼
   paper_writer
       │ Writes IEEE-style paper with sections I-IX (1500-3000 words)
       ▼
   citation
       │ Maps each claim in paper to source evidence
       ▼
   reviewer
       │ Reviews against IEEE criteria — scores 1-10, approves if >= 7
       │
       ├── approved ──> END
       │
       └── failed ──> revise ──> reviewer (loop, max 2 iterations)

Agent Reference
---------------

+-------------------+----------+-----------------------------------------------+
| Agent             | LLM Call | Purpose                                       |
+-------------------+----------+-----------------------------------------------+
| planner           | yes      | Create research plan + search queries          |
+-------------------+----------+-----------------------------------------------+
| searcher          | no       | Search web via Exa/Tavily/DuckDuckGo           |
+-------------------+----------+-----------------------------------------------+
| crawler           | yes      | Crawl pages, extract relevant content          |
+-------------------+----------+-----------------------------------------------+
| extractor         | yes      | Structured extraction (claims, stats, methods) |
+-------------------+----------+-----------------------------------------------+
| chunker           | no       | Splits text, generates embeddings              |
+-------------------+----------+-----------------------------------------------+
| reasoning         | yes      | Synthesize findings, detect contradictions     |
+-------------------+----------+-----------------------------------------------+
| paper_writer      | yes      | Write IEEE paper (streaming)                   |
+-------------------+----------+-----------------------------------------------+
| citation          | yes      | Map claims to source evidence                  |
+-------------------+----------+-----------------------------------------------+
| reviewer          | yes      | Score 1-10, approve if >= 7                    |
+-------------------+----------+-----------------------------------------------+
| revise            | yes      | Rewrite paper based on reviewer feedback       |
+-------------------+----------+-----------------------------------------------+

Additional standalone agents (not in the pipeline graph):

+-------------------+----------+-----------------------------------------------+
| Agent             | LLM Call | Purpose                                       |
+-------------------+----------+-----------------------------------------------+
| writer            | yes      | Alternative Markdown report writer             |
+-------------------+----------+-----------------------------------------------+
| chat_with_paper   | yes      | Conversational Q&A over generated paper        |
+-------------------+----------+-----------------------------------------------+
| paper_editor      | yes      | Version-based paper section editing            |
+-------------------+----------+-----------------------------------------------+
| image_searcher    | yes      | Search + caption images from source pages      |
+-------------------+----------+-----------------------------------------------+

Research State
--------------

The ``ResearchState`` TypedDict carries all state through the pipeline:

.. code-block:: python

   class ResearchState(TypedDict):
       question: str
       session_id: str | None
       job_id: str | None
       plan: str | None
       search_queries: list[str] | None
       search_results: list[dict] | None
       crawled_content: list[dict] | None
       analysis: str | None
       report: str | None
       review: str | None
       revision_count: int
       max_revisions: int
       status: str
       error: str | None
       extracted_data: list[dict] | None
       paper_id: str | None
       paper_title: str | None
       paper_abstract: str | None
       paper_sections: list[dict] | None
       citations: list[dict] | None
       key_findings: list[dict] | None
       db: Any
       images: list[dict] | None

Quality Pipeline
----------------

The RAG system implements a comprehensive quality pipeline:

#. **Query Rewrite** — LLM refines ambiguous queries into precise search terms
#. **Sub-question Generation** — breaks query into 2-3 specific sub-questions
#. **Hybrid Search** — vector + keyword with cross-encoder reranking
#. **Context Compression** — LLM extracts only relevant sentences from chunks
#. **Faithfulness Check** — verifies each claim in the answer against source context
#. **Reflexion Revision** — rewrites answer to remove unsupported claims
#. **Citation Validation** — post-generation scan strips invalid ``[N]`` references

This pipeline is exposed via:

* ``POST /api/rag/query`` — raw hybrid search
* ``POST /api/rag/enhanced-search`` — full pipeline through context compression
* ``POST /api/rag/answer`` — full pipeline + answer + verification
* ``POST /api/ai/generate`` — centralized generation (all overloads)
* Individual AI endpoints: ``/rewrite``, ``/sub-questions``, ``/context-compress``,
  ``/faithfulness-check``, ``/reflexion``
