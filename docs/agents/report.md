# Report Agent

The **Report Agent** is the final synthesizer. It takes the structured data gathered by the research team and compiles it into a cohesive, professional document.

## Architecture

The Report Agent uses a multi-stage approach to generate comprehensive research reports.

### Output Formats

1. **Markdown**: Native format for web viewing and easy editing
2. **LaTeX**: Academic-grade typesetting for publications
3. **PDF**: High-quality document generation
4. **IEEE Paper**: Full academic paper with citations and methodology

### Report Agents

| Agent | Purpose |
|-------|---------|
| `ScientificWritingAgent` | Academic paper composition |
| `LaTeXGenerationAgent` | Professional LaTeX typesetting |
| `MultiStageReportAgent` | Domain-aware multi-section reports |
| `IEEEPaperAgent` | IEEE-formatted academic papers |
| `EditorAgent` | Section refinement and editing |

## Key Features

- **Citation Management**: Automatically manages references and generates bibliography
- **Tone Adjustment**: Adapts writing style (Academic, Professional, Casual)
- **Section Editor**: Edit specific report sections with natural language instructions
- **Auto-embedding**: Vector embeddings for RAG context

## Code Location

Located in `ai_engine/agents/report/`.

## API Endpoints

```bash
# Edit a section
POST /research/edit-section
{
  "section_title": "Introduction",
  "current_content": "...",
  "instruction": "Make this more technical"
}
```
