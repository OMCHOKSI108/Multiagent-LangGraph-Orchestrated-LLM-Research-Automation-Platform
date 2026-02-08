# Orchestrator Agent

The **Orchestrator** is the central node of the AI Engine. Built on **LangGraph**, it maintains the `AgentState` and determines the control flow.

## Responsibilities

- **State Management**: Holds the shared memory of the research session (queries, results, report sections).
- **Decision Making**: Uses an LLM to decide whether to continue researching or finalize the report.
- **Routing**: Directs tasks to the specialized agents (Scraper, Visualizer, etc.).

## Logic Flow

The orchestrator operates on a `Supervisor` pattern. It does not perform work itself but delegates it.

```python
# Simplified Orchestrator Logic
def router(state):
    messages = state["messages"]
    last_message = messages[-1]
    
    if "FINAL ANSWER" in last_message.content:
        return "end"
    
    return "continue"
```

## Configuration

The orchestrator is configured in `ai_engine/agents/orchestrator/graph.py`. It defines the nodes and edges of the execution graph.
