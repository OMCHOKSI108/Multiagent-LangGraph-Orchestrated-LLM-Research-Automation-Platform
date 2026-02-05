```markdown
# Research and Analysis Platform - Full Project Document

**Version**: 1.0 (February 03, 2026)  
**Author**: OM (based on ongoing development discussions)  
**Status**: Planning/Prototyping Phase (Local Ollama development → Cloud API deployment)

This is a complete project document compiled from all prior discussions and analyses. It incorporates the latest available data (February 2026) from official sources on models, pricing, and frameworks. All assessments are honest and realistic — this remains an ambitious project with high complexity risks.

## Project Overview

The platform is a multi-agent AI system for automated research paper analysis and synthesis.

**Core Features**:
- **Pipeline B**: Single-paper deep analysis (decomposition, understanding, verification, reproducibility, critique, interactive chatbot, reliability scoring).
- **Full Research Pipeline**: Multi-paper synthesis (domain review, gap identification, novelty generation, LaTeX output).
- Shared agents for validation, memory, hallucination detection.
- Input: PDF upload, arXiv ID/URL, LaTeX extraction.
- Output: Structured reports, critiques, novelty ideas, interactive chat, exports (Markdown/PDF/LaTeX).

**Current Development**: Local Ollama (open models like Llama 3.1, Mistral variants) for zero-cost prototyping.  
**Deployment Goal**: Web app where users provide their own API keys (Gemini, Groq, Hugging Face) and see real-time token/cost tracking.

## System Architecture (From Original Diagram)

The original design has **25+ agents** — this is too many for reliable implementation. Real-world multi-agent systems in 2026 (per latest benchmarks) use 5–12 agents max.

### Recommended Simplified Agent Structure (2026 Best Practices)
Merge overlapping agents based on LangGraph/CrewAI patterns.

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