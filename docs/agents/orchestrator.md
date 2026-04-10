# Orchestrator Agent

The **Orchestrator Agent** is the central coordinator of the AI Engine. Built on **LangGraph**, it maintains the research state and determines the control flow.

## Responsibilities

- **State Management**: Holds the shared memory of the research session (queries, results, report sections)
- **Decision Making**: Uses an LLM to decide whether to continue researching or finalize the report
- **Routing**: Directs tasks to the specialized agents (Discovery, Review, Synthesis, etc.)
- **Pipeline Control**: Manages the execution flow from topic discovery to report generation

## Key Agents in Orchestration

| Agent | Role |
|-------|------|
| `OrchestratorAgent` | Central coordinator |
| `CentralBrainAgent` | Chain-of-thought reasoning engine |
| `QueryPlannerAgent` | Classifies queries into direct/search/deep modes |
| `PipelineRouter` | Routes to full pipeline or single-paper analysis |

## Configuration

The orchestrator is configured in `ai_engine/graph/full_pipeline.py`. It defines the nodes and edges of the execution graph.

## Pipeline Flow

```
Topic Discovery → Domain Intelligence → Historical Review → SLR
    ↓
Gap Synthesis → Innovation → Validation → Report Generation
    ↓
Critique & Hallucination Detection → Final Output
```
