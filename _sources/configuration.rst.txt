Configuration
=============

All configuration is via environment variables. A single ``.env`` file at the project root
is shared by all services via Docker Compose.

Core Settings
-------------

.. code-block:: ini

   # Application
   APP_URL=http://localhost:3000
   JWT_SECRET=your_64_char_secret_here
   LOG_LEVEL=info

   # PostgreSQL
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=deep_research
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432

   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379

LLM Provider Settings
---------------------

.. code-block:: ini

   # Provider selection
   DEFAULT_LLM_PROVIDER=groq          # groq | openrouter

   # Groq
   GROQ_API_KEY=gsk_your_key
   GROQ_MODEL=llama-3.1-8b-instant

   # OpenRouter (fallback)
   OPENROUTER_API_KEY=sk-or-your-key
   OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct

   LLM_REQUEST_TIMEOUT=60
   LLM_CONTEXT_MESSAGES=20

Search Provider Settings
------------------------

.. code-block:: ini

   WEB_SEARCH_PROVIDER=exa             # exa | tavily | duckduckgo

   # Exa
   EXA_API_KEY=your_exa_key
   EXA_MAX_SEARCH_RESULTS=10

   # Tavily
   TAVILY_API_KEY=your_tavily_key

   # Web crawling
   WEB_CRAWL_MAX_PAGES=10
   WEB_CRAWL_TIMEOUT=30
   WEB_CHUNK_SIZE_CHARS=4000

RAG Settings
------------

.. code-block:: ini

   # Embeddings
   EMBEDDING_PROVIDER=local            # local | openai
   EMBEDDING_MODEL=all-MiniLM-L6-v2
   EMBEDDING_DIM=384

   # Retrieval
   TOP_K_RETRIEVAL=10
   MIN_RETRIEVAL_SCORE=0.15

   # Chunking
   CHUNK_SIZE=1000
   CHUNK_OVERLAP=200

Feature Flags
-------------

.. code-block:: ini

   ENABLE_DOCUMENT_RAG=true
   ENABLE_WEB_RESEARCH=true
   ENABLE_RESEARCH_PROJECTS=true
   ENABLE_DRAFT_WRITER=true
   ENABLE_LATEX=false
   ENABLE_VOICE=false
   ENABLE_JOBS=true
   ENABLE_SCHEDULER=false
   ENABLE_NOTIFICATIONS=false
   ENABLE_EVALUATION=false

Email Settings
--------------

.. code-block:: ini

   RESEND_API_KEY=re_your_key
   EMAIL_FROM="Multiagent Research Automation Platform <noreply@yourdomain.com>"

Node Server Settings
--------------------

.. code-block:: ini

   NODE_PORT=4000
   FASTAPI_URL=http://localhost:8000
   CORS_ORIGIN=http://localhost:3000

Client Settings
---------------

.. code-block:: ini

   NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_SSE_URL=http://localhost:4000
