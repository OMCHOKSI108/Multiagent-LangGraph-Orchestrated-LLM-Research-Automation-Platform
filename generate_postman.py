#!/usr/bin/env python3
"""
Generate Postman Collection v2.1 JSON for AI Research Platform Backend API.
Extracted from all 12 route files + server.js health endpoints.
"""
import json, uuid

def uid(): return str(uuid.uuid4())

TEST_SCRIPT = 'pm.test("Status code is 200", function () {\n  pm.response.to.have.status(200);\n});\n\npm.test("Response time < 2s", function () {\n  pm.expect(pm.response.responseTime).to.be.below(2000);\n});'
PRE_REQ = 'console.log("Request:", pm.request.method, pm.request.url.toString());\nif (!pm.variables.get("token")) {\n  console.warn("Warning: token variable is not set");\n}'

AUTH_HEADER = [
    {"key": "Content-Type", "value": "application/json"},
    {"key": "Authorization", "value": "Bearer {{token}}"}
]
NO_AUTH_HEADER = [{"key": "Content-Type", "value": "application/json"}]

def req(name, method, url, headers, body=None, desc=""):
    r = {
        "name": name,
        "request": {
            "method": method,
            "header": headers,
            "url": {"raw": url, "host": ["{{base_url}}"], "path": url.replace("{{base_url}}/", "").split("/")},
            "description": desc
        },
        "response": [],
        "event": [
            {"listen": "test", "script": {"type": "text/javascript", "exec": TEST_SCRIPT.split("\n")}},
            {"listen": "prerequest", "script": {"type": "text/javascript", "exec": PRE_REQ.split("\n")}}
        ]
    }
    if body:
        r["request"]["body"] = {"mode": "raw", "raw": json.dumps(body, indent=2), "options": {"raw": {"language": "json"}}}
    return r

def folder(name, items):
    return {"name": name, "item": items}

# ═══ BUILD FOLDERS ═══

# 1. Health
health = folder("Health", [
    req("Root Health", "GET", "{{base_url}}/", NO_AUTH_HEADER, desc="Root health check"),
    req("API Health", "GET", "{{base_url}}/api/health", NO_AUTH_HEADER, desc="Docker health endpoint"),
])

# 2. Auth
auth_f = folder("Auth", [
    req("Signup", "POST", "{{base_url}}/api/auth/signup", NO_AUTH_HEADER,
        {"username": "testuser", "email": "test@example.com", "password": "password123"}, "Register new user"),
    req("Login", "POST", "{{base_url}}/api/auth/login", NO_AUTH_HEADER,
        {"email": "test@example.com", "password": "password123"}, "Login and get JWT token"),
    req("Get Current User", "GET", "{{base_url}}/api/auth/me", AUTH_HEADER, desc="Get current user profile (JWT required)"),
    req("Update Profile", "PATCH", "{{base_url}}/api/auth/me", AUTH_HEADER,
        {"username": "newusername"}, "Update current user profile"),
    req("Change Password", "POST", "{{base_url}}/api/auth/password", AUTH_HEADER,
        {"currentPassword": "password123", "newPassword": "newpassword456"}, "Change user password"),
    req("Google OAuth", "GET", "{{base_url}}/api/auth/google", NO_AUTH_HEADER, desc="Initiate Google OAuth flow"),
    req("GitHub OAuth", "GET", "{{base_url}}/api/auth/github", NO_AUTH_HEADER, desc="Initiate GitHub OAuth flow"),
])

# 3. User
user_f = folder("User", [
    req("Generate API Key", "POST", "{{base_url}}/api/user/apikey/generate", AUTH_HEADER,
        {"name": "My API Key"}, "Generate a new API key"),
    req("Get User History", "GET", "{{base_url}}/api/user/history", AUTH_HEADER, desc="Get research history for current user"),
])

# 4. Research
research_f = folder("Research", [
    req("Start Research", "POST", "{{base_url}}/api/research/start", NO_AUTH_HEADER,
        {"task": "AI in healthcare", "depth": "deep", "api_key": "{{api_key}}"}, "Queue a new research job"),
    req("Check Status", "GET", "{{base_url}}/api/research/status/{{research_id}}", AUTH_HEADER,
        desc="Check research job status"),
    req("Web Search", "POST", "{{base_url}}/api/research/search", NO_AUTH_HEADER,
        {"query": "quantum computing", "providers": ["duckduckgo"], "max_results": 10, "api_key": "{{api_key}}"}, "Proxy search to AI Engine"),
    req("Set Topic", "POST", "{{base_url}}/api/research/{{research_id}}/topic", AUTH_HEADER,
        {"topic": "Machine Learning in Drug Discovery"}, "Lock research topic"),
    req("Get Suggestions", "GET", "{{base_url}}/api/research/{{research_id}}/suggestions", AUTH_HEADER,
        desc="Get topic suggestions from AI Engine"),
    req("Rename Research", "PATCH", "{{base_url}}/api/research/{{research_id}}/rename", AUTH_HEADER,
        {"title": "Updated Research Title"}, "Rename a research"),
    req("Delete Research", "DELETE", "{{base_url}}/api/research/{{research_id}}", AUTH_HEADER,
        desc="Delete a research job"),
    req("Share Research", "POST", "{{base_url}}/api/research/{{research_id}}/share", AUTH_HEADER,
        desc="Generate share token for research"),
    req("Get Shared Research", "GET", "{{base_url}}/api/research/shared/{{share_token}}", NO_AUTH_HEADER,
        desc="View shared research (public)"),
])

# 5. Workspaces
ws_f = folder("Workspaces", [
    req("List Workspaces", "GET", "{{base_url}}/api/workspaces", AUTH_HEADER, desc="List all user workspaces"),
    req("Create Workspace", "POST", "{{base_url}}/api/workspaces", AUTH_HEADER,
        {"name": "My Research Workspace", "description": "A workspace for AI research"}, "Create new workspace"),
    req("Get Workspace", "GET", "{{base_url}}/api/workspaces/{{workspace_id}}", AUTH_HEADER,
        desc="Get workspace details with sessions"),
    req("Update Workspace", "PATCH", "{{base_url}}/api/workspaces/{{workspace_id}}", AUTH_HEADER,
        {"name": "Renamed Workspace", "description": "Updated description"}, "Update workspace"),
    req("Delete Workspace", "DELETE", "{{base_url}}/api/workspaces/{{workspace_id}}", AUTH_HEADER,
        desc="Archive workspace (soft delete)"),
    req("Start Research Session", "POST", "{{base_url}}/api/workspaces/{{workspace_id}}/research/start", AUTH_HEADER,
        {"topic": "Neural network architectures", "depth": "deep"}, "Start research in workspace"),
    req("Session Status", "GET", "{{base_url}}/api/workspaces/{{workspace_id}}/research/{{session_id}}/status", AUTH_HEADER,
        desc="Check session status"),
    req("Lock Session Topic", "POST", "{{base_url}}/api/workspaces/{{workspace_id}}/research/{{session_id}}/topic", AUTH_HEADER,
        {"topic": "Transformer Architecture Survey"}, "Lock topic for session"),
    req("Session Suggestions", "GET", "{{base_url}}/api/workspaces/{{workspace_id}}/research/{{session_id}}/suggestions", AUTH_HEADER,
        desc="Get topic suggestions for session"),
    req("List Workspace Sources", "GET", "{{base_url}}/api/workspaces/{{workspace_id}}/sources", AUTH_HEADER,
        desc="List scraped sources in workspace"),
    req("Upload File", "POST", "{{base_url}}/api/workspaces/{{workspace_id}}/upload", AUTH_HEADER,
        desc="Upload file for RAG embedding (multipart/form-data)"),
    req("Get Report Sections", "GET", "{{base_url}}/api/workspaces/{{workspace_id}}/sessions/{{session_id}}/sections", AUTH_HEADER,
        desc="Get all report sections"),
    req("Edit Section", "POST", "{{base_url}}/api/workspaces/{{workspace_id}}/sessions/{{session_id}}/sections/{{section_id}}/edit", AUTH_HEADER,
        {"instruction": "Make the introduction more concise"}, "AI-assisted section editing"),
    req("Get Full Report", "GET", "{{base_url}}/api/workspaces/{{workspace_id}}/sessions/{{session_id}}/full-report", AUTH_HEADER,
        desc="Get compiled full report from sections"),
])

# 6. Chat
chat_f = folder("Chat", [
    req("Send Message", "POST", "{{base_url}}/api/chat/message", NO_AUTH_HEADER,
        {"research_id": 1, "message": "Explain the methodology", "api_key": "{{api_key}}", "session_id": "{{chat_session_id}}"}, "Send chat message to research chatbot"),
    req("Stream Chat (SSE)", "POST", "{{base_url}}/api/chat/stream", NO_AUTH_HEADER,
        {"research_id": 1, "message": "Summarize the findings", "api_key": "{{api_key}}"}, "Stream chat response via SSE"),
    req("Get Chat History", "GET", "{{base_url}}/api/chat/history/{{chat_session_id}}", AUTH_HEADER,
        desc="Get chat history for session"),
    req("Fast Chat", "POST", "{{base_url}}/api/chat/fast", AUTH_HEADER,
        {"message": "How many nuclear weapons exist?", "session_id": "{{chat_session_id}}"}, "Fast conversational chat with web search"),
])

# 7. Events
events_f = folder("Events", [
    req("Get SSE Token", "GET", "{{base_url}}/api/events/token/{{research_id}}", AUTH_HEADER,
        desc="Get short-lived SSE auth token"),
    req("SSE Stream", "GET", "{{base_url}}/api/events/stream/{{research_id}}", AUTH_HEADER,
        desc="SSE stream for live research updates"),
    req("Post Event", "POST", "{{base_url}}/api/events", NO_AUTH_HEADER,
        {"research_id": 1, "stage": "topic_discovery", "severity": "info", "category": "stage", "message": "Starting topic discovery", "details": {}},
        "Insert execution event (called by AI Engine)"),
    req("Post Source", "POST", "{{base_url}}/api/events/source", NO_AUTH_HEADER,
        {"research_id": 1, "source_type": "web", "domain": "arxiv.org", "url": "https://arxiv.org/abs/2301.00001", "status": "success", "items_found": 5, "title": "Sample Paper", "description": "A research paper"},
        "Insert data source"),
    req("Rename Research (Events)", "PATCH", "{{base_url}}/api/events/research/{{research_id}}/rename", AUTH_HEADER,
        {"title": "New Title"}, "Rename research via events route"),
    req("Get Events History", "GET", "{{base_url}}/api/events/{{research_id}}", AUTH_HEADER,
        desc="Get execution event history"),
    req("Get Sources History", "GET", "{{base_url}}/api/events/{{research_id}}/sources", AUTH_HEADER,
        desc="Get data sources for research"),
])

# 8. Agents
agents_f = folder("Agents", [
    req("List Agents", "GET", "{{base_url}}/api/agents", NO_AUTH_HEADER, desc="List all available AI agents"),
    req("Test Agent", "POST", "{{base_url}}/api/agents/{{agent_slug}}/test", NO_AUTH_HEADER,
        {"task": "artificial intelligence in healthcare", "options": {}}, "Test an individual agent"),
    req("List Providers", "GET", "{{base_url}}/api/agents/providers", NO_AUTH_HEADER, desc="Get search providers"),
    req("Test Provider", "POST", "{{base_url}}/api/agents/providers/test", NO_AUTH_HEADER,
        {"provider": "duckduckgo", "query": "test query"}, "Test a search provider"),
])

# 9. Memories
memories_f = folder("Memories", [
    req("List Memories", "GET", "{{base_url}}/api/memories?page=1&limit=20", AUTH_HEADER,
        desc="List user memories (paginated)"),
    req("Create Memory", "POST", "{{base_url}}/api/memories", AUTH_HEADER,
        {"content": "Important research insight", "source": "manual", "metadata": {}}, "Create new memory"),
    req("Search Memories", "POST", "{{base_url}}/api/memories/search", AUTH_HEADER,
        {"query": "research insight", "limit": 20}, "Search memories by keyword"),
    req("Delete Memory", "DELETE", "{{base_url}}/api/memories/{{memory_id}}", AUTH_HEADER,
        desc="Delete a specific memory"),
])

# 10. Export
export_f = folder("Export", [
    req("Export Markdown", "GET", "{{base_url}}/api/export/{{research_id}}/markdown", AUTH_HEADER,
        desc="Download research as Markdown"),
    req("Export JSON", "GET", "{{base_url}}/api/export/{{research_id}}/json", AUTH_HEADER,
        desc="Download raw research JSON"),
    req("Export PDF", "GET", "{{base_url}}/api/export/{{research_id}}/pdf", AUTH_HEADER,
        desc="Download research as PDF"),
    req("Export LaTeX", "GET", "{{base_url}}/api/export/{{research_id}}/latex", AUTH_HEADER,
        desc="Download research as LaTeX"),
    req("Export ZIP Bundle", "GET", "{{base_url}}/api/export/{{research_id}}/zip", AUTH_HEADER,
        desc="Download ZIP bundle (md + tex + plots)"),
    req("Export Plots", "GET", "{{base_url}}/api/export/{{research_id}}/plots", AUTH_HEADER,
        desc="Download plots/diagrams as ZIP"),
    req("Compile to PDF", "POST", "{{base_url}}/api/export/compile", AUTH_HEADER,
        {"researchId": 1, "content": "# My Report\n\nThis is a compiled report."}, "Compile markdown to PDF"),
])

# 11. Usage
usage_f = folder("Usage", [
    req("Get Usage Stats", "GET", "{{base_url}}/api/usage/stats?hours=24", AUTH_HEADER,
        desc="Get usage statistics"),
    req("Test LLM Connection", "POST", "{{base_url}}/api/usage/test-connection", AUTH_HEADER,
        {"provider": "groq", "api_key": "your_api_key_here"}, "Test connection to LLM provider"),
])

# 12. Sources
sources_f = folder("Sources", [
    req("List Session Sources", "GET", "{{base_url}}/api/sources/{{session_id}}", AUTH_HEADER,
        desc="List scraped sources for session"),
    req("Scrape URL", "POST", "{{base_url}}/api/sources/scrape", AUTH_HEADER,
        {"session_id": 1, "url": "https://arxiv.org/abs/1706.03762"}, "Trigger URL scrape via AI Engine"),
    req("Bulk Insert Sources", "POST", "{{base_url}}/api/sources/bulk", AUTH_HEADER,
        {"session_id": 1, "sources": [{"url": "https://example.com", "title": "Example", "content": "Sample content"}]},
        "Bulk insert scraped sources"),
    req("Delete Source", "DELETE", "{{base_url}}/api/sources/{{source_id}}", AUTH_HEADER,
        desc="Delete a specific source"),
])

# 13. Admin
admin_f = folder("Admin", [
    req("List Users", "GET", "{{base_url}}/api/admin/users", AUTH_HEADER, desc="List all users with stats (admin only)"),
    req("Disable/Enable User", "POST", "{{base_url}}/api/admin/users/{{user_id}}/disable", AUTH_HEADER,
        {"action": "disable"}, "Disable or enable a user"),
    req("Change User Role", "PATCH", "{{base_url}}/api/admin/users/{{user_id}}/role", AUTH_HEADER,
        {"role": "admin"}, "Change user role"),
    req("Delete User", "DELETE", "{{base_url}}/api/admin/users/{{user_id}}", AUTH_HEADER,
        desc="Hard delete user and cascade"),
    req("Overview Stats", "GET", "{{base_url}}/api/admin/stats/overview", AUTH_HEADER,
        desc="Dashboard overview stats"),
    req("Get Logs", "GET", "{{base_url}}/api/admin/logs", AUTH_HEADER, desc="Get admin logs"),
    req("List All Research", "GET", "{{base_url}}/api/admin/research", AUTH_HEADER,
        desc="List all research across users"),
    req("Delete Research (Admin)", "DELETE", "{{base_url}}/api/admin/research/{{research_id}}", AUTH_HEADER,
        desc="Force delete research"),
    req("List All Workspaces", "GET", "{{base_url}}/api/admin/workspaces", AUTH_HEADER,
        desc="List all workspaces"),
    req("Delete Workspace (Admin)", "DELETE", "{{base_url}}/api/admin/workspaces/{{workspace_id}}", AUTH_HEADER,
        desc="Force delete workspace"),
    req("Edit Workspace (Admin)", "PATCH", "{{base_url}}/api/admin/workspaces/{{workspace_id}}", AUTH_HEADER,
        {"name": "Edited Name", "description": "Edited desc"}, "Edit any workspace"),
    req("List Chat Sessions", "GET", "{{base_url}}/api/admin/chat/sessions", AUTH_HEADER,
        desc="List all chat sessions"),
    req("View Chat Transcript", "GET", "{{base_url}}/api/admin/chat/history/{{chat_session_id}}", AUTH_HEADER,
        desc="View chat transcript"),
    req("List All Memories", "GET", "{{base_url}}/api/admin/memories", AUTH_HEADER,
        desc="List all memories globally"),
    req("Search Memories (Admin)", "POST", "{{base_url}}/admin/memories/search", AUTH_HEADER,
        {"query": "keyword"}, "Search all memories"),
    req("Delete Memory (Admin)", "DELETE", "{{base_url}}/api/admin/memories/{{memory_id}}", AUTH_HEADER,
        desc="Delete any memory"),
    req("List API Keys", "GET", "{{base_url}}/api/admin/api-keys", AUTH_HEADER,
        desc="List all API keys"),
    req("Generate API Key (Admin)", "POST", "{{base_url}}/api/admin/api-keys/generate", AUTH_HEADER,
        {"user_email": "user@example.com", "key_name": "Admin Generated Key"}, "Generate API key for user"),
    req("Revoke API Key", "DELETE", "{{base_url}}/api/admin/api-keys/{{key_id}}", AUTH_HEADER,
        desc="Revoke an API key"),
])

# 14. AI Engine Core (Direct Port 8000)
ai_core_header = [{"key": "Content-Type", "value": "application/json"}, {"key": "X-API-Key", "value": "{{ai_engine_secret}}"}]
ai_core = folder("AI Engine (Core)", [
    req("Service Info", "GET", "{{ai_url}}/", NO_AUTH_HEADER, desc="AI Engine root info"),
    req("Health Check", "GET", "{{ai_url}}/health", NO_AUTH_HEADER, desc="Standard health check"),
    req("Metrics", "GET", "{{ai_url}}/metrics", NO_AUTH_HEADER, desc="Internal metrics"),
    req("LLM Status", "GET", "{{ai_url}}/llm/status", NO_AUTH_HEADER, desc="Check OFFLINE/ONLINE mode and model config"),
    req("Providers Status", "GET", "{{ai_url}}/providers/status", NO_AUTH_HEADER, desc="Check all search providers connectivity"),
    req("Job Usage", "GET", "{{ai_url}}/usage/job/{{research_id}}", NO_AUTH_HEADER, desc="Token usage for specific job"),
    req("Update Research State", "POST", "{{ai_url}}/research/update-state", NO_AUTH_HEADER,
        {"research_id": 1, "state_update": {"selected_topic": "AI in Medicine"}}, "Human-in-the-loop state update"),
    req("Get Suggestions (Direct)", "GET", "{{ai_url}}/research/{{research_id}}/suggestions", NO_AUTH_HEADER, desc="Direct suggestion polling"),
    req("Vector Search", "POST", "{{ai_url}}/vectorstore/search", NO_AUTH_HEADER,
        {"workspace_id": "ws_123", "query": "transformer", "top_k": 5}, "Direct vector search"),
    req("Vector Stats", "GET", "{{ai_url}}/vectorstore/{{workspace_id}}/stats", NO_AUTH_HEADER, desc="Vector collection stats"),
    req("Vector Ingest", "POST", "{{ai_url}}/vectorstore/ingest", ai_core_header,
        {"workspace_id": "ws_123", "text": "Sample text to embed", "source_url": "http://test.com"}, "Direct document ingestion"),
    req("Direct Agent Call", "POST", "{{ai_url}}/agent/topic_discovery", NO_AUTH_HEADER,
        {"task": "Quantum Computing", "depth": "deep"}, "Directly call a specific agent by slug"),
])

# ═══ ASSEMBLE COLLECTION ═══
collection = {
    "info": {
        "_postman_id": uid(),
        "name": "AI Research Platform - Full Multi-Agent Suite",
        "description": "Comprehensive Postman Collection for the Multi-Agent LLM Research Platform.\n\n- Backend (Proxy): http://localhost:5000\n- AI Engine (Core): http://localhost:8000\n\nGenerated automatically via source code extraction.",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": [health, auth_f, user_f, research_f, ws_f, chat_f, events_f, agents_f, memories_f, export_f, usage_f, sources_f, admin_f, ai_core],
    "variable": [
        {"key": "base_url", "value": "http://localhost:5000", "type": "string"},
        {"key": "ai_url", "value": "http://localhost:8000", "type": "string"},
        {"key": "ai_engine_secret", "value": "your_ai_engine_secret_here", "type": "string"},
        {"key": "token", "value": "", "type": "string"},
        {"key": "api_key", "value": "", "type": "string"},
        {"key": "research_id", "value": "1", "type": "string"},
        {"key": "workspace_id", "value": "1", "type": "string"},
        {"key": "session_id", "value": "1", "type": "string"},
        {"key": "chat_session_id", "value": "", "type": "string"},
        {"key": "share_token", "value": "", "type": "string"},
        {"key": "agent_slug", "value": "topic_discovery", "type": "string"},
        {"key": "user_id", "value": "1", "type": "string"},
        {"key": "memory_id", "value": "1", "type": "string"},
        {"key": "section_id", "value": "1", "type": "string"},
        {"key": "source_id", "value": "1", "type": "string"},
        {"key": "key_id", "value": "1", "type": "string"},
    ]
}


output_path = "postman_collection.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print(f"✅ Postman Collection generated: {output_path}")
print(f"   Folders: {len(collection['item'])}")
total = sum(len(f['item']) for f in collection['item'])
print(f"   Total requests: {total}")
print(f"   Variables: {len(collection['variable'])}")
