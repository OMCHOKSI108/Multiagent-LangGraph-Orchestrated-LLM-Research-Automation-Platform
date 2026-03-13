# Paperguide Backend API Endpoints

## Base URL
```
http://localhost:5000/api
```

## Authentication

### POST /auth/signup
Create a new user.

**Request**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"jdoe","email":"jdoe@example.com","password":"securePass123"}'
```

**Response 201**
```json
{
  "message": "User created",
  "user": {"id":1,"username":"jdoe","email":"jdoe@example.com"}
}
```

### POST /auth/login
Authenticate user.

**Request**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jdoe@example.com","password":"securePass123"}'
```

**Response 200**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {"id":1,"username":"jdoe","email":"jdoe@example.com"}
}
```

### OAuth Endpoints
- `GET /auth/google` – Initiate Google OAuth
- `GET /auth/google/callback` – OAuth callback
- `GET /auth/github` – Initiate GitHub OAuth  
- `GET /auth/github/callback` – OAuth callback

---

## Users

### POST /user/apikey/generate
Generate API key for authenticated user.

**Request**
```bash
curl -X POST http://localhost:5000/api/user/apikey/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Research Key"}'
```

**Response 200**
```json
{
  "message": "API Key Generated",
  "key": {"key_value":"abc123def456...","name":"My Research Key"}
}
```

### GET /user/history
Get user's research history.

**Request**
```bash
curl -X GET http://localhost:5000/api/user/history \
  -H "Authorization: Bearer <token>"
```

---

## Workspaces

### GET /workspaces
List workspaces with session counts.

**Request**
```bash
curl -X GET http://localhost:5000/api/workspaces \
  -H "Authorization: Bearer <token>"
```

**Response 200**
```json
{
  "workspaces": [
    {
      "id": "550e8400-e29b-41d4-a9c9-7d4f5f1a1b3",
      "name": "Healthcare AI",
      "description": "AI applications in healthcare",
      "status": "active",
      "session_count": 3,
      "last_activity": "2024-03-12T15:30:00Z",
      "created_at": "2024-03-10T09:00:00Z"
    }
  ]
}
```

### POST /workspaces
Create new workspace.

**Request**
```bash
curl -X POST http://localhost:5000/api/workspaces \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Climate Research","description":"Climate change studies"}'
```

### GET /workspaces/:wid
Get workspace details with sessions and uploads.

**Request**
```bash
curl -X GET http://localhost:5000/api/workspaces/550e8400-e29b-41d4-a9c9-7d4f5f1a1b3 \
  -H "Authorization: Bearer <token>"
```

### PATCH /workspaces/:wid
Update workspace.

**Request**
```bash
curl -X PATCH http://localhost:5000/api/workspaces/550e8400-e29b-41d4-a9c9-7d4f5f1a1b3 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'
```

### DELETE /workspaces/:wid
Archive workspace.

**Request**
```bash
curl -X DELETE http://localhost:5000/api/workspaces/550e8400-e29b-41d4-a9c9-7d4f5f1a1b3 \
  -H "Authorization: Bearer <token>"
```

---

## Research

### POST /workspaces/:wid/research/start
Start research session in workspace.

**Request**
```bash
curl -X POST http://localhost:5000/api/workspaces/550e8400-e29b-41d4-a9c9-7d4f5f1a1b3/research/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"topic":"Quantum computing","depth":"deep"}'
```

**Response 202**
```json
{
  "message": "Research session queued",
  "session_id": 123,
  "status_url": "/workspaces/550e8400-e29b-41d4-a9c9-7d4f5f1a1b3/research/123/status"
}
```

### GET /workspaces/:wid/research/:sid/status
Get session status.

**Request**
```bash
curl -X GET http://localhost:5000/api/workspaces/550e8400-e29b-41d4-a9c9-7d4f5f1a1b3/research/123/status \
  -H "Authorization: Bearer <token>"
```

### POST /workspaces/:wid/research/:sid/topic
Lock/refine topic.

**Request**
```bash
curl -X POST http://localhost:5000/api/workspaces/550e8400-e29b-41d4-a9c9-7d4f5f1a1b3/research/123/topic \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"topic":"Refined topic name"}'
```

### GET /workspaces/:wid/research/:sid/suggestions
Get topic suggestions.

**Request**
```bash
curl -X GET http://localhost:5000/api/workspaces/550e8400-e29b-41d4-a9c9-7d4f5f1a1b3/research/123/suggestions \
  -H "Authorization: Bearer <token>"
```

### GET /workspaces/:wid/sources
List workspace sources.

**Request**
```bash
curl -X GET http://localhost:5000/api/workspaces/550e8400-e29b-41d4-a9c9-7d4f5f1a1b3/sources \
  -H "Authorization: Bearer <token>"
```

### POST /workspaces/:wid/upload
Upload file for RAG.

**Request**
```bash
curl -X POST http://localhost:5000/api/workspaces/550e8400-e29b-41d4-a9c9-7d4f5f1a1b3/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@research.pdf"
```

---

## Chat

### POST /chat/message
Send message with RAG.

**Request**
```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"research_id":123,"message":"What are key findings?","api_key":"abc123def456"}'
```

**Response 200**
```json
{
  "session_id": "chat-session-123",
  "reply": "The key findings include...",
  "agent": "interactive_chatbot"
}
```

### GET /chat/history/:session_id
Get chat history.

**Request**
```bash
curl -X GET http://localhost:5000/api/chat/history/chat-session-123 \
  -H "Authorization: Bearer <token>"
```

---

## Events (SSE)

### GET /events/token/:research_id
Get SSE token.

**Request**
```bash
curl -X GET http://localhost:5000/api/events/token/123 \
  -H "Authorization: Bearer <token>"
```

**Response 200**
```json
{
  "token": "sse-token-abc123",
  "expires_in": 60
}
```

### GET /events/stream/:token
Connect to SSE stream.

**Request**
```bash
curl -N -H "Accept: text/event-stream" \
  http://localhost:5000/api/events/stream/sse-token-abc123
```

**Event Stream**
```
data: {"type":"stage","stage":"topic_discovery","message":"Starting topic discovery..."}
data: {"type":"agent","agent":"domain_intelligence","message":"Analyzing domain..."}
```

---

## Agents

### GET /agents
List all agents.

**Request**
```bash
curl -X GET http://localhost:5000/api/agents \
  -H "Authorization: Bearer <token>"
```

### POST /agents/:agent_slug/test
Test agent.

**Request**
```bash
curl -X POST http://localhost:5000/api/agents/domain_intelligence/test \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"task":"AI in healthcare","options":{"max_papers":10}}'
```

---

## Export

### GET /export/:id/:format
Download research results.

**Formats**: `markdown`, `pdf`, `latex`, `zip`

**Request**
```bash
curl -X GET http://localhost:5000/api/export/123/markdown \
  -H "Authorization: Bearer <token>" \
  -o research_report.md
```

---

## Usage

### GET /usage/stats
Get usage statistics.

**Request**
```bash
curl -X GET "http://localhost:5000/api/usage/stats?hours=24" \
  -H "Authorization: Bearer <token>"
```

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
    {"date":"3/10/24","tokens":50000,"provider":"openai"}
  ]
}
```

---

## Admin

All admin routes require:
- Header: `X-Admin-Key: <ADMIN_SECRET_KEY>`
- OR JWT with `role: 'admin'`

### GET /admin/users
List all users with stats.

**Request**
```bash
curl -X GET http://localhost:5000/api/admin/users \
  -H "X-Admin-Key: dr_admin_super_secret_108"
```

### POST /admin/users/:id/disable
Disable/enable user.

**Request**
```bash
curl -X POST http://localhost:5000/api/admin/users/1/disable \
  -H "X-Admin-Key: dr_admin_super_secret_108" \
  -H "Content-Type: application/json" \
  -d '{"action":"disable"}'
```

### GET /admin/stats/overview
Global platform stats.

**Request**
```bash
curl -X GET http://localhost:5000/api/admin/stats/overview \
  -H "X-Admin-Key: dr_admin_super_secret_108"
```

### GET /admin/research
List all research across users.

**Request**
```bash
curl -X GET http://localhost:5000/api/admin/research \
  -H "X-Admin-Key: dr_admin_super_secret_108"
```

---

## Error Responses

All endpoints return consistent error format:
```json
{
  "error": "Human-readable error message"
}
```

Common HTTP status codes:
- `200` – Success
- `201` – Created
- `202` – Accepted (async)
- `400` – Bad Request
- `401` – Unauthorized
- `403` – Forbidden
- `404` – Not Found
- `429` – Too Many Requests
- `500` – Internal Server Error
