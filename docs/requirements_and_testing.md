# Academic Research Platform: Requirements, Workflow & Testing Study

This document outlines the systematic study of the user workflow, system requirements, and a comprehensive testing checklist for the Multi-Agent LLM Research Automation Platform.

## 1. User Workflow Analysis

The platform follows a structured "Research Lifecycle" that transitions from high-level discovery to deep technical verification.

### Phase 1: Onboarding & Workspace Setup
1. **Entry**: User arrives at the landing page and performs **Auth** (Signup/Login).
2. **Contextualization**: User creates or selects a **Workspace** (e.g., "Defense Tech"). This serves as the isolated environment for data, embeddings, and research sessions.
3. **Artifact Preparation**: User may upload relevant papers (PDFs) to the workspace to prime the RAG (Retrieval-Augmented Generation) system.

### Phase 2: Research Initiation
4. **Trigger**: User inputs a research topic (e.g., *"LLMs in Defense Sector"*) and selects depth.
5. **Orchestration**: The Backend creates a **Research Session**, and the Worker dispatches it to the **AI Engine (LangGraph)**.

### Phase 3: Real-time Monitoring & Interaction
6. **Observation**: User watches the **Live Feed**. SSE (Server-Sent Events) stream stage-by-stage progress from 20+ agents.
7. **Early Interaction**: While the graph runs, the user uses the **AI Chat** to ask preliminary questions. The chatbot uses the current "findings" state + vector store context.
8. **Feedback Loop**: User may refine the topic if the "Topic Discovery" agent suggests a better scope.

### Phase 4: Consumption & Management
9. **Review**: User accesses the **Report** tab (Markdown/LaTeX) and **Sources** tab (Scraped URLs/Citations).
10. **Admin Oversight**: Administrators monitor system usage, manage user access, and ensure API keys are healthy.

---

## 2. Requirements Specification

### Functional Requirements (FR)
- **FR-1: Multi-Agent Pipeline**: System must orchestrate 20+ specialized agents (Topic Discovery, SLR, Gap Synthesis, etc.) via LangGraph.
- **FR-2: Real-time Streaming**: Must provide a live telemetry stream of agent activities to the frontend via SSE.
- **FR-3: RAG Chatbot**: Interactive chat must utilize both local vector store (uploaded files) and global research findings.
- **FR-4: Workspace Isolation**: Data, sessions, and uploads must be strictly isolated per workspace.
- **FR-5: Admin Controls**: Admins must be able to manage users, toggle activation, and delete resources.

### Non-Functional Requirements (NFR)
- **NFR-1: API Resilience**: System must support multi-key rotation and retry logic for LLM providers (Groq, OpenRouter, Gemini).
- **NFR-2: Latency**: Research jobs should initiate within < 2 seconds of user trigger.
- **NFR-3: Security**: All internal routes must be protected by JWT; admin routes must require 'admin' role in token.
- **NFR-4: Stability**: Background worker must handle job recovery/retries if the AI Engine restarts.

---

## 3. Test Checklist (TODO)

### 🔐 Authentication & Security
- [ ] Signup with duplicate email (Expected: 400 Error)
- [ ] Login with incorrect password (Expected: 400 Error)
- [ ] Access `/api/admin/*` with a 'user' role token (Expected: 403 Forbidden)
- [ ] Verify JWT payload includes `role` and `id`

### 🏗️ Workspace & Research Flow
- [ ] Create workspace and verify UUID generation
- [ ] Start research job and verify `queued` status in DB
- [ ] Verify PG Trigger notifies worker via `new_research_job` channel
- [ ] Verify research session transitions: `queued` -> `processing` -> `completed`

### 🤖 Agent & AI Engine
- [ ] Test individual agent via `/api/agents/:slug/test`
- [ ] Verify agent returns valid JSON structure
- [ ] Verify LangGraph reducer correctly merges parallel agent outputs (State Reducer test)
- [ ] Test LLM provider fallback (Groq FAIL -> Gemini/OpenRouter retry)

### 📡 Real-time & Data
- [ ] Verify SSE connection at `/api/events/stream`
- [ ] Check if `execution_events` table populates as research progresses
- [ ] Verify PDF upload -> Embedding -> Vector search retrieval (RAG test)

---

## 4. Feasibility Report: "LLMs in Defense Sector"

**Can this research be done?**
**YES.** Here is why:

1. **Domain Intelligence**: The `domain_intelligence` agent is specifically designed to handle sector-specific queries. It will identify key stakeholders (DoD, DARPA, NATO), security constraints, and operational requirements.
2. **SLR (Systematic Literature Review)**: The pipeline will scrape ArXiv and news sources for recent papers on "Encrypted Inference", "Tactical Edge Computing", and "Federated Learning" relevant to defense.
3. **Multi-Agent Depth**: Unlike a simple GPT prompt, this platform uses 20+ specialized "minds" to find gaps (e.g., *"LLMs struggle with air-gapped environments"*) and suggest innovations.
4. **Current Status**: Job #6 is already **Processing** on the platform. The system is currently executing the "Topic Lock" and "Domain Intelligence" nodes for this specific query.

**Recommendation**: Monitor the **Live Feed** for the next 5-10 minutes to see the Technical Verification and Gap Synthesis results.
