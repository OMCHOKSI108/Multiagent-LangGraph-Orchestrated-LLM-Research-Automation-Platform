API Reference
=============

The platform exposes three API surfaces:

.. toctree::
   :maxdepth: 2

   graphql
   rest
   fastapi

Access Points
-------------

+------------------+---------------------------+--------------------------------+
| Surface          | URL (production)          | Documentation                  |
+------------------+---------------------------+--------------------------------+
| GraphQL          | ``POST /graphql``         | :doc:`graphql`                 |
+------------------+---------------------------+--------------------------------+
| REST (Node)      | ``GET /api/health``       | :doc:`rest`                    |
+------------------+---------------------------+--------------------------------+
| REST (FastAPI)   | ``/api/{research,rag,     | :doc:`fastapi`                 |
|                  |   papers,images,ai,       |                                |
|                  |   agents}/*``             |                                |
+------------------+---------------------------+--------------------------------+

All client-facing requests go through the Node.js gateway at ``:4000``.
FastAPI is private and only accessible via the proxy or internal queue workers.
