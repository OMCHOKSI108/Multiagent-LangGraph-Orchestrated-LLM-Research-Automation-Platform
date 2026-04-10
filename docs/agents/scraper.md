# Scraper Agent

The **Scraper Agent** is the data gathering component of the AI Engine. It intelligently navigates the web to find high-quality information relevant to the research topic.

## Capabilities

- **Multi-Provider Search**: Queries DuckDuckGo, Google, ArXiv, Wikipedia, OpenAlex, and PubMed
- **Deep Content Extraction**: Visits URLs and extracts main content, stripping ads and navigation
- **Smart Filtering**: Uses heuristics and LLM-based filtering to select relevant results
- **PDF Parsing**: Reads and extracts text from PDF documents (academic papers)
- **7 Scraping Strategies**: Article extraction, academic APIs, PDF scraping, table data, metadata, multi-page crawling, search engine

## Search Providers

| Provider | Purpose | Configuration |
|----------|---------|---------------|
| DuckDuckGo | Privacy-focused general search | Default |
| Google | Comprehensive web search | Requires API key |
| ArXiv | Academic papers and preprints | No key required |
| Wikipedia | Encyclopedia articles | No key required |
| OpenAlex | Open access scientific literature | No key required |
| PubMed | Medical and life science research | Optional email |

## Configuration

The scraper is typically invoked by the Orchestrator with a search query. Provider configuration is in `ai_engine/config.py`:

```python
SEARCH_PROVIDERS = {
    "available": ["duckduckgo", "google", "arxiv", "wikipedia", "openalex", "pubmed"],
    "default": ["duckduckgo", "arxiv"],
}
```

## Tools Integration

- **Tavily API**: High-quality search results optimized for LLMs
- **Exa (Metaphor)**: Semantic search capabilities
- **PyMuPDF/PyPDF**: PDF document parsing
- **BeautifulSoup**: HTML content extraction
- **duckduckgo-search**: Privacy-focused search
