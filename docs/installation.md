# Installation & Usage

Follow these steps to set up the Multi-Agent Research Platform on your local machine.

## Prerequisites

- **Python**: Version 3.10 or higher
- **Node.js**: Version 18 or higher
- **Git**: For cloning the repository
- **PostgreSQL**: Database (can be run via Docker)
- **Redis**: Cache (optional, can be run via Docker)

## Quick Start with Docker

The easiest way to run the entire stack is with Docker Compose:

```bash
# Clone the repository
git clone https://github.com/OMCHOKSI108/Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform.git
cd Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform

# Copy environment template
cp .env.example .env

# Edit .env with your API keys (see Configuration section)

# Start all services
docker-compose up -d
```

Access the application at `http://localhost:3000`.

## Manual Installation

### 1. Clone the Repository

```bash
git clone https://github.com/OMCHOKSI108/Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform.git
cd Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 4. Install AI Engine Dependencies

```bash
cd ai_engine

# Create virtual environment (recommended)
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 5. Set Up Database

Using Docker (recommended):

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_DB=research_platform \
  -e POSTGRES_USER=research \
  -e POSTGRES_PASSWORD=research_password \
  -p 5432:5432 \
  postgres:16-alpine
```

Or set `DATABASE_URL` to point to your existing PostgreSQL instance.

### 6. Configure Environment

Create a `.env` file in the root directory:

```ini
# Database
DATABASE_URL=postgresql://research:research_password@localhost:5432/research_platform

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
AI_ENGINE_SECRET=shared-secret-between-backend-and-ai-engine

# AI Engine URL
AI_ENGINE_URL=http://localhost:8000

# LLM Providers (at least one required)
GROQ_API_KEY=gsk_...          # Groq API key
GEMINI_API_KEY=AIzaSy...       # Google Gemini API key
OPENROUTER_API_KEY=sk-or-...  # OpenRouter API key

# Optional: Ollama (for offline mode)
OLLAMA_BASE_URL=http://localhost:11434
LLM_STATUS=ONLINE  # ONLINE, OFFLINE, HYBRID, HUGGINGFACE
```

### 7. Run Database Migrations

```bash
cd backend
npm run migrate  # or run SQL scripts manually from migrations/
```

### 8. Start Services

**Terminal 1 - AI Engine:**
```bash
cd ai_engine
source venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

## Configuration

### LLM Provider Selection

| Mode | Description |
|------|-------------|
| `ONLINE` | Use cloud providers (Groq, OpenRouter, Gemini) |
| `OFFLINE` | Use local Ollama models |
| `HYBRID` | Prefer cloud, fallback to Ollama |
| `HUGGINGFACE` | Use HuggingFace inference endpoints |

### Search Providers

The AI Engine supports multiple search providers. Configure in `.env`:

```ini
# At least one recommended
TAVILY_API_KEY=tvly-...        # Optional Tavily API
GOOGLE_SEARCH_API_KEY=...       # Optional Google Custom Search
```

### Redis (Optional)

For SSE token caching and pub/sub:

```ini
REDIS_URL=redis://localhost:6379/0
```

## Running Tests

### Backend Tests
```bash
cd backend
npm test
```

### AI Engine Tests
```bash
cd ai_engine
pytest tests/
```

## Building Documentation

To build this documentation locally:

```bash
mkdocs serve
```

Access at `http://localhost:8000`.

## Deployment

See [deployment.md](deployment.md) for production deployment instructions, including Docker Compose setup and Railway deployment guide.
