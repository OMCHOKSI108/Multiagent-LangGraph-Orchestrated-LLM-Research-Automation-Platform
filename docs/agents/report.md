# Report Agent

The **Report Agent** is the final synthesizer. It takes the structured data gathered by the research team and compiles it into a cohesive, professional document.

## Architecture

The Report Agent uses a "Section Writer" pattern, where different parts of the report are generated in parallel or sequence, depending on dependencies.

### Output Formats

1. **Markdown**: The native format, suitable for web viewing and easy editing.
2. **PDF**: High-quality document generation using `WeasyPrint` or similar tools.
3. **LaTeX**: For academic-grade typesetting and formula rendering.

## Key Features

- **Citation Management**: Automatically manages references and generates a bibliography.
- **Tone Adjustment**: Can adapt the writing style (Academic, Professional, Casual) based on user preference.
- **Sanitization**: Ensures the output is free of hallucinations and formatting errors.

## Code Location

Located in `ai_engine/agents/report/`.
