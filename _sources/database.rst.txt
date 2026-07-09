Database Schema
===============

The platform uses **PostgreSQL 16** with **pgvector** for hybrid search. There are
**28 tables** across two schemas (Node.js Sequelize models + FastAPI SQLAlchemy models).

Schema Diagram
--------------

::

   Node.js Schema (10 tables)        FastAPI Schema (18 tables)
   ┌─────────────────────┐           ┌─────────────────────────┐
   │ users               │           │ research_sessions       │
   │ tokens              │           │ research_messages       │
   │ research_sessions   │           │ sources                 │
   │ sources             │           │ research_reports        │
   │ projects            │           │ research_jobs           │
   │ chat_sessions       │           │ research_plans          │
   │ chat_messages       │           │ research_tasks          │
   │ api_keys            │           │ document_chunks ←── pgvector │
   │ templates           │           │ evidence_items          │
   │ user_settings       │           │ key_findings            │
   └─────────────────────┘           │ raw_documents           │
                                     │ images                  │
                                     │ papers                  │
                                     │ paper_versions          │
                                     │ paper_sections          │
                                     │ citations               │
                                     │ paper_edits             │
                                     │ job_events              │
                                     │ token_usage             │
                                     └─────────────────────────┘

FastAPI SQLAlchemy Models (``app/db.py``)
------------------------------------------

Research Session
^^^^^^^^^^^^^^^^

.. code-block:: sql

   CREATE TABLE research_sessions (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id VARCHAR(255),
       title TEXT,
       status VARCHAR(50) DEFAULT 'in_progress'
           CHECK (status IN ('in_progress', 'completed', 'failed')),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

Sources
^^^^^^^

.. code-block:: sql

   CREATE TABLE sources (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       session_id UUID REFERENCES research_sessions(id),
       url TEXT,
       canonical_url TEXT,
       title TEXT,
       author VARCHAR(255),
       published_at TIMESTAMP,
       source_type VARCHAR(50),
       trust_score FLOAT DEFAULT 0.0,
       relevance_score FLOAT DEFAULT 0.0,
       freshness_score FLOAT DEFAULT 0.0,
       status VARCHAR(50) DEFAULT 'pending',
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

Document Chunks (with pgvector)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: sql

   CREATE TABLE document_chunks (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       session_id UUID REFERENCES research_sessions(id),
       source_id UUID REFERENCES sources(id),
       chunk_index INTEGER,
       section_title TEXT,
       chunk_text TEXT,
       chunk_summary TEXT,
       embedding VECTOR(384),              -- pgvector
       search_tsvector TSVECTOR,           -- PostgreSQL FTS
       meta_json JSONB DEFAULT '{}',
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- Indexes for hybrid search
   CREATE INDEX idx_document_chunks_embedding
       ON document_chunks USING hnsw (embedding vector_cosine_ops);
   CREATE INDEX idx_document_chunks_fts
       ON document_chunks USING gin (search_tsvector);

Papers
^^^^^^

.. code-block:: sql

   CREATE TABLE papers (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       session_id UUID UNIQUE REFERENCES research_sessions(id),
       title TEXT,
       abstract TEXT,
       status VARCHAR(50) DEFAULT 'draft',
       active_version_id UUID,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE paper_versions (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       paper_id UUID REFERENCES papers(id),
       version_number INTEGER NOT NULL,
       full_markdown TEXT,
       full_latex TEXT,
       change_summary TEXT,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(paper_id, version_number)
   );

   CREATE TABLE paper_sections (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       paper_id UUID REFERENCES papers(id),
       version_id UUID REFERENCES paper_versions(id),
       section_name VARCHAR(255),
       section_order INTEGER,
       content_markdown TEXT,
       content_latex TEXT,
       embedding VECTOR(384)
   );

Citations
^^^^^^^^^

.. code-block:: sql

   CREATE TABLE citations (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       paper_id UUID REFERENCES papers(id),
       session_id UUID REFERENCES research_sessions(id),
       version_id UUID REFERENCES paper_versions(id),
       section_id UUID REFERENCES paper_sections(id),
       source_id UUID REFERENCES sources(id),
       chunk_id UUID REFERENCES document_chunks(id),
       citation_number INTEGER,
       claim_text TEXT,
       citation_text TEXT,
       url TEXT,
       confidence_score FLOAT DEFAULT 0.5,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

Token Usage
^^^^^^^^^^^

.. code-block:: sql

   CREATE TABLE token_usage (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       session_id UUID REFERENCES research_sessions(id),
       provider VARCHAR(50),
       model VARCHAR(100),
       prompt_tokens INTEGER,
       completion_tokens INTEGER,
       total_tokens INTEGER,
       duration_ms INTEGER,
       agent_name VARCHAR(100),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

Relationship Summary
--------------------

::

   research_sessions
       │── research_messages     (one-to-many)
       │── sources               (one-to-many)
       │── research_reports      (one-to-one)
       │── research_jobs         (one-to-one)
       │── research_plans        (one-to-one)
       │── research_tasks        (one-to-many)
       │── document_chunks       (one-to-many)
       │── evidence_items        (one-to-many)
       │── key_findings          (one-to-many)
       │── images                (one-to-many)
       │── papers                (one-to-one)
       │── citations             (one-to-many)
       │── token_usage           (one-to-many)
       │── job_events            (one-to-many)

   sources
       │── document_chunks       (one-to-many)
       │── raw_documents         (one-to-one)
       │── evidence_items        (one-to-many)

   papers
       │── paper_versions        (one-to-many)
       │── paper_sections        (one-to-many)
       │── paper_edits           (one-to-many)
       │── citations             (one-to-many)
       active_version_id ──> paper_versions (one-to-one)

   paper_versions
       └── paper_sections        (one-to-many)

   document_chunks
       └── citations             (one-to-many)
