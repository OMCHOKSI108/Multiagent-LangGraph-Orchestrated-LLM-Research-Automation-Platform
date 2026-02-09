# Codebase Structure (Current)

This document reflects the **actual repository layout** as of February 9, 2026. It replaces the older proposed structure and should be kept in sync with the repo.

## Repository Tree (High-Level)

```
project_sgp/
├── ai_engine/                 # Python FastAPI + LangGraph AI engine
├── backend/                   # Node/Express API + DB access
├── frontend/                  # React/Vite UI
├── docs/                      # Project documentation
├── assets/                    # Project-wide images/diagrams
├── data/                      # Runtime data (cache, HF, etc.)
├── output/                    # Generated reports and job JSON
├── REFERENCE/                 # Reference papers/code for literature
├── scripts/                   # Utility scripts
├── test/                      # Misc test entrypoints
├── README.md
├── run.py
├── Dockerfile
├── docker-compose.yml
├── mkdocs.yml
└── .env.example
```

## AI Engine (`ai_engine/`)

```
ai_engine/
├── main.py                    # FastAPI app and endpoints
├── config.py                  # LLM/provider configuration
├── requirements.txt
├── pyproject.toml
├── package.json               # Frontend or tooling dependencies (if used)
├── routes/
│   └── search.py              # Search API router (if used)
├── utils/
│   ├── search_service.py      # Unified search orchestration
│   ├── providers.py           # Search providers (DDG, Google, Arxiv, etc.)
│   ├── event_emitter.py       # Events for live execution + sources
│   ├── pdf_processor.py
│   ├── embeddings.py
│   ├── token_tracker.py
│   ├── document_lock.py
│   └── ...                    # Other utilities
├── graph/
│   ├── full_pipeline.py       # Full LangGraph pipeline
│   ├── pipeline_b.py
│   └── shared_nodes.py
├── agents/
│   ├── registry.py            # Agent registration map
│   ├── orchestrator/
│   ├── discovery/
│   ├── review/
│   ├── synthesis/
│   ├── novelty/
│   ├── understanding/
│   ├── verification/
│   ├── critique/
│   ├── report/
│   ├── memory/
│   ├── news/
│   ├── topic/
│   └── ...                    # Other agent groups
├── tests/
│   ├── test_agents.py
│   ├── test_pipelines.py
│   └── test_token_tracking.py
└── scripts/
    ├── run_local.sh
    ├── run_ollama.sh
    └── deploy.sh
```

## Backend (`backend/`)

```
backend/
├── server.js                  # Express server entry
├── package.json
├── package-lock.json
├── config/
│   └── db.js                  # Database config
├── routes/
│   ├── auth.routes.js
│   ├── research.routes.js
│   ├── chat.routes.js
│   ├── events.routes.js
│   ├── memory.routes.js
│   ├── export.routes.js
│   └── usage.routes.js
├── middleware/
│   └── auth.js
├── migrations/                # SQL migrations
├── database/
│   └── schema.sql
└── utils/
    └── logger.js
```

## Frontend (`frontend/`)

```
frontend/
├── index.html
├── index.tsx
├── App.tsx
├── globals.css
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── package.json
├── package-lock.json
├── pages/
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   ├── Dashboard.tsx
│   └── Workspace.tsx
├── components/
│   ├── Layout.tsx
│   ├── ChatInterface.tsx
│   ├── ResearchTimeline.tsx
│   ├── DataSourcesPanel.tsx
│   ├── SettingsModal.tsx
│   └── ...
├── services/
│   └── api.ts
├── store.ts
├── types.ts
└── metadata.json
```

## Docs (`docs/`)

```
docs/
├── architecture.md
├── backend.md
├── frontend.md
├── features.md
├── installation.md
├── deployment.md
├── api_reference.md
├── openapi.yaml
├── methodology.md
├── agent_architecture.md
├── AGENT_INVENTORY.md
├── AGENT_LIST.txt
├── agents/
│   ├── overview.md
│   ├── orchestrator.md
│   ├── critique.md
│   ├── report.md
│   └── ...
└── codebase.md
```

## Generated/Runtime Artifacts

```
output/                         # Generated reports, PDFs, JSON jobs
data/                           # Runtime caches and model data
ai_engine/logs/                 # AI engine logs (e.g., ai_engine.log)
```

## Notes

- This structure matches the existing multi-service architecture: Python AI engine + Node backend + React UI.
- Keep `docs/codebase.md` updated whenever you add, remove, or rename major folders.
