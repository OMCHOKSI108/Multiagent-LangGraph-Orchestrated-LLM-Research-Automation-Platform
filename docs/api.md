# API List

This document lists API endpoints currently defined in the codebase.

## Backend API (Express)

Base URL (local): `http://localhost:5001`

### Health
- `GET /`
- `GET /api/health`

### Auth (`/api/auth`)
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `GET /api/auth/github`
- `GET /api/auth/github/callback`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `POST /api/auth/password`

### User (`/api/user`)
- `POST /api/user/apikey/generate`
- `GET /api/user/history`

### Workspace (`/api/workspaces`)
- `GET /api/workspaces/`
- `POST /api/workspaces/`
- `GET /api/workspaces/:wid`
- `PATCH /api/workspaces/:wid`
- `DELETE /api/workspaces/:wid`
- `POST /api/workspaces/:wid/research/start`
- `POST /api/workspaces/:wid/research/:sid/cancel`
- `GET /api/workspaces/:wid/research/:sid/status`
- `POST /api/workspaces/:wid/research/:sid/topic`
- `GET /api/workspaces/:wid/research/:sid/suggestions`
- `GET /api/workspaces/:wid/sources`
- `POST /api/workspaces/:wid/upload`
- `GET /api/workspaces/:wid/sessions/:id/sections`
- `POST /api/workspaces/:wid/sessions/:id/sections/:sectionId/edit`
- `GET /api/workspaces/:wid/sessions/:id/full-report`

### Research (`/api/research`)
- `POST /api/research/start`
- `GET /api/research/status/:id`
- `POST /api/research/search`
- `POST /api/research/:id/topic`
- `GET /api/research/:id/suggestions`
- `PATCH /api/research/:id/rename`
- `DELETE /api/research/:id`
- `POST /api/research/:id/share`
- `GET /api/research/shared/:token`

### Chat (`/api/chat`)
- `POST /api/chat/message`
- `POST /api/chat/stream`
- `GET /api/chat/history/:session_id`
- `POST /api/chat/fast`

### Events (`/api/events`)
- `GET /api/events/token/:research_id`
- `GET /api/events/stream/:research_id`
- `GET /api/events/stream-public/:research_id`
- `POST /api/events/`
- `POST /api/events/source`
- `PATCH /api/events/research/:id/rename`
- `GET /api/events/:research_id`
- `GET /api/events/:research_id/sources`

### Agents (`/api/agents`)
- `GET /api/agents/`
- `POST /api/agents/:agent_slug/test`
- `GET /api/agents/providers`
- `POST /api/agents/providers/test`
- `GET /api/agents/llm-status`
- `GET /api/agents/usage`

### Memories (`/api/memories`)
- `GET /api/memories/`
- `POST /api/memories/`
- `DELETE /api/memories/:id`
- `POST /api/memories/search`

### Export (`/api/export`)
- `GET /api/export/:id/markdown`
- `GET /api/export/:id/json`
- `GET /api/export/:id/pdf`
- `POST /api/export/compile`
- `GET /api/export/:id/latex`
- `GET /api/export/:id/zip`
- `GET /api/export/:id/plots`

### Usage (`/api/usage`)
- `GET /api/usage/stats`
- `POST /api/usage/test-connection`

### Sources (`/api/sources`)
- `GET /api/sources/:session_id`
- `POST /api/sources/scrape`
- `POST /api/sources/bulk`
- `DELETE /api/sources/:id`

### Admin Core (`/api/admin` from admin.routes.js)
- `GET /api/admin/users`
- `POST /api/admin/users/:id/disable`
- `PATCH /api/admin/users/:id/role`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/stats/overview`
- `GET /api/admin/logs`
- `GET /api/admin/research`
- `DELETE /api/admin/research/:id`
- `GET /api/admin/workspaces`
- `DELETE /api/admin/workspaces/:id/hard`
- `DELETE /api/admin/workspaces/:id`
- `PATCH /api/admin/workspaces/:wid`
- `GET /api/admin/chat/sessions`
- `GET /api/admin/chat/history/:session_id`
- `GET /api/admin/memories`
- `POST /api/admin/memories/search`
- `DELETE /api/admin/memories/:id`
- `GET /api/admin/api-keys`
- `POST /api/admin/api-keys/generate`
- `DELETE /api/admin/api-keys/:id`

### Admin Monitoring (`/api/admin` from monitoring.routes.js)
- `GET /api/admin/metrics/system`
- `GET /api/admin/metrics/api-usage`
- `GET /api/admin/metrics/database`
- `GET /api/admin/metrics/services`
- `GET /api/admin/metrics/ai-model`
- `POST /api/admin/metrics/llm/:metricType`
- `GET /api/admin/metrics/llm`
- `GET /api/admin/metrics/all`
- `GET /api/admin/alerts`
- `POST /api/admin/alerts/:alertId/acknowledge`
- `GET /api/admin/logs`
- `GET /api/admin/api-keys`
- `POST /api/admin/api-keys`
- `PATCH /api/admin/api-keys/:id/activate`
- `DELETE /api/admin/api-keys/:id`
- `GET /api/admin/api-keys/stats`
- `POST /api/admin/api-keys/rotate`

## AI Engine API (FastAPI)

Base URL (local): `http://localhost:8000`

### Health
- `GET /`
- `GET /health`
- `GET /metrics`
- `GET /llm/status`

### Providers
- `GET /providers`
- `GET /providers/status`
- `POST /providers/test`

### Agents
- `GET /agents`
- `POST /agents/{agent_slug}/test`
- `POST /agent/interactive_chatbot/stream`

### Usage
- `GET /usage/stats`
- `GET /usage/job/{job_id}`

### Research
- `POST /research`
- `POST /research/full-pipeline-run`
- `GET /research/{job_id}/suggestions`

### Chatbot
- `POST /chatbot/fast-chat`

### Search
- `POST /search`
- `POST /search/`
- `GET /search/providers`

### VectorStore
- `POST /vectorstore/search`
- `GET /vectorstore/{workspace_id}/stats`

---

Notes:
- Paths include parameter placeholders exactly as defined in route files.
- Some admin paths are defined in two files and may overlap (`/api/admin/logs`, `/api/admin/api-keys`).
- Auth and role requirements depend on middleware applied in each route/module.
