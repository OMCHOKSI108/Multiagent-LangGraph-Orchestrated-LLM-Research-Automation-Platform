# Critique Agent

The **Critique Agent** acts as the quality assurance layer. It reviews the work of other agents to ensure high standards.

## Agents

| Agent | Registry Key | Focus |
|-------|-------------|-------|
| `ReviewerAdversarialCritiqueAgent` | `adversarial_critique` | Adversarial critique, weakness identification |
| `HallucinationDetectionAgent` | `hallucination_detection` | Fabricated claim detection |

## Responsibilities

- **Fact Checking**: Verifies claims against sourced data
- **Completeness Check**: Identifying missing perspectives or gaps
- **Hallucination Detection**: Flagging unsupported statements
- **Tone Analysis**: Ensuring professional report tone
- **Bias Detection**: Identifying potential biases in content

## Interaction

The Critique Agents often trigger feedback loops. If the report is found lacking, tasks are sent back to the Orchestrator with specific improvement instructions.

## Configuration

Both agents use `MODEL_CRITICAL` for their reasoning, typically configured to use:
- Gemini Flash (default)
- Claude 3.5 Sonnet
- Llama 3.1

Located in `ai_engine/agents/critique/`.
