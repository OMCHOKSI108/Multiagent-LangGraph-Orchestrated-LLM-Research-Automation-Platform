# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Multi-Agent LLM Research Automation Platform — a three-tier system (AI Engine + Backend + Frontend) that orchestrates 20+ specialized AI agents via LangGraph to perform automated academic research: topic discovery, literature review, paper analysis, verification, report generation, and interactive chatbot Q&A.

## Architecture

### Three Services + Worker

- **AI Engine** (`ai_engine/`) — Python/FastAPI on port 8000. Hosts all AI agents, the LangGraph research pipeline, LLM provider abstraction, vector store, and search providers.
- **Backend** (`backend/`) — Node.js/Express on port 5000. Handles auth (JWT + OAuth), PostgreSQL persistence, SSE event streaming, job queue management, and proxies research requests to the AI Engine.
- **Worker** (`backend/worker.js`) — Polls PostgreSQL for queued research jobs and dispatches them to the AI Engine's `/research` endpoint. Uses PG LISTEN/NOTIFY with polling fallback. Only processes `trigger_source = 'user'` jobs.
- **Frontend** (`frontend/`) — React/TypeScript/Vite on port 3000. Uses Zustand for state management, Tailwind CSS, Radix UI, and react-router-dom with HashRouter.

### AI Engine Internals

**LLM Provider Factory** (`ai_engine/llm/factory.py`): Dual-mode switching controlled by `LLM_STATUS` env var:
- `OFFLINE` → Ollama (local models), falls back to Groq if unreachable
- `ONLINE` → Routes to Groq/OpenRouter/Gemini based on model prefix or key availability

Providers are cached as singletons keyed by `(mode, model_name)`. Supports multi-key rotation for all cloud providers.

**Four specialized model slots** defined in `ai_engine/config.py`:
- `MODEL_REASONING` — logic/planning (default: phi3:mini)
- `MODEL_WRITING` — prose generation (default: gemma2:2b)
- `MODEL_CODING` — code/JSON tasks (default: qwen2.5-coder:1.5b)
- `MODEL_CRITICAL` — critique/verification (default: phi3:mini)

**Agent System** (`ai_engine/agents/`):
- `base.py` — `BaseAgent` class handles LLM invocation, JSON extraction from responses, deterministic caching (SHA-256 of prompt+model+context), token tracking, context truncation, and event emission.
- `registry.py` — Lazy-loading registry (`_LazyAgent` proxy). Agents are not instantiated until first use. Each agent maps to a module under `ai_engine/agents/<category>/`.
- All agents return `{"response": ..., "raw": ..., "agent": ..., "execution_time": ...}`. Output is always attempted to be parsed as JSON; falls back to `{"raw_text": ...}`.

**LangGraph Pipeline** (`ai_engine/graph/full_pipeline.py`):
- Entry point: `topic_discovery` → `topic_lock` (gate: must lock topic before proceeding)
- Orchestrator routes to Pipeline A (domain research) or Pipeline B (paper analysis)
- **Pipeline A**: `domain_intelligence` → [parallel: `historical_review`, `slr`, `news`] → `gap_synthesis` → `innovation`
- **Pipeline B**: `paper_decomposition` → `understanding` → `technical_verification` → `critique`
- Both converge to: `visualization` → `scoring` → `multi_stage_report` → END
- LaTeX-writing nodes use document locking (`utils/document_lock.py`) to prevent parallel writes
- State uses `Annotated[Dict, merge_dicts]` reducer for parallel agent findings

**State Store** (`ai_engine/state_store.py`): Redis-backed with in-memory fallback. Provides a `_StateProxy` dict wrapper for backward compatibility with old `RESEARCH_STATES` global dict pattern.

### Backend Internals

- PostgreSQL schema in `backend/database/schema.sql`, migrations in `backend/migrations/` (numbered 000-009)
- Auth: JWT tokens via `backend/middleware/auth.js`, OAuth (Google, GitHub) via Passport
- SSE event streaming at `/events/stream` for live research progress
- Routes: auth, research, chat, events, agents, workspace, export, memory, usage

### Frontend Internals

- Single Zustand store (`frontend/store.ts`) manages all state: auth, research jobs, chat, SSE events, workspaces, memories
- API layer in `frontend/services/api.ts` wraps all backend calls
- Pages: LandingPage, Dashboard, Workspace (research detail), WorkspaceListPage, WorkspaceDetailPage, Profile, SharedView
- SSE subscription with automatic reconnection for live research progress
- Auto-generates API keys on first research creation

## Build and Run Commands

### Start All Services (Windows)
```
python run.py --on
```

### Start All Services Individually
```
# AI Engine (activate venv first)
cd ai_engine && .\venv\Scripts\activate && uvicorn main:app --reload --port 8000

# Backend
cd backend && npm start        # or: npm run dev (with nodemon)

# Worker
cd backend && npm run worker   # or: npm run worker:dev

# Frontend
cd frontend && npm run dev
```

### Install Dependencies
```
# AI Engine
cd ai_engine && pip install -r requirements.txt

# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### Build Frontend
```
cd frontend && npm run build
```

### Run Tests (AI Engine)
```
# All tests
cd ai_engine && python -m pytest tests/ -v

# Single test file
cd ai_engine && python -m pytest tests/test_pipelines.py -v

# Single test
cd ai_engine && python -m pytest tests/test_pipelines.py::TestNodeFunctions::test_orchestrator_node -v
```

### Database
```
# Apply full schema (fresh DB)
psql -U <user> -d research_platform -f backend/database/schema.sql

# Run a specific migration
node backend/scripts/run-migration.js
```

### Stop All Services (Windows)
```
python run.py --off
```

## Environment Configuration

Each service has its own `.env` file (`ai_engine/.env`, `backend/.env`, `frontend/.env`). See `.env.example` at the project root for all variables.

Key variables:
- `LLM_STATUS` — `OFFLINE` (Ollama) or `ONLINE` (cloud APIs)
- `AI_ENGINE_SECRET` — shared secret between backend and AI engine (header: `X-API-Key`)
- `DATABASE_URL` or split `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`
- `GROQ_API_1`/`_2`/`_3`, `OPENROUTER_API_1`/`_2`/`_3`, `GEMINI_API_1`/`_2`/`_3` — multi-key rotation
- `REDIS_URL` — optional, enables Redis-backed state store and worker notifications

## Key Conventions

- AI Engine agents are registered in `ai_engine/agents/registry.py`. To add a new agent: create a module under `ai_engine/agents/<category>/`, subclass `BaseAgent`, and add a `_lazy()` entry to the `AGENTS` dict.
- All LLM calls go through `llm/factory.py` → provider → LangChain LLM. Never instantiate LLMs directly.
- Agent results are cached to disk in `ai_engine/cache/` (JSON files keyed by SHA-256 hash). Delete cache files to force re-execution.
- Backend migrations are numbered sequentially (`000_`, `001_`, etc.) in `backend/migrations/`.
- Frontend uses `shadcn/ui` patterns with Radix primitives in `frontend/components/ui/`.
- The worker only picks up jobs with `trigger_source = 'user'` to avoid reprocessing retry/system-triggered jobs.
- AI Engine API docs are auto-generated at `http://localhost:8000/docs` (Swagger UI).
