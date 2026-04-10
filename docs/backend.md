# Backend API

The backend is a Node.js/Express API server that provides the interface between the frontend and the AI Engine.

## Base URL

By default, the API runs at `http://localhost:5000`.

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

## API Endpoints

### Authentication

#### POST /api/auth/signup
Create a new user account.

**Body:**
```json
{
  "username": "jdoe",
  "email": "jdoe@example.com",
  "password": "securePassword123"
}
```

#### POST /api/auth/login
Authenticate and receive JWT token.

**Body:**
```json
{
  "email": "jdoe@example.com",
  "password": "securePassword123"
}
```

### Workspaces

#### GET /api/workspaces
List all workspaces for the authenticated user.

#### POST /api/workspaces
Create a new workspace.

#### GET /api/workspaces/:wid
Get workspace details with sessions and uploads.

#### PATCH /api/workspaces/:wid
Update workspace name or description.

#### DELETE /api/workspaces/:wid
Archive a workspace (soft delete).

### Research

#### POST /api/workspaces/:wid/research/start
Start a new research session within a workspace.

**Body:**
```json
{
  "topic": "Quantum Computing",
  "depth": "deep"
}
```

#### GET /api/workspaces/:wid/research/:sid/status
Get detailed session status and results.

#### POST /api/workspaces/:wid/research/:sid/topic
Lock/refine the research topic.

#### GET /api/workspaces/:wid/research/:sid/suggestions
Get AI-generated topic suggestions.

### Chat

#### POST /api/chat/message
Send a message to the research chatbot with RAG context.

#### GET /api/chat/history/:session_id
Retrieve chat history.

### Events

#### GET /api/events/token/:research_id
Get a short-lived SSE token for live progress.

#### GET /api/events/stream/:token
Server-Sent Events stream of execution events.

### Agents

#### GET /api/agents
List all available AI agents.

#### POST /api/agents/:agent_slug/test
Test an individual agent.

### Memories

#### GET /api/memories
List all memories for the authenticated user.

#### POST /api/memories
Create a new memory.

#### DELETE /api/memories/:id
Delete a memory.

### Export

#### GET /api/export/:id/:format
Download research results in various formats (markdown, pdf, latex, zip).

### Usage

#### GET /api/usage/stats
Returns token usage statistics and cost estimates.

#### POST /api/user/apikey/generate
Generates a new API key for programmatic access.

### Admin

#### GET /api/admin/users
List all users with aggregated stats (admin only).

#### POST /api/admin/users/:id/disable
Enable/disable a user account (admin only).

#### GET /api/admin/stats/overview
Global platform statistics (admin only).

## Environment Variables

### Required
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-super-secret-jwt-key
AI_ENGINE_SECRET=shared-secret-with-ai-engine
```

### Optional
```bash
PORT=5000
REDIS_URL=redis://localhost:6379/0
AI_ENGINE_URL=http://localhost:8000
CORS_ORIGINS=https://yourdomain.com
```
