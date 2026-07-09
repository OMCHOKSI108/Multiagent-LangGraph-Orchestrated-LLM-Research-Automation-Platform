Quick Start
===========

Prerequisites
-------------

* Docker 20+ with Docker Compose
* Git

Setup
-----

1. Clone the repository:

   .. code-block:: bash

      git clone <repository-url>
      cd Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform

2. Copy and edit the environment file:

   .. code-block:: bash

      cp .env.example .env

   At minimum, set these variables in ``.env``:

   .. code-block:: bash

      GROQ_API_KEY=gsk_your_key_here
      JWT_SECRET=a_random_64_char_secret

3. Start all services:

   .. code-block:: bash

      docker compose up --build -d

   This launches five containers:

   ========= ============ ==========
   Service   Port         Purpose
   ========= ============ ==========
   postgres  :5432        Database
   redis     :6379        Queue + Pub/Sub
   fastapi   :8000        AI engine
   node      :4000        API gateway
   client    :3000        Frontend
   ========= ============ ==========

   Initial startup takes 2-3 minutes while services wait for dependencies.

4. Open the application:

   * **UI**: http://localhost:3000
   * **GraphQL Playground**: http://localhost:4000/graphql
   * **FastAPI Swagger**: http://localhost:8000/docs
   * **Server Status**: http://localhost:4000/api/health

Verification
------------

.. code-block:: bash

   # All services healthy?
   curl http://localhost:4000/api/health
   # → {"status":"ok","service":"node-server-graphql"}

   curl http://localhost:8000/api/health
   # → {"status":"ok","service":"fastapi-server"}

   # Test a quick AI generation
   curl -X POST http://localhost:8000/api/ai/generate \
     -H "Content-Type: application/json" \
     -d '{"prompt":"What is the capital of France?"}'

Development (Without Docker)
----------------------------

**Node server** (:4000):

.. code-block:: bash

   cd server/ts_server
   cp .env.example .env        # edit as needed
   npm install
   npm run dev                 # tsx watch

**FastAPI server** (:8000):

.. code-block:: bash

   cd server/fastapi_server
   source ../.venv/bin/activate
   cp .env.example .env        # edit as needed
   pip install -r requirements.txt
   uvicorn main:app --reload --host 0.0.0.0 --port 8000

**Client** (:3000):

.. code-block:: bash

   cd client
   cp .env.example .env.local
   npm install
   npm run dev
