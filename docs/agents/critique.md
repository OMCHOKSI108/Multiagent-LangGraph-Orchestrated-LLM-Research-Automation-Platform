# Critique Agent

The **Critique Agent** (also known as the **Review Agent**) acts as the quality assurance layer. It reviews the work of the Scraper and Report agents to ensure high standards.

## Responsibilities

- **Fact Checking**: Verifies claims against the sourced data.
- **Completeness Check**: Identifying missing perspectives or gaps in the research.
- **Hallucination Detection**: Flagging unsupported statements.
- **Tone Analysis**: Ensuring the report maintains the requested professional tone.

## Interaction

The Critique Agent often triggers a feedback loop. If it finds the report lacking, it sends the task back to the Orchestrator with specific instructions for improvement (e.g., "Find more recent data on X").
