# AI Agents Overview

The Deep Research Engine is powered by a constellation of specialized AI agents, each designed for a specific cognitive task. These agents are orchestrated by a central graph to ensure a logical flow of information and high-quality output.

## Agent Constellation

| Agent | Responsibility | Key Tools |
| :--- | :--- | :--- |
| **Orchestrator** | Manages the global state and decides the next step (Research vs. Report). | LangGraph State |
| **Scraper** | Navigates the web, executes search queries, and extracts content. | Tavily, Exa, Arxiv, PyPdf |
| **Review** | Critiques the gathered information to identify gaps and hallucinations. | LLM Reviewer |
| **Report** | Synthesizes the final report in multiple formats (Markdown, PDF). | File Writer, Latex Compiler |
| **Visualization** | Generates relevant charts and figures based on the data. | Matplotlib, Seaborn |
| **Critique** | Provides a second layer of verification on the report quality. | LLM Critic |

## Interaction Model

The agents do not communicate randomly. They follow a strict **Cyclic Graph** topology:

1. **Plan**: Orchestrator analyzes the user request.
2. **Execute**: Scraper/Visualization agents gather data.
3. **Verify**: Review agent checks the data.
4. **Iterate**: If verification fails, the cycle repeats with honed queries.
5. **Finalize**: Report agent compiles the approved data.
