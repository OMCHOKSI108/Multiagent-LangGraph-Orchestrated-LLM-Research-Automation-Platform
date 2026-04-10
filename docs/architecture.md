# System Architecture

The Multi-Agent Research Platform follows a modular, microservices-based architecture, orchestrating multiple AI agents to perform complex research tasks.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │   React Web     │    │  Mobile App     │    │   API Clients           │  │
│  │   (Next.js)     │    │  (Flutter)      │    │   (curl, Postman)      │  │
│  └────────┬────────┘    └────────┬────────┘    └────────────┬───────────┘  │
└───────────┼──────────────────────┼───────────────────────────┼──────────────┘
            │                      │                           │
            └──────────────────────┴───────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Backend Layer (Node.js)                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Express.js API Server                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │    │
│  │  │   Auth   │  │ Workspaces│  │ Research │  │   Chat   │  ...        │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                    │
│  │  PostgreSQL  │  │    Redis     │  │    Worker    │                    │
│  │  (Persistent)│  │   (Cache)    │  │  (Polling)   │                    │
│  └──────────────┘  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI Engine (Python/FastAPI)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LangGraph Orchestration Layer                       │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │    │
│  │  │ Orchestr-  │  │   Central  │  │   Query    │  │  Pipeline  │     │    │
│  │  │   ator     │  │   Brain    │  │   Planner  │  │  Router    │     │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Agent Registry (35+ Agents)                    │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │    │
│  │  │Discovery│ │ Review  │ │Synthesis│ │Verification│ │Writing │        │    │
│  │  │   8     │ │   5     │ │   4     │ │    5    │ │   5     │        │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        LLM Provider Layer                             │    │
│  │   Groq  │  OpenRouter  │  Gemini  │  Ollama  │  HuggingFace         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Frontend (React + Next.js)
- **Framework**: Next.js 14 with React 18 and TypeScript
- **State Management**: React Context API + custom hooks
- **Styling**: Tailwind CSS with shadcn/ui components
- **Charts**: ECharts via echarts-for-react
- **Communication**: REST API for actions, SSE for real-time updates

### 2. Backend (Node.js + Express)
- **Role**: API Gateway, State Manager, and Job Queue
- **Auth**: JWT-based authentication with bcrypt password hashing
- **OAuth**: Passport.js with Google and GitHub strategies
- **Rate Limiting**: express-rate-limit for API protection
- **Routes**:
  - `/auth`: User authentication (signup, login, OAuth)
  - `/user`: User management and API key generation
  - `/workspaces`: Workspace CRUD operations
  - `/research`: Job management and status tracking
  - `/chat`: Interactive chatbot with RAG context
  - `/events`: Server-Sent Events for real-time updates
  - `/agents`: Agent testing endpoints
  - `/memories`: User memory management
  - `/export`: Multi-format export functionality
  - `/admin`: Administrative operations

### 3. AI Engine (Python + FastAPI + LangGraph)
- **Core**: Built on LangGraph for stateful, cyclic agent orchestration
- **LLM Providers**: 
  - Groq (fast inference)
  - OpenRouter (multiple providers)
  - Google Gemini
  - Ollama (local models)
  - HuggingFace (inference endpoints)
- **Agents**: 35+ specialized modules organized by category

## Orchestration Flow

The **Orchestrator Agent** is the central coordinator. It maintains global state and decides the control flow based on research context.

```mermaid
stateDiagram-v2
    [*] --> TopicDiscovery
    TopicDiscovery --> TopicLock: User confirms topic
    TopicLock --> DomainIntelligence
    DomainIntelligence --> HistoricalReview
    HistoricalReview --> SystematicLiteratureReview
    SystematicLiteratureReview --> GapSynthesis
    GapSynthesis --> InnovationNovelty
    InnovationNovelty --> ValidationRobustness
    ValidationRobustness --> ReportGeneration
    ReportGeneration --> [*]
    
    TopicDiscovery --> TopicSuggestions: If topic unclear
    TopicSuggestions --> TopicLock
```

## Agent Architecture

### Agent Categories (35+ Total)

| Category | Count | Examples |
|----------|-------|----------|
| Discovery | 8 | Domain Intelligence, Historical Review, Topic Discovery |
| Review | 5 | Systematic Literature Review, Survey Meta-Analysis |
| Synthesis | 4 | Gap Synthesis, Research Question Engineering |
| Understanding | 2 | Paper Decomposition, Paper Understanding |
| Verification | 5 | Technical Verification, Data Source Validation |
| Chatbot | 2 | Interactive Chatbot, Reviewer-Style Critique |
| Writing | 5 | Scientific Writing, LaTeX Generation, IEEE Paper |
| Critique | 2 | Adversarial Critique, Hallucination Detection |
| Visualization | 2 | Visualization Agent, Image Intelligence |
| Utility | 5+ | News, Scoring, Memory Graph, Citation Analysis |

### Agent Model Selection

Agents use specialized models based on task requirements:

| Model Type | Primary Use | Default Providers |
|------------|-------------|------------------|
| `MODEL_REASONING` | Logic, analysis, planning | Claude 3.5 Sonnet, Llama 3.1 |
| `MODEL_WRITING` | Prose, summaries, reports | GPT-4o-mini, Gemini Flash |
| `MODEL_CODING` | Code, JSON, LaTeX | DeepSeek Coder, Qwen Coder |
| `MODEL_CRITICAL` | Critique, verification, bias | Gemini 2.0 Flash, Llama |

## Data Flow

```
User Input (Topic/Question)
        │
        ▼
┌───────────────────┐
│   Frontend (UI)   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Backend (Auth +  │
│   Job Creation)   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Worker Process   │
│  (Job Polling)    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   AI Engine       │
│   (LangGraph)     │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌───────┐  ┌───────────┐
│ Agents │  │  LLM API  │
└───┬───┘  └───────────┘
    │
    ▼
┌───────────────────┐
│ Vector Store       │
│ (ChromaDB)        │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Report Generation │
│ (Markdown/LaTeX)  │
└───────────────────┘
```

## Deployment Architecture

### Docker Compose Services
1. **postgres**: PostgreSQL 16 for persistent storage
2. **redis**: Redis 7 for caching and pub/sub
3. **ai_engine**: Python FastAPI with LangGraph
4. **backend**: Node.js Express API server
5. **worker**: Background job processor
6. **frontend**: Next.js application

### Environment Configuration

```bash
# AI Engine
LLM_STATUS=HUGGINGFACE  # OFFLINE, ONLINE, HYBRID, HUGGINGFACE
OLLAMA_BASE_URL=http://host.docker.internal:11434

# Backend
DATABASE_URL=postgresql://user:password@postgres:5432/dbname
REDIS_URL=redis://redis:6379/0
AI_ENGINE_URL=http://ai_engine:8000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```
