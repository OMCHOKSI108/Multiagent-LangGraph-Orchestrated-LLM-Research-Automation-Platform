# Scraper Agent

The **Scraper Agent** is the data gathering arm of the engine. It is responsible for intelligently navigating the web to find high-quality information relevant to the research topic.

## Capabilities

- **Multi-Source Search**: Queries Google, Wikipedia, Arxiv, and other sources.
- **Deep Content Extraction**: Visits URLs and extracts the main content, stripping away ads and navigation implementation details.
- **Smart Filtering**: Uses heuristics and LLM-based filtering to select the most relevant search results.
- **PDF Parsing**: Capable of reading and extracting text from PDF documents (e.g., academic papers).

## Usage

The scraper is typically invoked by the Orchestrator with a search query.

```python
# Agent Tool Interface
def scrape_tool(query: str):
    """
    Scrapes the web for the given query.
    Returns: A summary of the findings and source URLs.
    """
    pass
```

## Tools Integration

- **Tavily API**: For high-quality search results optimized for LLMs.
- **Exa (Metaphor)**: for semantic search.
- **PyPDF2/PDFMiner**: For parsing PDF documents.
