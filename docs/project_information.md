# Project Information

## Project Overview

**Multi-Agent LLM Research Automation Platform (MARP)** is an intelligent system that revolutionizes academic research by leveraging a sophisticated multi-agent architecture powered by LangGraph and Large Language Models. The platform can analyze individual research papers, perform comprehensive literature reviews, identify research gaps, and generate novel research directions.

Built with modern AI technologies, the platform combines automated information retrieval, structured systematic review protocols, and multi-agent collaboration to provide researchers with powerful tools for accelerating their work.

---

## Technology Stack

### Core Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| **AI Engine** | Python, FastAPI, LangGraph, LangChain | AI processing and agent orchestration |
| **Backend** | Node.js, Express.js, PostgreSQL | API gateway, authentication, job queue |
| **Frontend** | React, TypeScript, Next.js | User interface |
| **LLM Providers** | Ollama, Google Gemini, Groq, OpenRouter, HuggingFace | Language model inference |
| **Infrastructure** | Docker, Redis, Nginx | Containerization and deployment |

### AI Engine Dependencies

```
fastapi>=0.110
uvicorn[standard]>=0.27
langchain>=0.2
langchain-core
langgraph>=0.1
langgraph-checkpoint-sqlite
sentence-transformers
transformers>=4.36.0
chromadb>=0.4
```

### Backend Dependencies

```javascript
"express": "^4.18.2",
"pg": "^8.11.3",
"jsonwebtoken": "^9.0.2",
"passport": "^0.7.0",
"bcrypt": "^5.1.1",
"cors": "^2.8.5",
"redis": "^4.6.7"
```

### Frontend Dependencies

```javascript
"next": "^14.2.5",
"react": "^18.3.1",
"echarts": "^5.5.1",
"react-markdown": "^9.0.1"
```

---

## Architecture Overview

### System Components

The platform consists of three main components:

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│                   (Next.js / React)                             │
│             Landing page, Dashboard, Workspace                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
│                (Node.js / Express)                               │
│  Auth, Routes, Worker Queue, PostgreSQL, Redis, SSE Streaming    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI ENGINE                                  │
│             (Python / FastAPI / LangGraph)                      │
│    Agents, LLM Providers, Search Service, Vector Store          │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### Frontend (Port 3000)
- User authentication (login/signup)
- Landing page with feature showcase
- Dashboard for workspace management
- Workspace view for research sessions
- Real-time SSE event streaming
- Report viewing and editing
- Export functionality (Markdown, LaTeX, PDF)

#### Backend (Port 5000)
- JWT-based authentication
- PostgreSQL database management
- Background worker for job processing
- Research job queue with LISTEN/NOTIFY
- SSE event streaming to frontend
- API rate limiting
- Session and workspace management

#### AI Engine (Port 8000)
- LangGraph pipeline orchestration
- 30+ specialized agents
- LLM provider abstraction
- Multi-source search service
- Vector store integration
- Event emission for real-time updates

---

## Directory Structure

```
project_sgp/
├── ai_engine/                    # Python AI Engine
│   ├── agents/                   # Agent implementations
│   │   ├── __init__.py
│   │   ├── registry.py           # Lazy agent loading
│   │   ├── base.py               # BaseAgent class
│   │   ├── brain/                # Central Brain agent
│   │   ├── chatbot/              # Conversational agents
│   │   ├── critique/             # Critique and verification
│   │   ├── discovery/            # Domain discovery agents
│   │   ├── novelty/              # Innovation agents
│   │   ├── orchestrator/         # Orchestrator agent
│   │   ├── planner/              # Query planner
│   │   ├── report/               # Report generation
│   │   ├── review/               # Literature review
│   │   ├── scraper/              # Web scraping
│   │   ├── synthesis/            # Gap synthesis
│   │   ├── understanding/        # Paper analysis
│   │   ├── verification/         # Technical verification
│   │   ├── vision/               # Image intelligence
│   │   └── visualization/        # Data visualization
│   ├── graph/                    # LangGraph pipelines
│   │   ├── full_pipeline.py      # Main research pipeline
│   │   ├── pipeline_b.py         # Alternative pipeline
│   │   └── router_graph.py       # Routing logic
│   ├── llm/                      # LLM providers
│   │   ├── factory.py            # Provider factory
│   │   ├── base.py              # Base provider class
│   │   ├── groq_provider.py      # Groq integration
│   │   ├── ollama_provider.py   # Ollama integration
│   │   ├── openrouter_provider.py
│   │   ├── gemini_provider.py
│   │   └── huggingface_provider.py
│   ├── routes/                   # FastAPI routes
│   │   └── search.py
│   ├── scraper/                  # Web scraping utilities
│   ├── utils/                    # Utilities
│   │   ├── event_emitter.py     # Real-time events
│   │   ├── search_service.py    # Unified search
│   │   ├── token_tracker.py     # Usage tracking
│   │   ├── document_lock.py     # LaTeX locking
│   │   └── providers.py         # Search providers
│   ├── vectorstore/              # ChromaDB integration
│   ├── cache/                    # Response caching
│   ├── config.py                 # Configuration
│   ├── main.py                   # FastAPI entry point
│   └── requirements.txt
│
├── backend/                      # Node.js Backend
│   ├── config/
│   │   ├── db.js                 # PostgreSQL connection
│   │   └── passport.js           # Passport strategies
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication
│   │   ├── apiKeyAuth.js         # API key validation
│   │   └── sessionKeyAuth.js
│   ├── routes/
│   │   ├── auth.routes.js        # Authentication
│   │   ├── research.routes.js    # Research management
│   │   ├── events.routes.js      # SSE streaming
│   │   ├── chat.routes.js        # Chat functionality
│   │   ├── workspace.routes.js   # Workspace management
│   │   ├── sources.routes.js     # Source management
│   │   ├── export.routes.js      # Export functionality
│   │   ├── monitoring.routes.js   # Metrics/monitoring
│   │   └── admin.routes.js       # Admin operations
│   ├── services/
│   │   ├── llm/                  # LLM service integrations
│   │   └── monitoring/           # Monitoring collectors
│   ├── utils/
│   │   └── logger.js             # Winston logger
│   ├── worker.js                 # Background job processor
│   ├── server.js                 # Express entry point
│   └── package.json
│
├── frontend/                     # Next.js Frontend
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── layout.tsx            # Root layout
│   │   ├── login/               # Login page
│   │   ├── signup/              # Signup page
│   │   ├── dashboard/           # User dashboard
│   │   ├── workspace/[id]/      # Workspace view
│   │   ├── agents/              # Agent management
│   │   ├── admin/               # Admin panel
│   │   ├── memories/            # Memory management
│   │   └── profile/             # User profile
│   ├── components/
│   │   ├── landing/             # Landing page components
│   │   ├── ui/                  # Reusable UI components
│   │   ├── Navbar.tsx
│   │   ├── BrainPanel.tsx
│   │   ├── LLMStatusBar.tsx
│   │   └── PremiumCharts.tsx
│   ├── lib/
│   │   ├── api.ts               # API client
│   │   ├── auth.tsx             # Auth context
│   │   └── utils.ts
│   └── package.json
│
├── docker-compose.yml            # Docker orchestration
├── .env                          # Environment configuration
└── README.md                     # Project documentation
```

---

## Data Flow

### Research Request Flow

```
1. User Input
   ├── Slash command: /deep [topic], /research [topic], /search [query]
   ├── Direct topic entry in workspace
   └── Click "Start Research"

2. Frontend Processing
   └── POST /api/workspaces/{id}/research/start
       ├── Validates authentication (JWT token)
       ├── Creates research_sessions record
       ├── Sets status to "queued"
       └── Emits PostgreSQL NOTIFY

3. Backend Worker
   ├── LISTEN on new_research_job channel
   ├── Polls DB every 30 seconds (fallback)
   ├── SELECTS oldest queued job (FOR UPDATE SKIP LOCKED)
   ├── Updates status to "processing"
   └── POSTs to AI Engine /research

4. AI Engine Pipeline
   ├── Validates X-API-Key header
   ├── Initializes LangGraph state
   ├── Runs full_pipeline.py
   ├── Emits events to /api/events
   └── Returns research results

5. Result Processing
   ├── Worker saves report_markdown to DB
   ├── Splits report into sections
   ├── Updates status to "completed"
   └── Frontend polls for completion

6. Real-time Updates (SSE)
   ├── GET /api/events/stream/{id}
   ├── Polls DB every 2 seconds
   ├── Streams: stage changes, agent progress, sources
   └── Frontend updates UI in real-time
```

### Authentication Flow

```
1. User Registration
   └── POST /api/auth/signup
       ├── Hash password with bcrypt
       ├── Create user record
       └── Return success message

2. User Login
   └── POST /api/auth/login
       ├── Validate credentials
       ├── Generate JWT token
       └── Return token + user object

3. Authenticated Requests
   └── Include x-auth-token header
       ├── Middleware validates JWT
       ├── Attaches user to request
       └── Proceeds to route handler

4. API Key Authentication (Backend → AI Engine)
   └── Include X-API-Key header
       ├── Validates AI_ENGINE_SECRET
       └── Required for /research endpoint
```

---

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Research Sessions Table

```sql
CREATE TABLE research_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    workspace_id UUID REFERENCES workspaces(id),
    topic TEXT NOT NULL,
    title VARCHAR(500),
    status VARCHAR(50) DEFAULT 'queued',
    depth VARCHAR(20) DEFAULT 'deep',
    current_stage VARCHAR(100),
    result_json JSONB,
    report_markdown TEXT,
    latex_source TEXT,
    share_token VARCHAR(100),
    trigger_source VARCHAR(20) DEFAULT 'user',
    retry_count INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Execution Events Table

```sql
CREATE TABLE execution_events (
    id SERIAL PRIMARY KEY,
    research_id INTEGER REFERENCES research_sessions(id),
    event_id VARCHAR(100),
    stage VARCHAR(100),
    severity VARCHAR(20),
    category VARCHAR(50),
    message TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Data Sources Table

```sql
CREATE TABLE data_sources (
    id SERIAL PRIMARY KEY,
    research_id INTEGER REFERENCES research_sessions(id),
    source_type VARCHAR(50),
    domain VARCHAR(255),
    url TEXT,
    status VARCHAR(50),
    items_found INTEGER,
    title VARCHAR(500),
    description TEXT,
    favicon TEXT,
    thumbnail TEXT,
    published_date VARCHAR(50),
    citation_text TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Workspaces Table

```sql
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    session_count INTEGER DEFAULT 0,
    last_activity TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Configuration

### Environment Variables

#### AI Engine (.env)

```bash
# LLM Configuration
LLM_STATUS=ONLINE              # OFFLINE, ONLINE, HYBRID, HUGGINGFACE
LLM_MODE=online

# API Keys
GROQ_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_key
GEMINI_API_KEY=your_key

# Ollama (for OFFLINE mode)
OLLAMA_BASE_URL=http://localhost:11434

# HuggingFace
HF_HOME=./cache/huggingface
HUGGINGFACE_DEVICE=auto
HUGGINGFACE_QUANTIZATION=true

# Model Selection
MODEL_REASONING=openrouter/anthropic/claude-3.5-sonnet
MODEL_WRITING=openrouter/openai/gpt-4o-mini
MODEL_CODING=openrouter/deepseek/deepseek-coder
MODEL_CRITICAL=gemini/gemini-2.0-flash

# Search Providers
SEARCH_PROVIDER_DUCKDUCKGO=true
GOOGLE_SEARCH_API_KEY=your_key
GOOGLE_SEARCH_CX=your_cx

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Backend Connection
BACKEND_URL=http://backend:5000/api
AI_ENGINE_SECRET=your_secret_key

# Security
AI_ENGINE_SECRET=internal_api_key
```

#### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
DB_USER=postgres
DB_HOST=localhost
DB_NAME=research_platform
DB_PASSWORD=password
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379

# AI Engine
AI_ENGINE_URL=http://ai-engine:8000
AI_ENGINE_SECRET=internal_api_key

# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Ports
PORT=5000
NODE_ENV=development
```

#### Frontend (.env)

```bash
NEXT_PUBLIC_API_URL=http://localhost:5001
```

---

## API Endpoints

### Backend REST API

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | User registration |
| POST | /api/auth/login | User login |
| GET | /api/auth/me | Get current user |
| PATCH | /api/auth/me | Update user profile |

#### Workspaces
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/workspaces | List user workspaces |
| POST | /api/workspaces | Create workspace |
| GET | /api/workspaces/:id | Get workspace details |
| DELETE | /api/workspaces/:id | Delete workspace |
| POST | /api/workspaces/:id/research/start | Start research |

#### Research
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/research/status/:id | Get research status |
| POST | /api/research/:id/topic | Set research topic |
| GET | /api/research/:id/suggestions | Get topic suggestions |
| DELETE | /api/research/:id | Delete research |
| POST | /api/research/:id/share | Share research |

#### Events (SSE)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/events/stream/:id | SSE stream |
| GET | /api/events/token/:id | Get SSE token |
| POST | /api/events | Emit event |
| POST | /api/events/source | Emit source event |

### AI Engine API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /providers | List search providers |
| POST | /providers/test | Test provider |
| GET | /agents | List agents |
| POST | /agents/:slug/test | Test agent |
| POST | /research | Run full pipeline |
| POST | /search | Unified search |
| POST | /chatbot/fast-chat | Fast chat |

---

## Agent Architecture

### Agent Registry

Agents are loaded lazily via the `_LazyAgent` class in `agents/registry.py`:

```python
AGENTS = {
    "topic_discovery": _lazy(".topic.agents", "TopicDiscoveryAgent"),
    "topic_lock": _lazy(".topic.agents", "TopicLockAgent"),
    "orchestrator": _lazy(".orchestrator.orchestrator", "OrchestratorAgent"),
    "central_brain": _lazy(".brain.central_brain", "CentralBrainAgent"),
    # ... 30+ more agents
}
```

### Agent Categories

#### Discovery Agents
- **TopicDiscoveryAgent**: Generates research titles and topics
- **TopicLockAgent**: Locks user-selected topic
- **DomainIntelligenceAgent**: Maps research landscapes
- **HistoricalReviewAgent**: Chronological analysis via ArXiv

#### Review Agents
- **SystematicLiteratureReviewAgent**: PRISMA-compliant reviews
- **GapSynthesisAgent**: Identifies research gaps
- **SurveyMetaAnalysisAgent**: Statistical synthesis

#### Analysis Agents
- **PaperDecompositionAgent**: Structural document parsing
- **PaperUnderstandingAgent**: Content summarization
- **TechnicalVerificationAgent**: Claims validation

#### Synthesis Agents
- **InnovationNoveltyAgent**: Novel research ideas
- **BaselineReproductionAgent**: Reproduces methods
- **ValidationRobustnessAgent**: Tests validity

#### Writing Agents
- **ScientificWritingAgent**: Academic paper composition
- **LaTeXGenerationAgent**: Professional typesetting
- **MultiStageReportAgent**: Multi-stage report generation
- **EditorAgent**: Document editing

#### Verification Agents
- **HallucinationDetectionAgent**: AI output validation
- **DataSourceValidationAgent**: Source credibility
- **ReviewerAdversarialCritiqueAgent**: Bias detection

#### Support Agents
- **ConversationalAgent**: Fast chat responses
- **QueryPlannerAgent**: Routes queries to appropriate handlers
- **WebScraperAgent**: Multi-strategy scraping
- **DataCleanerAgent**: Data quality filtering
- **ImageIntelligenceAgent**: Academic image scoring

---

## LangGraph Pipeline

### Full Research Pipeline

The pipeline is defined in `graph/full_pipeline.py` using LangGraph's `StateGraph`:

```python
class ResearchState(TypedDict):
    task: str
    paper_url: Optional[str]
    next_step: Optional[str]
    workspace_id: Optional[str]
    session_id: Optional[int]
    topic_locked: bool
    selected_topic: Optional[str]
    topic_suggestions: Optional[List[Dict[str, Any]]]
    research_summary: Optional[str]
    findings: Annotated[Dict[str, Any], merge_dicts]
    failed_agents: Annotated[Dict[str, Any], merge_dicts]
    history: Annotated[List[str], operator.add]
    depth: str
    _job_id: Optional[str]
    brain_context: Annotated[Dict[str, Any], merge_dicts]
```

### Pipeline Flow

```
topic_discovery → topic_lock → orchestrator → brain_init
                                                   │
                           ┌───────────────────────┴───────────────────────┐
                           ▼                                               ▼
              domain_intelligence                           paper_decomposition
                           │                                               │
          ┌────────────────┼────────────────┐                               │
          ▼                ▼                ▼                               │
  historical_review      slr              news                               │
          │                │                │                                │
          └────────────────┴────────────────┘                                │
                           │                                                 │
                           ▼                                                 │
                     gap_synthesis                                             │
                           │                                                 │
                           ▼                                                 │
              brain_synthesize → innovation                                   │
                           │                                                 │
                           └────────────────────────────┐                    │
                                                        │                    │
                                    ┌───────────────────┴───────┐           │
                                    ▼                           ▼           │
                              critique                    visualization       │
                                    │                           │              │
                                    └───────────────────┬───────┘              │
                                                        ▼                      │
                                                    scoring                    │
                                                        │                      │
                                                        ▼                      │
                                                brain_direct                    │
                                                        │                      │
                                                        ▼                      │
                                          writing → multi_stage_report → latex
```

### Document Locking

The pipeline uses document locking for LaTeX operations:

```python
async def multi_stage_report_node(state):
    if document_lock.acquire(job_id, owner="multi_stage_report", timeout=60):
        try:
            result = await run_agent("multi_stage_report", state)
            document_lock.increment_version(job_id)
            return result
        finally:
            document_lock.release(job_id, owner="multi_stage_report")
```

---

## LLM Provider Factory

The factory in `llm/factory.py` provides a unified interface to multiple LLM providers:

### Provider Selection Logic

```python
def get_llm_provider(model_name: str = None) -> LLMProvider:
    if LLM_STATUS == "HUGGINGFACE":
        provider = _create_huggingface_provider(cfg, model_name)
        # Fallback chain: HF → Ollama → Online
    elif LLM_STATUS == "OFFLINE":
        provider = _create_ollama_provider(cfg, model_name)
        # Fallback: Ollama → Groq (if keys available)
    elif LLM_STATUS == "ONLINE":
        provider = _resolve_online_provider(cfg, model_name)
        # Priority: Groq → OpenRouter → Gemini
    else:  # HYBRID
        provider = _resolve_online_provider(cfg, model_name)
        # Fallback: Online → HuggingFace
```

### Cloud Model Mappings

```python
CLOUD_MODEL_MAPPINGS = {
    "groq": {
        "phi3:mini": "llama-3.1-8b-instant",
        "qwen2.5-coder:latest": "llama-3.3-70b-versatile",
    },
    "openrouter": {
        "phi3:mini": "microsoft/phi-3-mini-128k-instruct",
        "default": "anthropic/claude-3.5-sonnet",
    },
    "gemini": {
        "phi3:mini": "gemini-1.5-flash",
        "default": "gemini-1.5-flash",
    }
}
```

---

## Search Service

### Provider Architecture

```python
AVAILABLE_PROVIDERS = [
    "duckduckgo",  # General web search
    "google",      # Requires API key
    "arxiv",       # Academic papers
    "wikipedia",   # Encyclopedia
    "openalex",    # Open access literature
    "pubmed",      # Medical research
]
```

### Search Flow

```python
def search_sync(query, providers=None, max_results=10):
    # 1. Select providers (default: duckduckgo + arxiv)
    selected = providers or DEFAULT_PROVIDERS
    
    # 2. Generate query variants for fallback
    variants = _query_variants(query)
    
    # 3. Parallel search across providers
    with ThreadPoolExecutor() as pool:
        futures = {pool.submit(PROVIDER_FUNCTIONS[p], query, per_provider): p 
                    for p in selected}
        
    # 4. Deduplicate by URL
    # 5. Fallback to static links if no results
    # 6. Return normalized results
```

---

## Event Emitter

The event emitter provides real-time transparency during research:

```python
def emit_agent_start(agent_name: str, research_id: int):
    emit_event(
        stage="analyzing",
        message=f"Running agent: {agent_name}",
        category="agent",
        details={"agent_name": agent_name},
        research_id=research_id,
    )

def emit_source(source_type: str, domain: str, url: str, ...):
    # Store source for UI display
    _fire_and_forget(f"{BACKEND_URL}/events/source", payload)
```

### Event Categories
- `stage`: Pipeline stage changes
- `agent`: Agent start/complete events
- `source`: Data source discoveries
- `brain_thought`: Central brain reasoning
- `brain_report_chunk`: Report generation progress
- `error`: Error events

---

## Worker Queue

The background worker processes queued research jobs:

### Processing Flow

```javascript
async function processQueue() {
    // 1. Begin transaction
    await client.query('BEGIN');
    
    // 2. Lock oldest queued job
    const result = await client.query(`
        SELECT * FROM research_sessions
        WHERE status = 'queued' AND trigger_source IN ('user', 'retry')
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    `);
    
    // 3. Mark as processing
    await client.query(
        `UPDATE research_sessions SET status = 'processing' WHERE id = $1`,
        [job.id]
    );
    
    // 4. Call AI Engine
    const aiResponse = await axios.post(`${AI_ENGINE_URL}/research`, payload);
    
    // 5. Save results
    await client.query(`
        UPDATE research_sessions
        SET status = 'completed', result_json = $1, report_markdown = $2
        WHERE id = $3
    `, [result, report, job.id]);
}
```

### Job Recovery

- Stale job recovery: Jobs stuck in "processing" for 30+ minutes
- Exhausted job handling: Jobs exceeding MAX_RETRIES marked as "failed"
- Cancellation support: Cancelled jobs skip result overwrite

---

## Deployment

### Docker Compose

```yaml
services:
  ai-engine:
    build: ./ai_engine
    ports:
      - "8000:8000"
    environment:
      - LLM_STATUS=ONLINE
      - GROQ_API_KEY=${GROQ_API_KEY}
    volumes:
      - ./ai_engine:/app
      - hf-cache:/app/cache/huggingface

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - db
      - redis
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/research
      - REDIS_URL=redis://redis:6379
      - AI_ENGINE_URL=http://ai-engine:8000

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
        - NEXT_PUBLIC_API_URL=http://localhost:5001

  worker:
    build: ./backend
    command: node worker.js
    depends_on:
      - db
      - redis
      - ai-engine
```

---

## Development Guidelines

### Adding a New Agent

1. Create agent file in appropriate category:
   ```bash
   touch ai_engine/agents/discovery/my_agent.py
   ```

2. Implement agent class extending `BaseAgent`:
   ```python
   from agents.base import BaseAgent
   
   class MyAgent(BaseAgent):
       def __init__(self, **kwargs):
           super().__init__(
               name="My Agent",
               system_prompt="Your agent prompt here...",
               **kwargs
           )
   ```

3. Register in `agents/registry.py`:
   ```python
   "my_agent": _lazy(".discovery.my_agent", "MyAgent"),
   ```

### Adding a New Route

1. Create route file in `backend/routes/`:
   ```javascript
   const express = require('express');
   const router = express.Router();
   
   router.get('/my-route', auth, async (req, res) => {
       // Implementation
   });
   
   module.exports = router;
   ```

2. Register in `backend/server.js`:
   ```javascript
   app.use('/api', require('./routes/my-route'));
   ```

### Testing

Run tests for each component:

```bash
# AI Engine
cd ai_engine && python -m pytest

# Backend
cd backend && npm test

# Frontend
cd frontend && npm run lint
```

---

## Security Considerations

1. **API Keys**: Store in environment variables, never in code
2. **JWT Tokens**: Use secure secret, implement refresh mechanism
3. **Rate Limiting**: Configured per-endpoint in Express
4. **CORS**: Restrict to known origins in production
5. **Database**: Use parameterized queries to prevent SQL injection
6. **LLM Outputs**: Validate and sanitize before display

---

## Performance Optimizations

1. **Agent Lazy Loading**: Agents only loaded when first used
2. **LLM Provider Caching**: Providers cached per model
3. **Response Caching**: Agent outputs cached by input hash
4. **Parallel Search**: ThreadPoolExecutor for provider queries
5. **SSE Polling**: 2-second interval balances latency and load
6. **Database Connection Pooling**: PostgreSQL pool management
7. **Worker Locking**: Prevents duplicate job processing

---

## Docker Deployment

This project is **fully containerized using Docker** with `docker-compose` for orchestration. All services run in isolated containers with persistent volumes for data storage.

### Docker Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         docker-compose.yml                                    │
│                    (6 Services + 2 Networks)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │  postgres   │  │    redis     │  │  ai_engine   │                       │
│  │  :5432      │  │   :6379      │  │   :8000      │                       │
│  │             │  │              │  │              │                       │
│  │ PostgreSQL  │  │    Redis     │  │   FastAPI    │                       │
│  │   16-alpine │  │  7-alpine    │  │  LangGraph   │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
│          │                │                  │                             │
│          └────────────────┼──────────────────┘                             │
│                           │                                                │
│                           ▼                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │   backend    │  │    worker    │  │   frontend   │                       │
│  │   :5001      │  │   (no port)  │  │   :3000      │                       │
│  │              │  │              │  │              │                       │
│  │  Express.js  │  │  Background  │  │  Next.js     │                       │
│  │   + Worker   │  │    Queue     │  │   React      │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Services Overview

| Service | Image | Port | Purpose | Dependencies |
|---------|-------|------|---------|--------------|
| **postgres** | `postgres:16-alpine` | 5432 | Primary database | None |
| **redis** | `redis:7-alpine` | 6379 | Cache & session store | None |
| **ai_engine** | Custom Python build | 8000 | LangGraph pipeline & agents | redis |
| **backend** | Custom Node.js build | 5001 | Express API server | postgres, redis, ai_engine |
| **worker** | Custom Node.js build | - | Background job processor | postgres, redis, ai_engine |
| **frontend** | Custom Next.js build | 3000 | React UI | backend |

### Docker Volumes

| Volume | Purpose |
|--------|---------|
| `postgres_data` | PostgreSQL database files |
| `redis_data` | Redis persistence |
| `ai_output` | AI engine output files |
| `ai_logs` | AI engine log files |
| `ai_cache` | HuggingFace model cache |
| `research_images` | Shared research images |

### Quick Start Guide

#### Prerequisites

- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **API Keys** for LLM providers (Groq, OpenRouter, Gemini, or HuggingFace)

#### Step 1: Create Environment File

Create a `.env` file in the project root:

```bash
# .env

# ===================
# DATABASE
# ===================
DB_NAME=research_platform
DB_USER=research
DB_PASSWORD=research_password
DB_PORT=5432

# ===================
# LLM CONFIGURATION
# ===================
# Choose one mode: ONLINE, OFFLINE, HYBRID, or HUGGINGFACE
LLM_STATUS=ONLINE

# ===================
# API KEYS (for ONLINE/HYBRID mode)
# ===================
# Groq API Keys (recommended for speed)
GROQ_API_KEY=gsk_your_groq_key_here
# GROQ_API_1=gsk_key1
# GROQ_API_2=gsk_key2
# GROQ_API_3=gsk_key3

# OpenRouter API Keys
OPENROUTER_API_KEY=sk_or_your_openrouter_key_here
# OPENROUTER_API_1=sk_key1
# OPENROUTER_API_2=sk_key2
# OPENROUTER_API_3=sk_key3

# Gemini API Keys
GEMINI_API_KEY=your_gemini_key_here
# GEMINI_API_1=key1
# GEMINI_API_2=key2
# GEMINI_API_3=key3

# HuggingFace Token (for HF mode)
HF_TOKEN=hf_your_token_here

# ===================
# LOCAL MODELS (for OFFLINE mode)
# ===================
OLLAMA_BASE_URL=http://host.docker.internal:11434
MODEL_LOCAL_REASONING=mistral:7b-instruct
MODEL_LOCAL_WRITING=gemma2:2b
MODEL_LOCAL_CODING=qwen2.5-coder:latest

# ===================
# SECURITY
# ===================
JWT_SECRET=your_very_secure_jwt_secret_min_32_chars
SESSION_SECRET=your_session_secret_here
AI_ENGINE_SECRET=your_internal_api_secret

# ===================
# URLS & PORTS
# ===================
NEXT_PUBLIC_API_URL=http://localhost:5001/api

# ===================
# PERFORMANCE
# ===================
AI_REQUEST_TIMEOUT_MS=1800000
QUEUE_CONCURRENCY=4
```

#### Step 2: Build and Start

```bash
# Build all Docker images
docker-compose build

# Start all services in detached mode
docker-compose up -d

# View startup logs
docker-compose logs -f

# Check service status
docker-compose ps
```

#### Step 3: Access Services

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:5001 |
| **AI Engine** | http://localhost:8000 |
| **Swagger Docs** | http://localhost:8000/docs |
| **Health Check** | http://localhost:5001/api/health |

---

### LLM Mode Configuration

The system supports four LLM modes configured via `LLM_STATUS` environment variable:

#### Mode 1: Online (Recommended for Production)

Uses cloud LLM providers with automatic fallback:

```bash
LLM_STATUS=ONLINE

# API Keys required (at least one)
GROQ_API_KEY=your_key
OPENROUTER_API_KEY=your_key
GEMINI_API_KEY=your_key
```

**Model Selection:**
- Reasoning: `openrouter/anthropic/claude-3.5-sonnet`
- Writing: `openrouter/openai/gpt-4o-mini`
- Coding: `openrouter/deepseek/deepseek-coder`

#### Mode 2: Offline (Local Ollama)

Runs completely offline using local models:

```bash
LLM_STATUS=OFFLINE

# Ollama must be running on host machine
OLLAMA_BASE_URL=http://host.docker.internal:11434

# Local models
MODEL_LOCAL_REASONING=mistral:7b-instruct
MODEL_LOCAL_WRITING=gemma2:2b
MODEL_LOCAL_CODING=qwen2.5-coder:latest
```

**Setup Ollama on host:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull mistral:7b-instruct
ollama pull gemma2:2b
ollama pull qwen2.5-coder:latest

# Start Ollama server
ollama serve
```

#### Mode 3: HuggingFace (Local Inference)

Uses HuggingFace models with quantization:

```bash
LLM_STATUS=HUGGINGFACE

# HuggingFace token for gated models
HF_TOKEN=hf_your_token_here

# GPU recommended for performance
HUGGINGFACE_DEVICE=cuda
HUGGINGFACE_QUANTIZATION=true
HUGGINGFACE_PRELOAD_ON_STARTUP=true
```

#### Mode 4: Hybrid (Cloud with Fallback)

Uses cloud providers with automatic fallback to offline:

```bash
LLM_STATUS=HYBRID

# Cloud API Keys
GROQ_API_KEY=your_key
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

---

### Docker Files Reference

#### AI Engine Dockerfile (`ai_engine/Dockerfile`)

```dockerfile
FROM python:3.11-slim

# Install system dependencies for ML libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libmagic-dev poppler-utils tesseract-ocr \
    libgl1 libglib2.0-0 git

# Install PyTorch with CUDA support
RUN pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Expose port and start server
ENV PORT=8000
EXPOSE $PORT
CMD ["uvicorn", "ai_engine.main:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

#### Backend API Dockerfile (`backend/Dockerfile.api`)

```dockerfile
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ chromium latexmk texlive-latex-base \
    texlive-latex-recommended texlive-fonts-recommended

# Install Node dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source and start
COPY . .
CMD ["node", "scripts/init-all.js && node server.js"]
```

#### Backend Worker Dockerfile (`backend/Dockerfile.worker`)

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++

COPY package*.json ./
RUN npm ci --only=production

COPY . .
CMD ["node", "worker.js"]
```

#### Frontend Dockerfile (`frontend/Dockerfile`)

```dockerfile
FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm ci --include=dev

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start", "--", "-H", "0.0.0.0"]
```

---

### Useful Docker Commands

#### Service Management

```bash
# Start all services
docker-compose up -d

# Start specific service with dependencies
docker-compose up -d backend

# Restart a service
docker-compose restart worker

# Stop all services (keep volumes)
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build

# Force rebuild without cache
docker-compose build --no-cache
```

#### Logs & Monitoring

```bash
# View all logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f ai_engine
docker-compose logs -f backend
docker-compose logs -f worker
docker-compose logs -f frontend

# View last 100 lines
docker-compose logs --tail 100 postgres

# Follow worker logs only
docker-compose logs -f worker
```

#### Container Access

```bash
# Shell into container
docker-compose exec backend sh
docker-compose exec ai_engine bash
docker-compose exec postgres psql -U research -d research_platform

# Python REPL in AI engine
docker-compose exec ai_engine python -c "import ai_engine.config as c; print(c.LLM_STATUS)"

# Node REPL in backend
docker-compose exec backend node -e "console.log(process.env.LLM_STATUS)"
```

#### Database Operations

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U research -d research_platform

# Run migrations
docker-compose exec backend node scripts/init-all.js

# Check database size
docker-compose exec postgres psql -U research -d research_platform -c "SELECT pg_size_pretty(pg_database_size('research_platform'));"
```

#### Health Checks

```bash
# Check all service health
docker-compose ps

# Test AI engine health
curl http://localhost:8000/health

# Test backend health
curl http://localhost:5001/api/health

# Test frontend
curl http://localhost:3000
```

---

### Troubleshooting

#### Port Already in Use

```bash
# Check what's using the port
lsof -i :3000
lsof -i :5001
lsof -i :8000

# Or use netstat
netstat -tulpn | grep LISTEN

# Change ports in docker-compose.yml if needed
```

#### Database Connection Issues

```bash
# Check postgres is healthy
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Wait longer for postgres to initialize
docker-compose up -d postgres
sleep 10

# Run migrations manually
docker-compose exec backend node scripts/init-all.js
```

#### AI Engine Not Starting

```bash
# Check AI engine logs for errors
docker-compose logs ai_engine

# Verify environment variables
docker-compose exec ai_engine env | grep -E "LLM_|API_"

# Test API key validity
docker-compose exec ai_engine python -c "from ai_engine import config; print(config.validate_env())"

# Check GPU availability (if using CUDA)
docker-compose exec ai_engine nvidia-smi
```

#### Worker Not Processing Jobs

```bash
# Check worker logs
docker-compose logs worker

# Verify AI engine is reachable from worker
docker-compose exec worker curl -s http://ai_engine:8000/health

# Check database queue
docker-compose exec postgres psql -U research -d research_platform -c "SELECT * FROM research_sessions WHERE status = 'queued';"

# Reset stuck jobs
docker-compose exec postgres psql -U research -d research_platform -c "UPDATE research_sessions SET status = 'queued' WHERE status = 'processing';"
```

#### Out of Memory Issues

```bash
# Check memory usage
docker stats

# Limit memory in docker-compose.yml
services:
  ai_engine:
    deploy:
      resources:
        limits:
          memory: 8G

# Increase swap
docker system df
```

#### GPU Not Available in Container

```bash
# Install NVIDIA Container Toolkit
# https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html

# Verify NVIDIA runtime
docker run --rm --gpus all nvidia/cuda:11.8-base-ubuntu22.04 nvidia-smi

# Update docker-compose.yml to use nvidia runtime
services:
  ai_engine:
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
```

---

### Development Mode

For active development with hot reload:

#### Option 1: Hybrid Mode

Keep database and redis in Docker, run services locally:

```bash
# Start only infrastructure
docker-compose up -d postgres redis

# Update .env for local services
# Change AI_ENGINE_URL=http://localhost:8000
# Change DB_HOST=localhost

# Run services locally
cd ai_engine && uvicorn main:app --reload
cd backend && npm run dev
cd frontend && npm run dev
```

#### Option 2: Selective Docker

Run only the services you're not developing:

```bash
# Only start AI engine in Docker
docker-compose up -d ai_engine postgres redis

# Run backend and frontend locally
```

#### Volume Mounting for Hot Reload

Enable live code reloading by mounting source directories:

```yaml
# In docker-compose.yml, ensure volumes are set
services:
  ai_engine:
    volumes:
      - ./ai_engine:/app/ai_engine  # Already configured
  backend:
    volumes:
      - ./backend:/app               # Already configured
```

---

### Production Deployment

#### Prerequisites

- Domain name with SSL certificates
- Reverse proxy (Nginx, Traefik) for HTTPS
- External PostgreSQL for production
- Redis cluster or managed Redis (Redis Cloud)

#### Production Checklist

```bash
# .env.production
NODE_ENV=production

# Use strong, randomly generated secrets
JWT_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 64)
AI_ENGINE_SECRET=$(openssl rand -base64 32)

# Production database (external)
DATABASE_URL=postgresql://user:pass@prod-db:5432/research_platform

# Redis (external or cluster)
REDIS_URL=redis://prod-redis:6379/0

# Restrict CORS to your domain
CORS_ORIGIN=https://your-domain.com

# Enable GPU for AI engine
RUNTIME=nvidia
```

#### Docker Stack with Nginx

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

  frontend:
    # ... same as before
    expose:
      - "3000"

  backend:
    # ... same as before
    expose:
      - "5000"

  # ... other services
```

#### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }
    
    upstream backend {
        server backend:5000;
    }
    
    upstream ai_engine {
        server ai_engine:8000;
    }
    
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name your-domain.com;
        
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
        
        # Backend API
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        # AI Engine
        location /ai {
            proxy_pass http://ai_engine;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
        }
    }
}
```

---

### Scaling

#### Horizontal Scaling of Workers

```bash
# Scale workers
docker-compose up -d --scale worker=3

# With specific configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale worker=5
```

#### Load Balancing

For production, consider:
- **Backend**: Multiple replicas behind load balancer
- **AI Engine**: Multiple replicas (stateless)
- **PostgreSQL**: Read replicas for queries
- **Redis**: Sentinel or Cluster mode

---

### Backup & Recovery

#### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U research research_platform > backup_$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec -T postgres psql -U research research_platform < backup_20240101.sql
```

#### Volume Backup

```bash
# Backup all volumes
docker run --rm -v project_sgp_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .

# Restore volume
docker run --rm -v project_sgp_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_data.tar.gz -C /data
```

---

### Security Best Practices

1. **Never commit secrets**: Use `.env` files excluded from git
2. **Use secrets management**: Docker Swarm secrets or external vault
3. **Regular updates**: Keep base images updated
4. **Network isolation**: Use internal network for services
5. **Resource limits**: Set memory and CPU limits
6. **Health checks**: All services have health checks configured
7. **TLS/SSL**: Use HTTPS in production
8. **Rate limiting**: Configure on API endpoints

