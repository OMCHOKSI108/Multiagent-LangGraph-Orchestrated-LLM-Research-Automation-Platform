# AI Agents Overview

The Multi-Agent Research Platform is powered by 35+ specialized AI agents, each designed for a specific cognitive task. These agents are orchestrated by a central LangGraph pipeline to ensure a logical flow of information and high-quality output.

## Agent Constellation

| Category | Agents | Key Functions |
|----------|--------|---------------|
| **Orchestration** | Orchestrator, Central Brain, Query Planner | State management, routing, decision making |
| **Discovery** | Topic Discovery, Domain Intelligence, Historical Review, News | Research exploration and domain mapping |
| **Review** | Systematic Literature Review, Survey Meta-Analysis | PRISMA-compliant reviews, meta-analysis |
| **Synthesis** | Gap Synthesis, Research Question Engineering, Conceptual Framework | Research gap identification, question formulation |
| **Understanding** | Paper Decomposition, Paper Understanding | Document parsing, content summarization |
| **Verification** | Technical Verification, Data Source Validation, Reproducibility Reasoning | Claims validation, source checking |
| **Chatbot** | Interactive Chatbot, Reviewer-Style Critique | Conversational Q&A, peer-review style feedback |
| **Writing** | Scientific Writing, LaTeX Generation, Multi-Stage Report, IEEE Paper, Editor | Academic composition and typesetting |
| **Critique** | Adversarial Critique, Hallucination Detection | Bias detection, output validation |
| **Visualization** | Visualization Agent, Image Intelligence | Charts, diagrams, image analysis |
| **Utility** | Data Scraper, Scoring, Memory Graph, Citation Analysis | Data collection and knowledge management |

## Interaction Model

The agents follow a structured **Pipeline Flow**:

1. **Discovery**: Orchestrator initiates Topic Discovery and Domain Intelligence
2. **Research**: Systematic Literature Review and Historical Review gather data
3. **Analysis**: Paper Understanding and Technical Verification process content
4. **Synthesis**: Gap Synthesis identifies opportunities, Innovation generates ideas
5. **Writing**: Scientific Writing and LaTeX Generation compile the report
6. **Critique**: Adversarial Critique and Hallucination Detection ensure quality

## Agent Registry

All agents are registered in `ai_engine/agents/registry.py` and can be accessed via the `/agents` API endpoint.

### Testing Individual Agents

Each agent can be tested independently via the API:

```bash
# Test the Topic Discovery agent
curl -X POST http://localhost:8000/agents/topic_discovery/test \
  -H "Content-Type: application/json" \
  -d '{"task": "machine learning in healthcare"}'
```

### Agent Categories in API Response

The `/agents` endpoint returns agents grouped by category:
- **Discovery**: topic_discovery, domain_intelligence, historical_review, news
- **Review**: slr (Systematic Literature Review), survey_meta_analysis
- **Synthesis**: gap_synthesis, research_question, conceptual_framework
- **Analysis**: paper_decomposition, paper_understanding
- **Verification**: technical_verification, hallucination_detection
- **Interaction**: interactive_chatbot
- **Visualization**: visualization
- **Writing**: scientific_writing, latex_generation
- **Critique**: adversarial_critique
- **Data**: data_scraper
- **Assessment**: scoring

## Model Selection

Agents use specialized models based on task requirements:

| Model Type | Primary Use | Default Provider |
|------------|------------|------------------|
| `MODEL_REASONING` | Logic, analysis, planning | Claude 3.5 Sonnet |
| `MODEL_WRITING` | Prose, summaries, reports | GPT-4o-mini |
| `MODEL_CODING` | Code, JSON, LaTeX | DeepSeek Coder |
| `MODEL_CRITICAL` | Critique, verification, bias | Gemini Flash |
