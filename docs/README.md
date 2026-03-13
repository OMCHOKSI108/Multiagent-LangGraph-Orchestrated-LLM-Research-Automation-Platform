# Paperguide Backend Documentation

## Overview
Multi-agent research automation backend built with Node.js/Express, PostgreSQL, and optional Redis. Provides APIs for user management, workspace isolation, research orchestration, chat, and admin operations.

---

## Table of Contents
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Users](#users)
  - [Workspaces](#workspaces)
  - [Research](#research)
  - [Chat](#chat)
  - [Events (SSE)](#events-sse)
  - [Agents](#agents)
  - [Sources](#sources)
  - [Export](#export)
  - [Usage](#usage)
  - [Admin](#admin)
- [Environment Variables](#environment-variables)
- [Worker Process](#worker-process)

---

## Architecture

### Services
- **API Server**: Express.js on port 5000
- **Database**: PostgreSQL (persistent)
- **Cache**: Redis (optional, for SSE tokens)
- **AI Engine**: Python/FastAPI on port 8000 (orchestrates research)
- **Worker**: Node.js process that polls research_sessions and forwards to AI Engine

### Key Design Patterns
- **Workspace Isolation**: All research artifacts scoped by workspace UUID
- **Backward Compatibility**: Supports both legacy `research_logs` and new `research_sessions`
- **Dual Source Support**: `data_sources` and `execution_events` can reference either table
- **Soft Deletes**: Workspaces are archived, not deleted
- **Cascade Deletes**: FK constraints ensure cleanup
- **JWT + API Keys**: Users authenticate via JWT; external access via per-user API keys

---

## Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### api_keys
```sql
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    key_value VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) DEFAULT 'Default Key',
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### workspaces
```sql
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### research_sessions (workspace-aware)
```sql
CREATE TABLE research_sessions (
    id SERIAL PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    refined_topic TEXT,
    title VARCHAR(500),
    status VARCHAR(50) DEFAULT 'queued',
    trigger_source VARCHAR(20) DEFAULT 'user',
    depth VARCHAR(20) DEFAULT 'deep',
    result_json JSONB,
    report_markdown TEXT,
    latex_source TEXT,
    retry_count INTEGER DEFAULT 0,
    current_stage VARCHAR(50) DEFAULT 'queued',
    share_token VARCHAR(100),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### workspace_uploads
```sql
CREATE TABLE workspace_uploads (
    id SERIAL PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    filename VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size_bytes BIGINT,
    embedding_status VARCHAR(20) DEFAULT 'pending',
    chunk_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### data_sources
```sql
CREATE TABLE data_sources (
    id SERIAL PRIMARY KEY,
    research_id INTEGER REFERENCES research_logs(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    source_type VARCHAR(50) NOT NULL,
    domain VARCHAR(255),
    url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    items_found INTEGER DEFAULT 0,
    title VARCHAR(500),
    description TEXT,
    favicon VARCHAR(500),
    thumbnail VARCHAR(500),
    published_date VARCHAR(50),
    citation_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### chat_history
```sql
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    research_session_id INTEGER REFERENCES research_sessions(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### execution_events
```sql
CREATE TABLE execution_events (
    id SERIAL PRIMARY KEY,
    research_id INTEGER REFERENCES research_logs(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES research_sessions(id) ON DELETE SET NULL,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    stage VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    category VARCHAR(50) DEFAULT 'stage',
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### user_memories
```sql
CREATE TABLE user_memories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    source_id INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### embeddings_meta
```sql
CREATE TABLE embeddings_meta (
    id SERIAL PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES research_sessions(id) ON DELETE SET NULL,
    source_type VARCHAR(50),
    source_url TEXT,
    chunk_index INTEGER,
    vector_id VARCHAR(255),
    content_preview TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Reference

### Base URL
```
http://localhost:5000/api
```

All mutation routes require:
- JWT Bearer token (user sessions)
- OR valid API key (external integrations)

---

### Authentication

#### POST /auth/signup
Create a new user account.

**Request**
```json
{
  "username": "jdoe",
  "email": "jdoe@example.com",
  "password": "securePassword123"
}
```

**Response 201**
```json
{
  "message": "User created",
  "user": {
    "id": 1,
    "username": "jdoe",
    "email": "jdoe@example.com"
  }
}
```

#### POST /auth/login
Authenticate and receive JWT.

**Request**
```json
{
  "email": "jdoe@example.com",
  "password": "securePassword123"
}
```

**Response 200**
```json
{
  "token": "eyJ...",
  "user": {
    "id": 1,
    "username": "jdoe",
    "email": "jdoe@example.com"
  }
}
```

#### OAuth (Google/GitHub)
- `GET /auth/google` – Initiate Google OAuth
- `GET /auth/google/callback` – Handle OAuth callback, return JWT via redirect
- `GET /auth/github` – Initiate GitHub OAuth
- `GET /auth/github/callback` – Handle OAuth callback, return JWT via redirect

---

### Users

#### POST /user/apikey/generate
Generate a new API key for the authenticated user.

**Headers**
```
Authorization: Bearer <jwt>
```

**Response 200**
```json
{
  "message": "API Key Generated",
  "key": {
    "key_value": "abcdef123456...",
    "name": "Default Key"
  }
}
```

#### GET /user/history
Fetch user's research history.

**Response 200**
```json
[
  {
    "id": 1,
    "title": "AI in Healthcare",
    "task": "research AI in healthcare",
    "status": "completed",
    "created_at": "2024-03-12T10:00:00Z"
  }
]
```

---

### Workspaces

#### GET /workspaces
List all workspaces for the authenticated user with session counts.

**Response 200**
```json
{
  "workspaces": [
    {
      "id": "550e8400-e29b-41d4...",
      "name": "Healthcare AI",
      "description": "Research on AI applications in healthcare",
      "status": "active",
      "session_count": 3,
      "last_activity": "2024-03-12T15:30:00Z",
      "created_at": "2024-03-10T09:00:00Z"
    }
  ]
}
```

#### POST /workspaces
Create a new workspace.

**Request**
```json
{
  "name": "Climate Research",
  "description": "Climate change and AI research"
}
```

**Response 201**
```json
{
  "workspace": {
    "id": "550e8400-e29b-41d4...",
    "name": "Climate Research",
    "description": "Climate change and AI research",
    "status": "active",
    "created_at": "2024-03-12T11:00:00Z"
  }
}
```

#### GET /workspaces/:wid
Get workspace details with sessions and uploads.

**Response 200**
```json
{
  "workspace": { /* workspace object */ },
  "sessions": [
    {
      "id": 1,
      "topic": "AI in healthcare",
      "refined_topic": "Applications of AI in clinical settings",
      "title": "AI in Clinical Settings",
      "status": "completed",
      "depth": "deep",
      "current_stage": "completed",
      "started_at": "2024-03-12T11:05:00Z",
      "completed_at": "2024-03-12T11:35:00Z",
      "created_at": "2024-03-12T11:00:00Z"
    }
  ],
  "uploads": [
    {
      "id": 1,
      "filename": "research_paper.pdf",
      "file_type": ".pdf",
      "file_size_bytes": 2048576,
      "embedding_status": "done",
      "chunk_count": 42,
      "created_at": "2024-03-12T10:30:00Z"
    }
  ]
}
```

#### PATCH /workspaces/:wid
Update workspace name or description.

**Request**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

#### DELETE /workspaces/:wid
Archive a workspace (soft delete).

**Response 200**
```json
{
  "success": true,
  "message": "Workspace archived"
}
```

#### POST /workspaces/:wid/research/start
Start a new research session within a workspace.

**Request**
```json
{
  "topic": "Quantum computing applications",
  "depth": "deep"
}
```

**Response 202**
```json
{
  "message": "Research session queued",
  "session_id": 123,
  "workspace_id": "550e8400-e29b-41d4...",
  "topic": "Quantum computing applications",
  "status": "queued",
  "status_url": "/workspaces/550e8400-e29b-41d4.../research/123/status"
}
```

#### GET /workspaces/:wid/research/:sid/status
Get detailed session status and results.

**Response 200**
```json
{
  "id": 123,
  "topic": "Quantum computing applications",
  "refined_topic": "Quantum algorithms in drug discovery",
  "title": "Quantum in Drug Discovery",
  "status": "completed",
  "depth": "deep",
  "current_stage": "completed",
  "result_json": { /* AI pipeline results */ },
  "report_markdown": "# Quantum in Drug Discovery\n\n...",
  "latex_source": "\\documentclass{article}...",
  "started_at": "2024-03-12T11:05:00Z",
  "completed_at": "2024-03-12T11:35:00Z",
  "created_at": "2024-03-12T11:00:00Z",
  "updated_at": "2024-03-12T11:35:00Z"
}
```

#### POST /workspaces/:wid/research/:sid/topic
Lock/refine the research topic.

**Request**
```json
{
  "topic": "Quantum machine learning in healthcare"
}
```

#### GET /workspaces/:wid/research/:sid/suggestions
Get AI-generated topic suggestions.

**Response 200**
```json
{
  "topic_locked": false,
  "selected_topic": null,
  "topic_suggestions": [
    "Quantum algorithms in drug discovery",
    "Quantum ML for clinical trials",
    "Quantum computing in genomics"
  ]
}
```

#### GET /workspaces/:wid/sources
List all scraped sources across workspace sessions.

**Response 200**
```json
{
  "sources": [
    {
      "id": 1,
      "source_type": "arxiv",
      "domain": "arxiv.org",
      "url": "https://arxiv.org/abs/2401.12345",
      "status": "completed",
      "items_found": 15,
      "title": "Quantum Algorithms for Drug Discovery",
      "description": "Novel quantum approaches...",
      "created_at": "2024-03-12T10:15:00Z"
    }
  ]
}
```

#### POST /workspaces/:wid/upload
Upload a file for RAG embedding.

**Request** (multipart/form-data)
```
file: <binary>
```

**Response 200**
```json
{
  "success": true,
  "filename": "research.pdf",
  "chunks_added": 38,
  "upload_id": 42
}
```

---

### Research

#### POST /research/start (Legacy)
Start a research job using API key (non-workspace flow).

**Request**
```json
{
  "task": "AI in healthcare",
  "depth": "deep",
  "api_key": "abcdef123456..."
}
```

**Response 202**
```json
{
  "message": "Research Job Queued",
  "job_id": 456,
  "status_url": "/research/status/456"
}
```

#### GET /research/status/:id (Unified)
Check status across both `research_logs` and `research_sessions`.

**Response 200**
```json
{
  "id": 456,
  "task": "AI in healthcare",
  "title": "AI in Healthcare",
  "status": "completed",
  "current_stage": "completed",
  "result_json": { /* results */ },
  "report_markdown": "# AI in Healthcare\n\n...",
  "latex_source": "\\documentclass{article}...",
  "started_at": "2024-03-12T10:00:00Z",
  "completed_at": "2024-03-12T10:45:00Z",
  "created_at": "2024-03-12T09:30:00Z",
  "updated_at": "2024-03-12T10:45:00Z"
}
```

#### DELETE /research/:id
Delete a research job.

#### POST /research/:id/share
Generate a public share link.

**Response 200**
```json
{
  "shareToken": "abc123def456",
  "shareUrl": "https://app.example.com/shared/abc123def456"
}
```

---

### Chat

#### POST /chat/message
Send a message to the research chatbot with RAG context.

**Request**
```json
{
  "research_id": 123,
  "message": "What are the key findings?",
  "api_key": "abcdef123456...",
  "session_id": "optional-session-id"
}
```

**Response 200**
```json
{
  "session_id": "chat-session-123",
  "reply": "The key findings include...",
  "agent": "interactive_chatbot"
}
```

#### GET /chat/history/:session_id
Retrieve chat history.

**Response 200**
```json
[
  {
    "id": 1,
    "role": "user",
    "message": "What are the key findings?",
    "created_at": "2024-03-12T10:00:00Z"
  },
  {
    "id": 2,
    "role": "assistant",
    "message": "The key findings include...",
    "created_at": "2024-03-12T10:01:00Z"
  }
]
```

---

### Events (SSE)

#### GET /events/token/:research_id
Get a short-lived SSE token for live progress.

**Response 200**
```json
{
  "token": "sse-token-abc123",
  "expires_in": 60
}
```

#### GET /events/stream/:token
Server-Sent Events stream of execution events.

**Event Format**
```
data: {"type":"stage","stage":"topic_discovery","message":"Starting topic discovery..."}
data: {"type":"agent","agent":"domain_intelligence","message":"Analyzing domain..."}
```

---

### Agents

#### GET /agents
List all available AI agents.

**Response 200**
```json
[
  {
    "slug": "domain_intelligence",
    "name": "Domain Intelligence",
    "description": "Analyzes domain-specific context..."
  },
  {
    "slug": "historical_review",
    "name": "Historical Review",
    "description": "Reviews historical literature..."
  }
]
```

#### POST /agents/:agent_slug/test
Test an individual agent.

**Request**
```json
{
  "task": "AI in healthcare",
  "options": {
    "max_papers": 10
  }
}
```

**Response 200**
```json
{
  "result": "Test completed successfully",
  "output": "Domain analysis complete...",
  "execution_time": 12.5
}
```

#### GET /providers
List configured search providers.

**Response 200**
```json
{
  "providers": [
    {
      "name": "duckduckgo",
      "enabled": true,
      "config": {}
    },
    {
      "name": "google",
      "enabled": false,
      "config": {"requires_api_key": true}
    }
  ]
}
```

---

### Sources

#### GET /sources/:session_id
List scraped sources for a research session.

**Response 200**
```json
{
  "sources": [
    {
      "id": 1,
      "url": "https://arxiv.org/abs/2401.12345",
      "title": "Quantum Algorithms for Drug Discovery",
      "content": "Abstract content...",
      "source_type": "arxiv",
      "scraped_at": "2024-03-12T10:15:00Z"
    }
  ],
  "count": 1
}
```

#### POST /sources/scrape
Trigger a URL scrape via AI Engine.

**Request**
```json
{
  "session_id": 123,
  "url": "https://example.com/paper"
}
```

#### POST /sources/bulk
Store multiple scraped sources.

**Request**
```json
{
  "sources": [
    {
      "url": "https://arxiv.org/abs/2401.12345",
      "title": "Paper Title",
      "content": "Abstract content..."
    }
  ]
}
```

---

### Export

#### GET /export/:id/:format
Download research results in various formats.

**Formats**: `markdown`, `pdf`, `latex`, `zip`

**Response**: File download with appropriate MIME type.

---

### Usage

#### GET /usage/stats
Get aggregated usage statistics.

**Query Parameters**
- `hours` (default: 24) – Time window for stats

**Response 200**
```json
{
  "total_research": 15,
  "completed": 12,
  "failed": 1,
  "api_calls": 145,
  "totalTokens": 250000,
  "cost": 2.34,
  "history": [
    {
      "date": "3/10/24",
      "tokens": 50000,
      "provider": "openai"
    }
  ]
}
```

#### POST /usage/test-connection
Test connectivity to an LLM provider.

**Request**
```json
{
  "provider": "openai",
  "api_key": "sk-..."
}
```

---

### Admin

All admin routes require:
- Header: `X-Admin-Key: <ADMIN_SECRET_KEY>`
- OR JWT with `role: 'admin'`

#### GET /admin/users
List all users with aggregated stats.

**Response 200**
```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin",
      "is_active": true,
      "workspace_count": 3,
      "research_count": 12,
      "last_active": "2024-03-12T09:30:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "status": "active"
    }
  ]
}
```

#### POST /admin/users/:id/disable
Enable/disable a user account.

**Request**
```json
{
  "action": "disable"
}
```

#### DELETE /admin/users/:id
Delete a user and cascade delete all data.

#### GET /admin/stats/overview
Global platform statistics.

**Response 200**
```json
{
  "stats": {
    "total_users": 150,
    "total_workspaces": 340,
    "total_research_jobs": 1250,
    "active_research_jobs": 8
  }
}
```

#### GET /admin/research
List all research jobs across all users.

**Response 200**
```json
{
  "research": [
    {
      "id": 1,
      "task": "AI in healthcare",
      "status": "completed",
      "user_email": "researcher@example.com",
      "created_at": "2024-03-12T10:00:00Z"
    }
  ]
}
```

---

## Environment Variables

### Required
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-super-secret-jwt-key
AI_ENGINE_SECRET=shared-secret-with-ai-engine
```

### Optional
```bash
# CORS
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Redis (for SSE tokens)
REDIS_URL=redis://localhost:6379/0

# AI Engine
AI_ENGINE_URL=http://localhost:8000

# Admin
ADMIN_SECRET_KEY=dr_admin_super_secret_108

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MIN=60
```

---

## Worker Process

The worker process:
1. Polls `research_sessions` for rows with `status='queued'` and `trigger_source='user'`
2. Forwards jobs to AI Engine `/research` endpoint
3. Updates session status based on AI Engine callbacks
4. Uses PostgreSQL LISTEN/NOTIFY for real-time updates (with Redis fallback)

---

## Error Handling

All endpoints return consistent error format:
```json
{
  "error": "Human-readable error message"
}
```

Standard HTTP status codes:
- `200` – Success
- `201` – Created
- `202` – Accepted (async)
- `400` – Bad Request
- `401` – Unauthorized
- `403` – Forbidden
- `404` – Not Found
- `429` – Too Many Requests
- `500` – Internal Server Error
