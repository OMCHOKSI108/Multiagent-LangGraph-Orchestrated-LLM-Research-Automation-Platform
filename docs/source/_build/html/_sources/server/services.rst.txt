Service Layer
=============

The FastAPI server provides **10 service modules** that encapsulate core functionality.

LLM Provider Abstraction (``providers.py``)
--------------------------------------------

.. code-block::

   LLMProviderService (ABC)
       ├── GroqClient          — via langchain-groq (llama-3.1-8b-instant)
       ├── OpenRouterClient    — via httpx OpenAI-compatible API
       ├── OpenAIClient        — stub for future use
       ├── GeminiClient        — stub for future use
       └── LocalModelClient    — stub for future use (Ollama)

   ProviderRegistry
       └── get_providers()     — ordered list with Groq first, OpenRouter fallback

Centralized Generator (``generator.py``)
-----------------------------------------

The ``BaseGenerator`` supports **method overloading** — the ``generate()`` method
accepts three call patterns:

.. code-block:: python

   gen.generate(prompt="What is RAG?")
   gen.generate(system_prompt="You are...", user_prompt="Explain RAG")
   gen.generate(messages=[{"role": "user", "content": "..."}])

Subclasses provide **method overriding** for custom behavior:

+--------------------+--------------------------------------------------+
| Subclass           | Override                                         |
+--------------------+--------------------------------------------------+
| StreamingGenerator | Forces streaming via ``generate_stream()``        |
+--------------------+--------------------------------------------------+
| TrackingGenerator  | Auto-tracks token usage to DB                    |
+--------------------+--------------------------------------------------+
| FaithfulGenerator  | Appends faithfulness verification + reflexion    |
+--------------------+--------------------------------------------------+

Module-level singletons: ``gen``, ``streaming_gen``, ``tracking_gen``, ``faithful_gen``.

RAG Engine (``rag.py``)
------------------------

+----------------------------+--------------------------------------------------+
| Function                   | Description                                      |
+----------------------------+--------------------------------------------------+
| ``hybrid_search()``        | Vector (pgvector cosine) + keyword (FTS) +       |
|                            | cross-encoder reranking                          |
+----------------------------+--------------------------------------------------+
| ``enhanced_rag_search()``  | Query rewrite → sub-questions → hybrid search    |
|                            | → context compression                            |
+----------------------------+--------------------------------------------------+
| ``rag_answer_with_verification()``| Full pipeline → answer → faithfulness check   |
|                            | → reflexion revision                             |
+----------------------------+--------------------------------------------------+
| ``validate_citations()``   | Strips ``[N]`` references beyond available sources|
+----------------------------+--------------------------------------------------+
| ``rewrite_query()``        | LLM-based query refinement                       |
+----------------------------+--------------------------------------------------+
| ``sub_question_generation()``| Breaks query into 2-3 sub-questions            |
+----------------------------+--------------------------------------------------+
| ``context_compress()``     | LLM-based relevant-sentence extraction           |
+----------------------------+--------------------------------------------------+
| ``faithfulness_check()``   | Verifies answer claims against source context    |
+----------------------------+--------------------------------------------------+
| ``reflexion_revise()``     | Rewrites answer to remove unsupported claims     |
+----------------------------+--------------------------------------------------+

Web Search (``search.py``)
---------------------------

+-----------------+----------------------------------------------------+
| Provider        | Implementation                                     |
+-----------------+----------------------------------------------------+
| Exa             | exa-py SDK (primary)                               |
+-----------------+----------------------------------------------------+
| Tavily          | tavily-python SDK                                  |
+-----------------+----------------------------------------------------+
| DuckDuckGo      | duckduckgo-search (fallback)                       |
+-----------------+----------------------------------------------------+
| SearchSpace     | Custom search API                                  |
+-----------------+----------------------------------------------------+

``search_web()`` dispatches to the configured provider. ``crawl_pages()`` uses
asyncio semaphore for concurrent crawling.

Web Scraper (``scraper.py``)
-----------------------------

Three scraping strategies with automatic selection:

+------------+--------------------------+------------------------------------+
| Strategy   | Used When                | Library                            |
+------------+--------------------------+------------------------------------+
| HTTPX      | Static HTML pages         | httpx + BeautifulSoup + lxml       |
+------------+--------------------------+------------------------------------+
| Playwright | JS-heavy / SPA sites      | playwright (headless Chromium)     |
+------------+--------------------------+------------------------------------+
| PyMuPDF    | PDF files                 | fitz (PyMuPDF)                     |
+------------+--------------------------+------------------------------------+

The scraper auto-detects SPA indicators (``__NEXT_DATA__``, ``__NUXT__``, etc.)
and known JS-heavy domains. Falls back to Playwright if HTTPX fails.

Embeddings (``embeddings.py``)
-------------------------------

* **Local**: SentenceTransformer (``all-MiniLM-L6-v2``, 384-dim)
* **OpenAI**: ``text-embedding-3-small`` via OpenAI-compatible API
* Lazy-loads encoder on first use

Chunking (``chunking.py``)
---------------------------

* Heading-aware splitting
* Paragraph-based chunking with configurable size/overlap
* Sentence-aware long paragraph splitting

Progress Emitter (``progress.py``)
------------------------------------

Publishes progress events and tokens to Redis pub/sub channels:

* ``research:progress:{job_id}`` — progress updates
* ``research:tokens:{job_id}`` — token-level streaming
