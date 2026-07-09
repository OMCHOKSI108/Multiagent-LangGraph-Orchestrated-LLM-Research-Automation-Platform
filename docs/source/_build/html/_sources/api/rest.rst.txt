REST API (Node.js)
==================

The Node.js server exposes a small set of REST endpoints alongside the GraphQL API.

Health Check
------------

.. code-block:: bash

   GET /api/health

Response:

.. code-block:: json

   {
     "status": "ok",
     "service": "node-server-graphql",
     "timestamp": "2026-07-09T12:00:00.000Z"
   }

API Index
---------

.. code-block:: bash

   GET /api

Returns a JSON index of all available routes.

SSE Stream
----------

.. code-block:: bash

   GET /api/research-jobs/:jobId/events

Server-Sent Events endpoint for real-time research progress. The client connects
and receives events:

.. code-block::

   event: progress
   data: {"status": "running", "agent": "planner", "message": "Creating research plan..."}

   event: token
   data: {"token": "The"}

   event: token
   data: {"token": " latest"}

   event: complete
   data: {"status": "completed", "report_length": 2450}

Events are flushed using chunk-aware batching (see :doc:`/server/node_server`).

HTML Status Page
----------------

.. code-block:: bash

   GET /

Returns an inline HTML page listing all available GraphQL mutations, queries,
REST endpoints, and proxy routes.

Proxy Routes
------------

These routes are forwarded to the FastAPI backend (``:8000``):

+-----------------------+--------------------------------------------+
| Node Path             | FastAPI Target                             |
+-----------------------+--------------------------------------------+
| ``/api/papers/*``     | ``http://fastapi:8000/api/papers/*``       |
+-----------------------+--------------------------------------------+
| ``/api/images/*``     | ``http://fastapi:8000/api/images/*``       |
+-----------------------+--------------------------------------------+
| ``/api/rag/*``        | ``http://fastapi:8000/api/rag/*``          |
+-----------------------+--------------------------------------------+
| ``/api/research/*``   | ``http://fastapi:8000/api/research/*``     |
+-----------------------+--------------------------------------------+
| ``/api/ai/*``         | ``http://fastapi:8000/api/ai/*``           |
+-----------------------+--------------------------------------------+
| ``/api/agents/*``     | ``http://fastapi:8000/internal/agents/*``  |
+-----------------------+--------------------------------------------+
