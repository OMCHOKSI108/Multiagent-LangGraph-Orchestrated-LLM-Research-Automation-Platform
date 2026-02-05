# Multi-Agent LLM Research Automation Platform

<div align="center">
<img width="1200" height="475" alt="Research Platform Banner" src="https://via.placeholder.com/1200x475/2563eb/ffffff?text=AI+Research+Platform" />
</div>

<p align="center">
  <strong>An intelligent, multi-agent system for automated academic research analysis, literature synthesis, and novel research generation using LangGraph and Large Language Models.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#api">API</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

## 🚀 Overview

This platform revolutionizes academic research by leveraging a sophisticated multi-agent architecture powered by LangGraph and multiple LLM providers. It can analyze individual research papers, perform comprehensive literature reviews, identify research gaps, and even generate novel research directions.

### 🎯 Key Capabilities

- **Single Paper Analysis**: Deep-dive analysis of individual academic papers with technical verification, reproducibility assessment, and reviewer-style critique
- **Literature Synthesis**: Automated systematic literature reviews with gap analysis and meta-analysis
- **Novel Research Generation**: AI-powered ideation for new research directions and conceptual frameworks
- **Multi-Provider LLM Support**: Seamless integration with Ollama (offline), Google Gemini, and Groq
- **Real-time Processing**: Live progress tracking and event-driven updates
- **Token Cost Management**: Built-in tracking and optimization of LLM usage costs

## ✨ Features

### 🤖 Multi-Agent Architecture
- **15+ Specialized Agents**: From domain intelligence to scientific writing
- **LangGraph Orchestration**: Robust workflow management with state persistence
- **Agent Registry**: Modular, extensible agent system

### 📊 Research Pipelines

#### Pipeline A: Full Research Synthesis
1. **Domain Intelligence Agent** - Maps research landscapes
2. **Historical Review Agent** - Chronological analysis via ArXiv
3. **Systematic Literature Review Agent** - PRISMA-compliant reviews
4. **Gap Synthesis Agent** - Identifies research opportunities
5. **Innovation & Novelty Agent** - Generates novel research ideas
6. **Scientific Writing Agent** - Academic paper composition
7. **LaTeX Generation Agent** - Professional typesetting

#### Pipeline B: Single Paper Analysis
1. **Paper Decomposition Agent** - Structural parsing
2. **Paper Understanding Agent** - Context-aware summarization
3. **Technical Verification Agent** - Claim validation
4. **Reviewer Critique Agent** - Adversarial analysis
5. **Final Verdict Agent** - Reliability scoring

### 🛠️ Technical Stack

- **Backend**: FastAPI (Python) + LangGraph for agent orchestration
- **Frontend**: React + TypeScript + Vite
- **Database**: PostgreSQL with connection pooling
- **LLMs**: Ollama, Google Gemini, Groq
- **Processing**: PyMuPDF, Unstructured.io for document processing
- **Deployment**: Docker + docker-compose

### 🔒 Security & Performance

- **Token Limiting**: Intelligent context management
- **Rate Limiting**: API protection
- **Error Handling**: Robust failure recovery
- **Logging**: Comprehensive event tracking
- **Cost Optimization**: Multi-provider load balancing

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Engine     │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Python)      │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • Auth          │    │ • LangGraph     │
│ • File Upload   │    │ • Sessions      │    │ • Multi-Agent   │
│ • Live Results  │    │ • API Gateway   │    │ • LLM Router    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Database      │
                    │   (PostgreSQL)  │
                    └─────────────────┘
```

## 📋 Prerequisites

- **Python 3.9+**
- **Node.js 18+**
- **PostgreSQL 13+**
- **Ollama** (for offline LLM mode)
- **Git**

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/OMCHOKSI108/Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform.git
cd Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Backend Setup (AI Engine)
```bash
# Navigate to AI engine
cd ai_engine

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start Ollama (if using offline mode)
ollama serve
```

### 4. Database Setup
```bash
# Install PostgreSQL and create database
createdb research_platform

# Run migrations
cd ../backend
npm run migrate
```

### 5. Backend API Setup
```bash
# Install Node.js dependencies
npm install

# Start the backend server
npm start
```

### 6. Frontend Setup
```bash
# Navigate to frontend
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🎮 Usage

### Quick Start
1. **Access the Web Interface**: Open `http://localhost:3000`
2. **Upload a Paper**: Drag & drop a PDF or provide an ArXiv URL
3. **Select Pipeline**: Choose between single-paper analysis or full research synthesis
4. **Monitor Progress**: Watch real-time agent execution
5. **View Results**: Get comprehensive analysis with LaTeX export

### API Usage
```python
import requests

# Start research analysis
response = requests.post("http://localhost:5000/research", json={
    "task": "Analyze transformer architecture evolution",
    "paper_url": "https://arxiv.org/pdf/1706.03762.pdf",
    "depth": "deep"
})

print(response.json())
```

### CLI Usage
```bash
# Run single paper analysis
python ai_engine/main.py --paper "paper.pdf" --pipeline single

# Run full research synthesis
python ai_engine/main.py --task "Quantum computing applications" --pipeline full
```

## 📚 API Documentation

### Endpoints

#### Research Endpoints
- `POST /research` - Start research analysis
- `GET /research/{id}` - Get analysis results
- `GET /research/{id}/status` - Check processing status

#### Agent Endpoints
- `POST /agent/{agent_slug}` - Run specific agent
- `GET /agents` - List available agents

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/profile` - Get user profile

## 🧪 Testing

```bash
# Run Python tests
cd ai_engine
python -m pytest tests/

# Run Node.js tests
cd ../backend
npm test

# Run frontend tests
cd ../frontend
npm test
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build individual services
docker build -t research-platform-ai ai_engine/
docker build -t research-platform-backend backend/
docker build -t research-platform-frontend frontend/
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Agent Development
- Agents are located in `ai_engine/agents/`
- Follow the `BaseAgent` class pattern
- Add to `agents/registry.py`
- Include comprehensive tests

## 📊 Performance

- **Processing Time**: <10 minutes per paper (consumer GPU)
- **Accuracy**: 70-80% reproducibility detection
- **Cost**: $0 ongoing (offline mode)
- **Scalability**: Handles 50+ papers in batch mode

## 🔒 Security

- API key encryption
- Rate limiting
- Input validation
- Secure file handling
- Audit logging

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **LangGraph** for agent orchestration
- **Ollama** for local LLM deployment
- **FastAPI** for the Python backend
- **React** for the frontend framework
- **PostgreSQL** for data persistence

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/OMCHOKSI108/Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/OMCHOKSI108/Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform/discussions)
- **Documentation**: [Wiki](https://github.com/OMCHOKSI108/Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform/wiki)

---

<p align="center">
  <strong>Built with ❤️ for the research community</strong>
</p>

<div align="center">
  <img src="https://img.shields.io/badge/Python-3.9+-blue.svg" alt="Python Version">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node.js Version">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
</div>
