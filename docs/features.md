# Features

The Multi-Agent Research Platform (MARP) is packed with features designed to make complex research effortless.

## Core Capabilities

### Multi-Agent Orchestration
- **35+ Specialized Agents**: Distinct agents for discovery, review, synthesis, verification, and writing
- **LangGraph State Management**: Robust state management ensures no context is lost during research
- **Self-Correction**: Critique agents can reject low-quality output and force retries

### Research Workflows
- **Topic-to-Report**: Logic handles the entire lifecycle from a simple query
- **Iterative Deepening**: If initial results are shallow, agents automatically dive deeper
- **Depth Control**: Configurable parameters (quick, standard, gather, deep) to control search scope

### Query Routing
- **Smart Routing**: Automatically selects direct answer, web search, or full research pipeline
- **Slash Commands**: `/deep`, `/research`, `/gatherdata`, `/search` for explicit control
- **Context-Aware**: Uses workspace memory and uploaded documents for personalized responses

## Data & Sources

### Web Search Integration
- **Multi-Provider Support**: DuckDuckGo, Google, ArXiv, Wikipedia, OpenAlex, PubMed
- **Parallel Queries**: Multiple providers queried simultaneously for comprehensive results
- **7 Scraping Strategies**: Article extraction, academic APIs, PDF scraping, table data, metadata, multi-page crawling

### PDF Processing
- **Upload Support**: Upload PDFs for RAG (Retrieval-Augmented Generation) context
- **Vector Embedding**: Automatic chunking and embedding for semantic search
- **Citation Extraction**: Extract citations and references from academic papers

### Data Visualization
- **Automatic Charting**: Detects numerical data and generates line, bar, and pie charts
- **Image Intelligence**: Academic suitability scoring for research images
- **Mermaid Diagrams**: Flowcharts and diagrams for report enhancement

## User Interface

### Interactive Dashboard
- **Live Activity Feed**: Watch agents think and execute tasks in real-time
- **Research Timeline**: Visual progress tracker of research steps
- **AI Brain Panel**: Visual representation of agent orchestration
- **Source Transparency**: See exactly which sources were used

### Workspace Organization
- **Multi-Workspace Support**: Organize research by project or topic
- **Session Management**: Track and compare past research sessions
- **Export Options**: Download reports in Markdown, PDF, LaTeX, or JSON

### Modern Design
- **Dark/Light Mode**: System-preference based theming
- **Responsive**: Works on desktop and mobile
- **Clean Typography**: Optimized for reading long-form reports

## Chat & Interaction

### Interactive Chatbot
- **RAG-Enhanced Responses**: Uses research context for accurate answers
- **Real-time Streaming**: Character-by-character response display
- **Source Attribution**: Shows which sources informed each response
- **Conversation History**: Persist and continue conversations

### AI-Assisted Editing
- **Section Refinement**: Edit specific report sections with natural language
- **IEEE Paper Generation**: Compile findings into IEEE-formatted academic papers
- **Citation Management**: Automatic bibliography generation

## Developer Features

### API Access
- **RESTful Endpoints**: Full control via standard HTTP requests
- **API Key Management**: Secure key generation for third-party integrations
- **Individual Agent Testing**: Test each agent separately

### Multi-Key LLM Support
- **Groq**: Fast inference with multi-key rotation
- **OpenRouter**: Access to multiple LLM providers
- **Google Gemini**: Google's latest models
- **Ollama**: Local model support (offline mode)
- **HuggingFace**: Self-hosted inference endpoints

### Extensibility
- **Modular Agents**: Easy to add new agents
- **Pluggable Providers**: Configure any LLM provider
- **LangGraph-Based**: Leverages LangGraph's debugging and checkpointing

## Security & Performance

### Authentication
- **JWT Tokens**: Secure session management
- **OAuth Support**: Google and GitHub authentication
- **Role-Based Access**: User and admin roles

### Rate Limiting
- **Global Limits**: 5000 requests per 15 minutes
- **Auth-Specific Limits**: Stricter limits on auth endpoints
- **Authenticated User Bypass**: JWT holders excluded from global limits

### Monitoring
- **Token Usage Tracking**: Monitor API consumption
- **Error Logging**: Structured logging across all services
- **Health Endpoints**: Monitor service status
