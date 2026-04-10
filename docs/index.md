# Multi-Agent Research Platform

![Banner](../assets/banner.png)

## Overview

The **Multi-Agent Research Platform (MARP)** is an advanced, autonomous multi-agent platform designed to conduct comprehensive research on any topic. Orchestrated by **LangGraph**, it coordinates specialized AI agents to discover, analyze, verify, and synthesize information into professional-grade reports.

## Key Features

- **Autonomous Research**: Simply provide a topic, and the platform handles the entire research lifecycle
- **35+ Specialized Agents**: Distinct agents for discovery, review, synthesis, verification, and writing working in harmony
- **Smart Query Routing**: Automatically selects direct answer, web search, or full research pipeline
- **Verified Sources**: Aggregates data from DuckDuckGo, Google, ArXiv, Wikipedia, OpenAlex, and PubMed
- **Professional Reports**: Generates detailed reports in Markdown, PDF, and LaTeX formats
- **Real-Time Visualization**: Watch the agents "think" and execute tasks via the interactive dashboard
- **IEEE Paper Generation**: Compile research findings into IEEE-formatted academic papers

## Quick Start

### Using Docker Compose

```bash
git clone https://github.com/OMCHOKSI108/Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform.git
cd Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform
cp .env.example .env
# Configure your API keys in .env
docker-compose up -d
```

### Manual Installation

```bash
git clone https://github.com/OMCHOKSI108/Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform.git
cd Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ../ai_engine && pip install -r requirements.txt

# Start services
cd ../backend && npm run dev
cd ../frontend && npm run dev
cd ../ai_engine && python -m uvicorn main:app
```

### Usage

1. Open the dashboard at `http://localhost:3000`
2. Sign up or log in
3. Create a workspace for your research
4. Enter a research topic (e.g., "The Future of Quantum Computing")
5. Configure depth settings (quick, standard, gather, deep)
6. Click **Start Research** or use slash commands:
   - `/deep [topic]` - Full multi-agent deep research
   - `/research [topic]` - Standard research pipeline
   - `/gatherdata [topic]` - Heavier data collection
   - `/search [query]` - Focused web search

## Platform Capabilities

| Category | Capabilities |
|----------|--------------|
| **Discovery** | Topic discovery, domain intelligence, historical review, news aggregation |
| **Review** | Systematic literature review (PRISMA), survey meta-analysis |
| **Synthesis** | Gap synthesis, research question engineering, conceptual framework |
| **Verification** | Technical verification, data source validation, hallucination detection |
| **Writing** | Scientific writing, LaTeX generation, IEEE paper generation |
| **Interaction** | Interactive chatbot, reviewer-style critique |

## Architecture

The platform consists of three main services:

1. **Frontend** (Next.js/React) - User interface with real-time updates
2. **Backend** (Node.js/Express) - API gateway and state management
3. **AI Engine** (Python/FastAPI/LangGraph) - Multi-agent orchestration and LLM integration
