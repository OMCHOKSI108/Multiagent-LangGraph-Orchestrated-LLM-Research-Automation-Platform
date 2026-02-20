# Multi-Agent LLM Research Automation Platform
### *Subject: AIML317 — Project III | Semester 6*

---

## SLIDE 1 — Project Overview

### Problem Statement
Academic research is a **time-intensive, manual process**. A researcher must search across dozens of databases, read hundreds of papers, identify gaps, verify claims, synthesize findings, and write a structured report — often taking **weeks to months** for a single literature review.

### Our Solution
A **fully autonomous, multi-agent AI platform** that performs end-to-end academic research — from a single topic query to a publication-ready research paper — in **under 30 minutes**.

| Aspect | Detail |
|--------|--------|
| **Project Title** | Multi-Agent LLM Research Automation Platform |
| **Domain** | Artificial Intelligence / Natural Language Processing |
| **Core Tech** | LangGraph Multi-Agent Orchestration + Large Language Models |
| **Deployment** | Full-Stack Web Application (React + Node.js + Python) |
| **Input** | A research topic or question (e.g., *"Transformer Architectures for NLP"*) |
| **Output** | Complete research paper (Markdown + LaTeX + PDF) with citations, diagrams, and images |

### Key Highlights
- **27 Specialized AI Agents** working collaboratively via a state-machine pipeline
- **Real-time Live Activity Feed** — watch agents think, search, and write
- **Multi-source RAG** — Arxiv, Google Scholar, PubMed, DuckDuckGo, Wikipedia, News
- **PRISMA-compliant** systematic literature review methodology
- **Interactive AI Chatbot** for post-research Q&A on findings
- **One-click export** to Markdown, LaTeX, and PDF formats

---

## SLIDE 2 — System Architecture & Technology Stack

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                               │
│                   React + TypeScript + Vite                         │
│            Zustand Store │ Tailwind CSS │ Shadcn/UI                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │ REST API + SSE (Server-Sent Events)
┌────────────────────────────▼────────────────────────────────────────┐
│                   BACKEND (Node.js + Express)                       │
│         JWT Auth │ PostgreSQL │ Job Queue │ Event Streaming          │
│         Routes: /auth, /research, /chat, /events, /export           │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP Proxy
┌────────────────────────────▼────────────────────────────────────────┐
│               AI ENGINE (Python + FastAPI + LangGraph)              │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  ORCHESTRATOR AGENT (Brain)                   │  │
│  │        Decomposes tasks → Assigns agents → Manages state      │  │
│  └──────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────────┘  │
│         │      │      │      │      │      │      │                 │
│    Discovery Review Scraper Synthesis Verify Report  Visual         │
│    Agents  Agents Agent   Agents   Agents Agents  Agent            │
│                                                                     │
│  LLM Providers: Google Gemini │ Groq │ Ollama (Local)              │
└─────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite, Zustand, Tailwind CSS, Shadcn/UI, Mermaid.js, KaTeX |
| **Backend** | Node.js, Express.js, PostgreSQL, JWT Authentication, bcrypt, SSE |
| **AI Engine** | Python 3.11, FastAPI, LangGraph, LangChain, BeautifulSoup, pypdf |
| **LLM Providers** | Google Gemini 2.0 Flash, Groq (Llama/Mistral), Ollama (Local) |
| **Data Sources** | Arxiv API, Google Scholar, PubMed, DuckDuckGo, Wikipedia, Google News, Kaggle |
| **DevOps** | Docker, Docker Compose, Vercel (Frontend), Nginx |

### Data Flow (How a Research Request Works)
```
User enters topic → Backend creates job → AI Engine receives task
    → Orchestrator plans pipeline stages
        → Discovery agents map the research landscape
        → Literature agents retrieve & screen papers (PRISMA)
        → Scraper agent extracts content from 10-20 URLs
        → Scoring agent rates source quality
        → Synthesis agent identifies gaps & findings
        → Report agent writes comprehensive Markdown paper
        → Visualization agent generates Mermaid diagrams + images
        → LaTeX agent converts report to publication-ready format
    → Results streamed back in real-time via SSE
→ User sees final paper with charts, tables, citations, and images
```

---

## SLIDE 3 — AI Agents & Research Pipeline

### The 27-Agent Architecture

Our platform uses **27 specialized AI agents**, each with a distinct role, organized into **10 functional categories**:

| # | Category | Agents | What They Do |
|---|----------|--------|--------------|
| 1 | **Orchestration** | Orchestrator Agent | Central brain — decomposes tasks, assigns agents, manages state machine |
| 2 | **Discovery** | Domain Intelligence, Historical Review | Maps research landscape using Google, Wikipedia, DuckDuckGo; traces topic evolution via Arxiv |
| 3 | **Literature Review** | Systematic Literature Review, Survey Meta-Analysis | PRISMA-compliant paper retrieval from Arxiv + Google Scholar; statistical meta-analysis |
| 4 | **Synthesis** | Gap Synthesis, Research Question Engineering, Conceptual Framework | Identifies research gaps, formulates rigorous questions, designs theoretical frameworks |
| 5 | **Innovation** | Innovation & Novelty, Baseline Reproduction, Validation & Robustness | Evaluates novelty (TRIZ/Blue Ocean), reproduces baselines, tests result robustness |
| 6 | **Paper Analysis** | Paper Decomposition, Paper Understanding | Parses PDFs into sections; deep comprehension focusing on contributions |
| 7 | **Verification** | Technical Verification, Data Source Validation, Reproducibility Reasoning | Adversarial fact-checking, source credibility scoring, reproducibility assessment |
| 8 | **Interaction** | Interactive Paper Chatbot, Reviewer Style Critique | Context-aware Q&A on research; peer-review-style feedback generation |
| 9 | **Report Generation** | Scientific Writing, LaTeX Generation, Multi-Stage Report | Academic writing with proper tone; template-based LaTeX compilation |
| 10 | **Quality Assurance** | Adversarial Critique, Hallucination Detection, Scoring | Bias detection, AI output validation, source quality scoring |
|   | **Support** | Memory & Knowledge Graph, Citation Graph, Data Scraper, Visualization, News | Persistent memory, citation networks, web scraping, diagram/image generation, current events |

### Research Pipeline Stages (Executed Sequentially)

```
 ① Topic Discovery        → AI suggests refined research topics
 ② Topic Lock             → User selects or auto-locks the best topic
 ③ Domain Intelligence    → Maps keywords, research landscape, key papers
 ④ Historical Review      → Traces chronological evolution of the field
 ⑤ Literature Review      → PRISMA-style retrieval: Arxiv + Scholar + PubMed
 ⑥ Web Scraping           → Extracts content from 10-20 high-quality URLs
 ⑦ Google News            → Gathers latest industry news & developments
 ⑧ Novelty Check          → Verifies research gaps are genuinely novel
 ⑨ Source Scoring         → Rates quality/relevance of all gathered sources
 ⑩ Synthesis & Report     → Writes comprehensive academic paper (2000-4000 words)
 ⑪ Visualization          → Generates Mermaid diagrams + AI-searched images
 ⑫ LaTeX Generation       → Converts to publication-ready LaTeX/PDF format
```

### Key Methodologies
- **PRISMA Framework** — Identification → Screening → Eligibility → Inclusion
- **Multi-Source RAG** — Retrieval-Augmented Generation from 7+ data providers
- **Adversarial Verification** — Agents fact-check each other's outputs
- **Hallucination Guard** — Dedicated agent detects and flags fabricated claims

---

## SLIDE 4 — Features & User Interface

### For Researchers (End Users)

| Feature | Description |
|---------|-------------|
| **One-Click Research** | Enter a topic → get a complete research paper automatically |
| **Live Activity Feed** | Real-time stream of agent actions (searching, scraping, writing) with timestamps |
| **Interactive Dashboard** | View all research jobs, their status, progress, and results |
| **Research Workspace** | Full workspace per research — report, diagrams, images, sources, chat |
| **AI Chatbot** | Ask follow-up questions about the research with streaming responses |
| **Source Transparency** | See every URL, paper, and database the agents used |
| **Multi-Format Export** | Download as Markdown (.md), LaTeX (.tex), or PDF with one click |
| **Mermaid Diagrams** | Auto-generated timeline, methodology flowchart, and data distribution charts |
| **Image Search** | AI-discovered relevant images embedded in the report |
| **Research Memory** | Platform remembers insights across sessions for smarter future research |
| **Share & Collaborate** | Generate shareable links for research reports |
| **Dark/Light Mode** | Full theme support for comfortable reading |

### For Developers (API Access)

| Feature | Description |
|---------|-------------|
| **RESTful API** | Full control over the engine via standard HTTP endpoints |
| **SSE Streaming** | Real-time Server-Sent Events for live progress updates |
| **API Key Management** | Secure key generation for programmatic access |
| **Modular Agent System** | Easy to add new agents by extending `BaseAgent` class |
| **Pluggable LLMs** | Switch between Gemini, Groq, Ollama with environment variables |
| **Docker Support** | Full Docker Compose setup for one-command deployment |

### User Journey (Step-by-Step)

```
1. SIGN UP / LOG IN
   └─→ Create account or log in with email/password (JWT secured)

2. CREATE RESEARCH
   └─→ Enter any research topic (e.g., "Deep Learning in Medical Imaging")
   └─→ Select depth: Quick (5 min) or Deep (25 min)

3. WATCH IT WORK (Live Feed)
   └─→ See real-time events: "Searching Arxiv...", "Found 15 papers...",
       "Scraping 10 URLs...", "Writing synthesis report..."

4. EXPLORE RESULTS (Workspace)
   └─→ 📄 Report Tab    — Full academic paper with tables, citations
   └─→ 📊 Diagrams Tab  — Mermaid timeline, methodology flowchart, pie charts
   └─→ 🖼️ Images Tab    — AI-discovered relevant images
   └─→ 📚 Sources Tab   — Every URL and paper used, with quality scores
   └─→ 💬 Chat Tab      — Ask the AI about findings, methods, limitations

5. EXPORT & SHARE
   └─→ Download as Markdown, LaTeX, or PDF
   └─→ Generate a shareable link for collaborators
```

---

## SLIDE 5 — Results, Achievements & Future Scope

### Performance Results

| Metric | Achieved |
|--------|----------|
| **End-to-End Pipeline** | ✅ Fully functional — topic to paper in one click |
| **Processing Time** | ~15-28 minutes for deep research (depends on topic complexity) |
| **Report Quality** | 2000-4000 word academic papers with proper structure |
| **Source Coverage** | 15-35 sources per research from 7+ data providers |
| **Hallucination Rate** | <15% (verified by dedicated Hallucination Detection Agent) |
| **Agent Count** | 27 specialized agents working collaboratively |
| **Export Formats** | Markdown, LaTeX, PDF — all production-ready |
| **Real-time Updates** | SSE-based live feed with <500ms event latency |
| **Concurrent Users** | Supports multiple simultaneous research sessions |

### What Makes This Project Unique

| Differentiator | Explanation |
|---------------|-------------|
| **Multi-Agent Collaboration** | Not a single LLM call — 27 agents with distinct roles coordinate through a state machine |
| **PRISMA Methodology** | Follows gold-standard systematic review guidelines used in actual research |
| **Full Verification Pipeline** | Dedicated agents for fact-checking, hallucination detection, and source validation |
| **Real-time Transparency** | Users watch the entire research process unfold — no black box |
| **Production Full-Stack** | Complete web app with auth, database, API, real-time streaming — not a notebook demo |

### Challenges Faced & Solutions

| Challenge | Solution |
|-----------|----------|
| LLM Hallucinations | Dedicated Hallucination Detection Agent + Adversarial Critique Agent |
| API Rate Limits | Exponential backoff retry + fallback providers + source caching |
| Long Context Windows | Chunked processing + summarization chains for papers >15k tokens |
| Agent Coordination | LangGraph state machine ensures deterministic pipeline execution |
| Real-time Updates | SSE (Server-Sent Events) for streaming agent activity to frontend |

### Future Scope

| Enhancement | Description |
|------------|-------------|
| **Multi-Paper Batch Analysis** | Upload 10-50 papers for comparative analysis |
| **Citation Network Visualization** | Interactive graph of paper relationships |
| **Collaborative Research** | Multi-user workspaces with shared findings |
| **Fine-tuned Domain Models** | Specialized models for medicine, law, engineering |
| **Mobile Application** | React Native app for research on the go |
| **Institutional Integration** | SSO authentication + university library API access |

---

## Quick Reference

| Item | Value |
|------|-------|
| **GitHub Repository** | `project_sgp` |
| **Frontend URL** | `http://localhost:3000` (dev) / Vercel (production) |
| **Backend URL** | `http://localhost:5000` |
| **AI Engine URL** | `http://localhost:8000` |
| **Database** | PostgreSQL |
| **Total Agents** | 27 |
| **Pipeline Stages** | 12 |
| **Data Sources** | Arxiv, Google Scholar, PubMed, DuckDuckGo, Wikipedia, Google News, Kaggle, GitHub |

---

*Built with LangGraph, React, Node.js, FastAPI, and Google Gemini — Accelerating Research Through Intelligent Multi-Agent Automation*
