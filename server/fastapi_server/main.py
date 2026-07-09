from contextlib import asynccontextmanager
from fastapi.responses import HTMLResponse

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.routers.research import router as research_router
from app.routers.rag import router as rag_router
from app.routers.paper import router as paper_router
from app.routers.images import router as images_router
from app.routers.ai import router as ai_router
from app.routers.agents import router as agents_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Multiagent Research Automation Platform - FastAPI Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(research_router)
app.include_router(rag_router)
app.include_router(paper_router)
app.include_router(images_router)
app.include_router(ai_router)
app.include_router(agents_router)


@app.get("/", response_class=HTMLResponse)
async def root():
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Multiagent Research Automation Platform — FastAPI Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #1a1a1a; color: #e5a985; line-height: 1.6; padding: 2rem;
    }
    .container { max-width: 720px; margin: 0 auto; }
    h1 { font-size: 1.75rem; font-weight: 600; margin-bottom: .25rem; }
    .sub { color: #e5a98599; font-size: .9rem; margin-bottom: 2rem; }
    section { margin-bottom: 2rem; }
    h2 {
      font-size: 1.1rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: .05em; color: #e5a98577; margin-bottom: .75rem;
    }
    .card {
      background: #222; border: 1px solid #e5a98522; border-radius: 10px;
      padding: 1rem 1.25rem; margin-bottom: .5rem;
    }
    .route { font-weight: 600; color: #fff; font-family: monospace; font-size: .95rem; }
    .desc { color: #e5a985bb; font-size: .85rem; margin-top: 2px; }
    .badge {
      display: inline-block; font-size: .65rem; font-weight: 700; padding: 2px 8px;
      border-radius: 999px; margin-right: 8px; vertical-align: middle;
    }
    .get { background: #22c55e22; color: #22c55e; }
    .post { background: #3b82f622; color: #3b82f6; }
    .mono { font-family: monospace; font-size: .8rem; color: #e5a98599; }
    hr { border: none; border-top: 1px solid #e5a98515; margin: 1.5rem 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Multiagent Research Automation Platform</h1>
    <p class="sub">FastAPI AI Engine</p>

    <section>
      <h2>API Endpoints</h2>
      <div class="card">
        <span class="badge get">GET</span><span class="route">/</span>
        <div class="desc">Server status &amp; API index</div>
      </div>
      <div class="card">
        <span class="badge get">GET</span><span class="route">/api/health</span>
        <div class="desc">Health check</div>
      </div>
      <div class="card">
        <span class="badge post">POST</span><span class="route">/api/research/start</span>
        <div class="desc">Run full multi-agent research pipeline</div>
        <div class="mono">Body: { question, session_id?, user_id?, max_revisions? }</div>
      </div>
      <div class="card">
        <span class="badge get">GET</span><span class="route">/api/research/sessions/{session_id}</span>
        <div class="desc">Get research session with messages &amp; sources</div>
      </div>
      <div class="card">
        <span class="badge post">POST</span><span class="route">/api/rag/query</span>
        <div class="desc">Hybrid RAG search across document chunks</div>
        <div class="mono">Body: { query, session_id, top_k?, min_score? }</div>
      </div>
      <div class="card">
        <span class="badge post">POST</span><span class="route">/api/papers/{session_id}/chat</span>
        <div class="desc">Chat with the generated paper (RAG over paper + sources)</div>
      </div>
      <div class="card">
        <span class="badge post">POST</span><span class="route">/api/papers/{session_id}/edit</span>
        <div class="desc">Edit a paper section (saves new version with diff)</div>
      </div>
      <div class="card">
        <span class="badge get">GET</span><span class="route">/api/papers/{session_id}/versions</span>
        <div class="desc">List all paper versions</div>
      </div>
      <div class="card">
        <span class="badge get">GET</span><span class="route">/api/papers/{session_id}/versions/{version_id}</span>
        <div class="desc">Get a specific paper version</div>
      </div>
      <div class="card">
        <span class="badge get">GET</span><span class="route">/api/papers/{session_id}/export?format=markdown|latex|pdf</span>
        <div class="desc">Export paper as markdown, latex, or PDF</div>
      </div>
      <div class="card">
        <span class="badge post">POST</span><span class="route">/api/rag/enhanced-search</span>
        <div class="desc">Enhanced RAG with query rewrite + sub-questions + context compression</div>
      </div>
      <div class="card">
        <span class="badge post">POST</span><span class="route">/api/rag/answer</span>
        <div class="desc">RAG answer with faithfulness verification + reflexion + citation grounding</div>
      </div>
      <div class="card">
        <span class="badge post">POST</span><span class="route">/api/research/plans/{session_id}/approve</span>
        <div class="desc">Approve a research plan</div>
      </div>
      <div class="card">
        <span class="badge post">POST</span><span class="route">/api/images/search</span>
        <div class="desc">Search and store images for a research session</div>
      </div>
      <div class="card">
        <span class="badge get">GET</span><span class="route">/api/images/{session_id}</span>
        <div class="desc">Get stored images for a session</div>
      </div>
    </section>

    <section>
      <h2>AI Inference</h2>
      <div class="card">
        <span class="badge post">POST</span><span class="route">/api/ai/generate</span>
        <div class="desc">Centralized LLM generation with method overloading</div>
        <div class="mono">Body: { prompt, system_prompt+user_prompt, messages[], temperature, stream, generator }</div>
      </div>
      <div class="card">
        <span class="badge post">POST</span><span class="route">/api/ai/generate?stream=true</span>
        <div class="desc">SSE streaming generation</div>
      </div>
      <div class="card">
        <span class="badge post">POST</span><span class="route">/api/ai/rewrite</span>
        <div class="desc">Query rewriting for RAG</div>
      </div>
      <div class="card">
        <span class="badge post">POST</span><span class="route">/api/ai/sub-questions</span>
        <div class="desc">Sub-question generation</div>
      </div>
      <div class="card">
        <span class="badge post">POST</span><span class="route">/api/ai/context-compress</span>
        <div class="desc">Context compression</div>
      </div>
      <div class="card">
        <span class="badge post">POST</span><span class="route">/api/ai/faithfulness-check</span>
        <div class="desc">Faithfulness verification</div>
      </div>
      <div class="card">
        <span class="badge post">POST</span><span class="route">/api/ai/reflexion</span>
        <div class="desc">Reflexion revision for unsupported claims</div>
      </div>
    </section>

    <section>
      <h2>Agent Pipeline</h2>
      <div class="card" style="display:flex;flex-wrap:wrap;gap:8px;">
        <span style="background:#e5a98515;color:#e5a985;padding:4px 12px;border-radius:999px;font-size:.8rem;">Planner</span>
        <span style="background:#e5a98515;color:#e5a985;padding:4px 12px;border-radius:999px;font-size:.8rem;">Search</span>
        <span style="background:#e5a98515;color:#e5a985;padding:4px 12px;border-radius:999px;font-size:.8rem;">Crawl</span>
        <span style="background:#e5a98515;color:#e5a985;padding:4px 12px;border-radius:999px;font-size:.8rem;">Extract</span>
        <span style="background:#e5a98515;color:#e5a985;padding:4px 12px;border-radius:999px;font-size:.8rem;">Chunk+RAG</span>
        <span style="background:#e5a98515;color:#e5a985;padding:4px 12px;border-radius:999px;font-size:.8rem;">Reason</span>
        <span style="background:#e5a98515;color:#e5a985;padding:4px 12px;border-radius:999px;font-size:.8rem;">IEEE Paper</span>
        <span style="background:#e5a98515;color:#e5a985;padding:4px 12px;border-radius:999px;font-size:.8rem;">Cite</span>
        <span style="background:#e5a98515;color:#e5a985;padding:4px 12px;border-radius:999px;font-size:.8rem;">Write</span>
        <span style="background:#e5a98515;color:#e5a985;padding:4px 12px;border-radius:999px;font-size:.8rem;">Review</span>
      </div>
    </section>

    <hr>
    <p class="mono">LangGraph orchestrated research pipeline → Groq LLM → Exa search</p>
  </div>
</body>
</html>"""


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "fastapi-server"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
