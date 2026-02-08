# System Architecture

The Deep Research Engine follows a modular, microservices-based architecture, orchestrating multiple AI agents to perform complex research tasks.

## High-Level Overview

```mermaid
graph TD
    User[User / Frontend] -->|REST API| Backend[Node.js Backend]
    Backend -->|Websocket/HTTP| AIEngine[Python AI Engine]
    
    subgraph "AI Engine (LangGraph)"
        Orchestrator -->|Delegates| Scraper[Scraper Agent]
        Orchestrator -->|Delegates| Review[Review Agent]
        Orchestrator -->|Delegates| Report[Report Agent]
        Orchestrator -->|Delegates| Vis[Visualization Agent]
        
        Scraper -->|Feeds Data| Review
        Review -->|Refines Plan| Orchestrator
        Report -->|Final Output| Backend
        Vis -->|Live Updates| Backend
    end
    
    Backend -->|Stores State| DB[(Database / Store)]
```

## Component Breakdown

### 1. Frontend (React + TypeScript)
- **Framework**: React 18 with Vite.
- **State Management**: Zustand for global store (auth, research state).
- **UI Library**: Tailwind CSS with Shadcn/UI components.
- **Communication**: REST API for actions, Polling/Websocket (planned) for live updates.

### 2. Backend (Node.js + Express)
- **Role**: API Gateway and State Manager.
- **Auth**: JWT-based authentication.
- **Routes**:
    - `/auth`: User authentication.
    - `/research`: Job management.
    - `/events`: Event streaming from AI Engine.

### 3. AI Engine (Python + LangGraph)
- **Core**: Built on LangGraph for stateful, cyclic agent orchestration.
- **LLM**: Supports multiple providers (Gemini, Groq, OpenAI).
- **Agents**: specialized modules for distinct tasks.

## Orchestration Flow

The **Orchestrator Agent** is the brain of the operation. It maintains the global state and decides the next step based on the current context.

```mermaid
stateDiagram-v2
    [*] --> Plan
    Plan --> Research
    Research --> Review
    Review --> Revise: If data insufficient
    Revise --> Research
    Review --> Report: If data sufficient
    Report --> [*]
```
