Deployment
==========

Docker Compose (Production)
---------------------------

The entire stack runs in five containers orchestrated by ``docker-compose.yml``:

.. code-block:: bash

   # Build and start all services
   docker compose up --build -d

   # View logs
   docker compose logs -f

   # Stop
   docker compose down

   # Stop and remove volumes
   docker compose down -v

Service Dependencies
--------------------

.. code-block::

   postgres (pgvector/pg16:5432)
       │
       ▼
   redis (redis:7-alpine:6379)
       │
       ▼
   fastapi (app:8000)
       │
       ▼
   node (server/ts_server:4000)
       │
       ▼
   client (nextjs:3000)

Each service has a healthcheck that waits for dependencies to be ready.

Dockerfiles
-----------

**Node server** (``server/ts_server/Dockerfile``):

Multi-stage build:

#. ``deps`` — install production dependencies
#. ``tsc`` — compile TypeScript
#. ``runtime`` — run ``node dist/index.js`` on ``node:22-alpine``

**FastAPI server** (``server/fastapi_server/Dockerfile``):

Single-stage build on ``python:3.12-slim``, installs system deps + Python packages,
runs ``uvicorn main:app --host 0.0.0.0 --port 8000``.

**Client** (``client/Dockerfile``):

Multi-stage: build Next.js, serve with ``next start`` on port 3000.

Environment Variables
---------------------

All services read from the root ``.env`` file. Docker Compose overrides
container-to-container wiring:

.. code-block:: bash

   # docker-compose.yml overrides
   POSTGRES_HOST=postgres
   REDIS_HOST=redis
   FASTAPI_URL=http://fastapi:8000

Setup Checklist
---------------

Before deploying:

#. Generate a strong ``JWT_SECRET`` (64+ random characters)
#. Set ``GROQ_API_KEY`` and/or ``OPENROUTER_API_KEY``
#. Set ``EXA_API_KEY`` for web search
#. Set ``RESEND_API_KEY`` for email
#. Review feature flags in ``.env``
#. Ensure ``POSTGRES_PASSWORD`` is a strong value
#. Set ``APP_URL`` to the public-facing URL

Scaling Notes
-------------

* **BullMQ queues** — Each queue worker runs in the Node process. Increase concurrency
  for scrape/embed/paper queues to handle higher throughput.
* **FastAPI** — Stateless; multiple replicas can be added behind a load balancer.
  The pipeline is idempotent per session.
* **PostgreSQL** — The HNSW index on ``document_chunks.embedding`` scales well to
  millions of vectors. Monitor ``pgvector`` performance for large deployments.
* **Redis** — Dual-purpose (BullMQ + pub/sub). Consider separate Redis instances
  for queue and pub/sub at scale.
