Monitoring & Operations
=======================

Health Checks
-------------

+-----------------------------------+--------------------------------------+
| Service                           | Endpoint                             |
+-----------------------------------+--------------------------------------+
| Node.js Server                    | ``GET /api/health``                  |
+-----------------------------------+--------------------------------------+
| FastAPI Server                    | ``GET /api/health``                  |
+-----------------------------------+--------------------------------------+
| PostgreSQL                        | ``pg_isready`` (Docker healthcheck)  |
+-----------------------------------+--------------------------------------+
| Redis                             | ``redis-cli ping`` (Docker healthcheck)|
+-----------------------------------+--------------------------------------+

Logging
-------

**Node.js**: Winston logger with timestamp and colorized console transport.
Log level configured by ``LOG_LEVEL`` env var (default: ``info``).

**FastAPI**: Standard Python logging via ``logging`` module.
Log level configured by ``LOG_LEVEL`` env var.

**Docker**: Container logs via ``docker compose logs -f``.

SSE Monitoring
--------------

Monitor real-time research progress by connecting to the SSE endpoint:

.. code-block:: bash

   curl -N http://localhost:4000/api/research-jobs/<jobId>/events

Expected event flow:

#. ``progress`` — research started
#. ``progress`` — agent-by-agent status
#. ``token`` — streamed text tokens
#. ``complete`` — research finished
#. ``error`` (on failure) — error description

BullMQ Queue Monitoring
-----------------------

BullMQ queues are visible via Bull Board (if enabled) or by inspecting Redis keys:

.. code-block:: bash

   redis-cli keys "bull:*"
   redis-cli llen "bull:research:active"
   redis-cli llen "bull:research:wait"

Queue names: ``research``, ``scrape``, ``embed``, ``paper``.

Database Monitoring
-------------------

.. code-block:: bash

   # Check pgvector index status
   docker compose exec postgres psql -U postgres -d deep_research
   SELECT * FROM pg_indexes WHERE tablename = 'document_chunks';

   # Check active connections
   SELECT count(*) FROM pg_stat_activity;

   # Check query performance
   EXPLAIN ANALYZE SELECT * FROM document_chunks
   ORDER BY embedding <=> '[0.1, 0.2, ...]' LIMIT 10;

Troubleshooting
---------------

**Container won't start:**

.. code-block:: bash

   docker compose logs <service>
   docker compose ps

**Node server can't connect to PostgreSQL/Redis:**

Check that ``POSTGRES_HOST=postgres`` and ``REDIS_HOST=redis`` in the container
environment (Docker Compose overrides these automatically).

**FastAPI returns 502 through proxy:**

Ensure FastAPI is healthy: ``curl http://fastapi:8000/api/health``.
Check Node proxy logs for connection errors.

**BullMQ jobs stuck in "waiting":**

Check Redis connection and that workers are registered::

   redis-cli ping
   # Should return PONG

**SSE not streaming:**

Verify Redis pub/sub is working::

   # Terminal 1 — subscribe
   redis-cli SUBSCRIBE "research:tokens:*"

   # Terminal 2 — publish (after starting research)
   # Check FastAPI progress.py publishes correctly

**TypeScript compilation errors:**

.. code-block:: bash

   cd server/ts_server && npx tsc --noEmit
