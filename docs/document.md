# Multi-Agent LLM Research Automation Platform

## Architecture Overview

### System Components

The platform consists of three main services:

1. **AI Engine** (Python/FastAPI)
   - Core multi-agent orchestration
   - LLM integration (Ollama, Gemini, Groq)
   - Research pipeline execution
   - Token usage tracking
   - Web search integration

2. **Backend** (Node.js/Express)
   - User authentication and management
   - Research session persistence
   - Real-time event streaming
   - Memory management system
   - Export functionality

3. **Frontend** (React/TypeScript + Vite)
   - Modern UI with dark/light themes
   - Real-time research visualization
   - Streaming chat interface
   - Memory management
   - Responsive design

### New Features (v2.0)

#### Web Search Integration
- Unified search API across multiple providers
- Normalized result schema with metadata
- Provider-agnostic interface
- Parallel provider queries for performance

#### Memory Management System
- User-specific memory storage
- Context injection into research workflows
- CRUD operations with search capabilities
- PostgreSQL-based persistence

#### Streaming Chat
- Real-time response streaming via SSE
- Character-by-character response display
- Message actions (copy, rewrite)
- Context-aware responses using research data

#### Enhanced Export
- Multi-format export (Markdown, PDF, LaTeX)
- Structured report generation
- Download management
- Format-specific optimizations

#### Advanced UI/UX
- Dark/light theme system
- Responsive design patterns
- Research timeline visualization
- Source cards with metadata
- Animated backgrounds
- Loading skeletons

### API Architecture

The platform exposes 54 total endpoints:

#### AI Engine (10 endpoints)
- `/health` - Health check
- `/research` - Main research pipeline
- `/search` - Unified web search
- `/search/providers` - Available providers
- `/agent/{slug}` - Individual agent execution
- `/agent/interactive_chatbot/stream` - Streaming chat
- `/usage/stats` - Token usage statistics
- `/usage/job/{id}` - Job-specific usage

#### Backend (44 endpoints)
- **Authentication**: register, login
- **Research**: CRUD, status tracking, search proxy
- **Chat**: message, streaming
- **Memory**: CRUD, search
- **Export**: markdown, PDF, LaTeX
- **Events**: submission, streaming
- **User**: profile, settings

### Data Flow

```
Frontend → Backend → AI Engine
    ↓         ↓         ↓
UI State  PostgreSQL  LLM Providers
    ↓         ↓         ↓
React     Research    Agents
Components Sessions   Pipeline
```

### Technology Stack

**AI Engine:**
- Python 3.9+
- FastAPI for async web framework
- LangChain for LLM integration
- LangGraph for agent orchestration
- SQLite for checkpointing

**Backend:**
- Node.js 18+
- Express.js for REST API
- PostgreSQL for data persistence
- JWT for authentication
- Server-Sent Events for streaming

**Frontend:**
- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Zustand for state management
- Lucide React for icons

### Deployment Architecture

The platform supports multiple deployment patterns:

1. **Development**: All services on localhost
2. **Docker Compose**: Containerized deployment
3. **Cloud Native**: Separate service deployments

### Security Features

- JWT-based authentication
- User isolation for memories and research
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Token-based LLM access

### Performance Optimizations

- LLM connection pooling
- Parallel search provider queries
- Response streaming for large outputs
- Token usage tracking and limits
- Database query optimization
- Frontend lazy loading

### Monitoring and Observability

- Structured logging across all services
- Real-time event streaming
- Token usage analytics
- Error tracking and reporting
- Performance metrics
- Health check endpoints

#### Core Agents (Target: 8–10 Total)
1. **Orchestrator Agent** — Routes tasks, manages pipelines.
2. **Paper Ingestion & Decomposition Agent** — PDF/LaTeX extraction, section breakdown.
3. **Understanding & Summary Agent** — Generates summaries, key claims.
4. **Technical Verification & Reproducibility Agent** (Merged) — Checks claims, attempts code repro (with sandbox).
5. **Critique & Adversarial Agent** (Merged) — Reviewer-style critique, overclaim detection.
6. **Multi-Paper Synthesis Agent** (For full pipeline) — Gap analysis, comparisons.
7. **Novelty & Innovation Agent** — Generates new ideas (full pipeline only).
8. **Validation & Reliability Scoring Agent** — Final verdict, hallucination check.
9. **Interactive Chatbot Agent** — Context-loaded chat.
10. **Report & LaTeX Generation Agent** — Outputs formatted results.

#### Shared/Support Agents
- Memory & Knowledge Graph
- Claim-Evidence Mapping
- Code Execution Sandbox (separate tool)

This reduction follows 2026 best practices: minimize handoffs, use stateful graphs (LangGraph), avoid redundancy.

## Tech Stack (Latest Recommendations - February 2026)

### Orchestration Frameworks (Top Choices per 2026 Reviews)
| Rank | Framework     | Strengths                                      | Weaknesses                          | Recommendation |
|------|---------------|------------------------------------------------|-------------------------------------|----------------|
| 1    | LangGraph    | Best for complex stateful flows, debugging, production scalability | Steeper learning curve              | Primary choice |
| 2    | CrewAI       | Easiest for role-based agents, quick prototyping | Less flexible for custom graphs     | Good alternative |
| 3    | AutoGen      | Strong multi-agent conversation, code execution | Microsoft-heavy, more verbose       | If heavy code repro needed |

**Choice**: Start with **LangGraph** (top-ranked in 2026 tier lists from Medium, TowardsAI, CapSolver).

### Models & APIs
- **Local Development**: Ollama (Llama 3.1 405B quantized, Mistral Large, etc.) — $0 cost.
- **Deployment Providers** (User-provided keys):
  - **Google Gemini** (latest: Gemini 3 series / 2.5 series per ai.google.dev/pricing):
    - Gemini 3 Pro Preview: Input $2–4 / 1M tokens, Output $12–18 / 1M (paid).
    - Gemini 3 Flash Preview: Input $0.50–1 / 1M, Output $3 / 1M.
    - Gemini 2.5 Pro/Flash: Lower costs (~$0.30–2.50 / 1M output).
    - Free tiers available for newer Flash models.
  - **Groq**: Pay-as-you-go, Developer Tier with up to 25% discounts (2025–2026 announcements). Known for fastest inference; exact per-token rates model-specific (typically <$1 / 1M for large models).
  - **Hugging Face Inference Endpoints**: Hourly GPU pricing (e.g., 1x H100 $4.50–10/hour depending on cloud). No per-token for dedicated; use for custom/open models.

**Token Tracking**: Mandatory — use LangChain/LangGraph callbacks.

### Frontend
- Gradio or Chainlit (best for agent visibility in 2026).
- Alternatives: Streamlit (simple), custom Next.js (overkill).

### Other Tools
- PDF Processing: PyMuPDF, unstructured.io.
- Code Sandbox: Docker-based execution (secure).
- Deployment: Render.com, Vercel, or DigitalOcean droplet.

## Success Criteria (Final Production Targets)

| Criterion                  | Target                               | Measurement                          | Realistic (2026 Cloud APIs)? |
|--------------------------------|--------------------------------------|--------------------------------------|-----------------------------|
| Pipeline Completion Rate      | 95% on diverse papers               | 100-test run suite                   | Yes                        |
| Single-Paper Time             | <5 min                              | Groq/Gemini fast models              | Yes                        |
| Full Pipeline (10 papers)     | <30 min                             | Parallel agents                      | Possible                   |
| Reproducibility Accuracy      | ≥85% on PapersWithCode              | Blind eval                           | Yes with Gemini 3/Groq     |
| Critique Quality              | ≥80% matches human grad-student     | Side-by-side review                  | Borderline — needs testing |
| Novelty Plausibility          | ≥70% rated original by experts      | Expert panel                         | Hard — frontier models only|
| Hallucination Rate            | <10%                                | Detection + manual                   | Achievable                 |
| Cost per Run (User)           | $5–50 (transparent)                 | Real tracking                        | Depends on usage           |
| Concurrent Users              | 100+                                | Load testing                         | With proper hosting        |

**Reality**: With Gemini 3/Groq, high accuracy is possible but costs add up ($10–50 for complex runs). Local Ollama will be slower/weaker.

## Frontend Design (Deployment Version)

### Key Pages
1. **API Setup** (First visit)
   - Inputs for Gemini Key 1/2, Groq Key 1/2, HF Token.
   - Links to official pricing.

2. **Dashboard**
   - Token usage today/total.
   - Upload PDFs or arXiv IDs.
   - Pipeline selection.
   - Estimated cost before run.

3. **Results Page**
   - Full analysis with sections.
   - Token/cost breakdown.
   - Export options.
   - Chat tab.

4. **Usage History Tab**
   - Table of past runs with costs.

**Implementation Note**: <300 lines possible with Gradio + LangGraph.

## Risks & Honest Assessment (February 2026)

- **Complexity**: Even simplified, 10+ agents risk error cascades, high latency, debugging hell. Most 2026 production multi-agent apps stay <8 agents.
- **Costs**: Cloud APIs are not cheap — Gemini 3 output tokens expensive ($12+/M). Users may abandon if runs cost $20+.
- **Accuracy Limits**: Reproducibility/code execution still hard without perfect sandbox. Novelty generation often generic.
- **Competition**: Tools like Elicit, Scite, Consensus already dominate — yours needs unique edge (e.g., better repro).
- **Development Reality**: Local Ollama good for prototype, but final quality requires cloud frontier models.

**Overall Feasibility**: 6–7/10. Achievable as personal tool; hard to make competitive product without major iteration and testing.

## Next Steps
1. Build simplified Pipeline B with LangGraph + Ollama (5 agents).
2. Test on 20 real papers.
3. Add token tracking and multi-provider support.
4. Deploy basic Gradio app.

If you need code templates or specific agent prompts, provide details on your current setup.
```

This document is complete and self-contained. Use it as your project README.md. All data sourced from official sites and latest 2026 searches — no fluff, just facts.