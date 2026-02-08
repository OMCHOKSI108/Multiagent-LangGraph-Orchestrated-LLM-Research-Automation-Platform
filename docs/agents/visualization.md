# Visualization Agent

The **Visualization Agent** adds visual depth to the reports. It scans the data for numerical trends and generates appropriate charts and graphs.

## Supported Visualizations

- **Line Charts**: For time-series data (e.g., Stock prices, historical trends).
- **Bar Charts**: For categorical comparison (e.g., Market share, population).
- **Pie Charts**: For proportional data.
- **Network Graphs**: For relationship mapping.

## Technology Stack

- **Matplotlib**: The core plotting library.
- **Seaborn**: For statistical data visualization.
- **Mermaid**: For flowcharts and diagrams.

## Workflow

1. **Data Detection**: The agent analyzes the research data to find structured numerical content.
2. **Chart Selection**: Decides the best visualization type for the data.
3. **Code Generation**: Writes Python code to generate the plot.
4. **Execution**: Runs the code in a sandboxed environment to produce an image file.
5. **Embedding**: Returns the image path to be embedded in the final report.
