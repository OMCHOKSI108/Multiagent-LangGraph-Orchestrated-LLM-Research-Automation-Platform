# Installation & Usage

Follow these steps to set up the Deep Research Engine on your local machine.

## Prerequisites

- **Python**: Version 3.10 or higher.
- **Node.js**: Version 18 or higher.
- **Git**: For cloning the repository.
- **PostgreSQL**: (Optional) If you plan to use a local database instead of the default SQLite/JSON store.

## Installation

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
# It is recommended to use a virtual environment
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

## Configuration

Create a `.env` file in the root directory and add your API keys:

```ini
# AI Providers
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...

# Search Providers
TAVILY_API_KEY=tvly-...
```

## Running the Application

We provide a convenient script to launch all services (Frontend, Backend, AI Engine) simultaneously.

```bash
python run.py
```

Access the dashboard at `http://localhost:3000`.

## Building Documentation

To build this documentation locally:

```bash
mkdocs serve
```
