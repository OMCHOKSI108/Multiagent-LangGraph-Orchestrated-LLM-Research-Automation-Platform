# Visualization Agent

The **Visualization Agent** adds visual depth to reports. It scans data for numerical trends and generates appropriate charts, graphs, and diagrams.

## Supported Visualizations

- **Line Charts**: Time-series data (trends, historical analysis)
- **Bar Charts**: Categorical comparison (market share, performance metrics)
- **Pie Charts**: Proportional data (distribution, composition)
- **Network Graphs**: Relationship mapping (citation networks, concept connections)
- **Mermaid Diagrams**: Flowcharts and process diagrams

## Technology Stack

- **Matplotlib**: Core plotting library
- **Seaborn**: Statistical data visualization
- **ECharts**: Interactive charts for web display
- **Mermaid**: Flowcharts and diagrams

## Workflow

1. **Data Detection**: Analyze research data for structured numerical content
2. **Chart Selection**: Decide best visualization type for the data
3. **Code Generation**: Write code to generate the visualization
4. **Execution**: Produce image files
5. **Embedding**: Return image paths for report inclusion

## Image Intelligence

The `ImageIntelligenceAgent` provides:
- Academic suitability scoring for images
- Alt text generation
- Figure caption generation

## Output Locations

Generated images are stored in:
- `ai_engine/output/research_images/`
- Served via `/research_images` endpoint in backend
