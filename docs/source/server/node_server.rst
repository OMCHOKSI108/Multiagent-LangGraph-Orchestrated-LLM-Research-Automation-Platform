Node.js Server (``server/ts_server/``)
=======================================

The TypeScript Node.js server acts as the **API gateway**. It runs on port 4000 and provides
GraphQL, REST health checks, SSE streaming, BullMQ job queues, and reverse proxying to FastAPI.

Entry Point — ``src/index.ts``
-------------------------------

* Express app with CORS, rate limiting, morgan logging
* Apollo Server 4 mounted at ``/graphql``
* BullMQ worker initialization (research, scrape, embed, paper queues)
* SSE manager initialization
* FastAPI proxy routes for papers, images, RAG, research, AI, and agents

GraphQL Schema — ``src/graphql.ts``
------------------------------------

**Queries:**

=============== ====================================================
Query           Description
=============== ====================================================
``me``          Current authenticated user profile
``checkEmail``  Check if email is available
``checkUsername`` Check if username is available
``verifiedUserCount`` Count of verified users
``dashboardStats`` User dashboard statistics
``recentSessions`` Recent research sessions
``mySessions``  All sessions for current user
``researchSession(sessionId)`` Single session details
``projects``    User's projects
``project(id)`` Single project
``apiKeys``     User's API keys
``mySettings``  User settings/preferences
=============== ====================================================

**Mutations:**

================== ================================================
Mutation           Description
================== ================================================
``register``       Create account, sends verification email
``login``          Email/username + password login
``sendMagicLink``  Send sign-in link via email
``verifyMagicLink`` Authenticate with magic link token
``verifyEmail``    Verify email address with token
``forgotPassword`` Send password reset email
``resetPassword``  Reset password with token
``updateSettings`` Update user preferences
``startResearch``  Start a new research session
``createProject``  Create a research project
``updateProject``  Update project details
``deleteProject``  Delete project
``createApiKey``   Generate a new API key
``deleteApiKey``   Revoke an API key
================== ================================================

Database Models — ``src/db.ts``
--------------------------------

+------------------+----------------------------------------------------+
| Model            | Key Fields                                         |
+------------------+----------------------------------------------------+
| User             | id (UUID), email, name, username, password,         |
|                  | email_verified                                     |
+------------------+----------------------------------------------------+
| Token            | id, user_id (FK), type, expires_at, used           |
+------------------+----------------------------------------------------+
| ResearchSession  | id, user_id (FK), title, status                    |
+------------------+----------------------------------------------------+
| Source           | id, session_id (FK), url, title, source_type,      |
|                  | trust_score, relevance_score, freshness_score      |
+------------------+----------------------------------------------------+
| Project          | id, user_id (FK), title, description               |
+------------------+----------------------------------------------------+
| ChatSession      | id, user_id (FK), title                            |
+------------------+----------------------------------------------------+
| ChatMessage      | id, chat_session_id (FK), role, content            |
+------------------+----------------------------------------------------+
| ApiKey           | id, user_id (FK), key_hash, provider, label,       |
|                  | last_used_at, usage_limit                          |
+------------------+----------------------------------------------------+
| Template         | id, user_id (FK), name, description, config (JSONB)|
+------------------+----------------------------------------------------+
| UserSetting      | id, user_id (FK, unique), bio, dob,                |
|                  | personalization_prompt, default_depth, output_style|
+------------------+----------------------------------------------------+

Email Templates — ``src/email.ts``
-----------------------------------

Transactional emails sent via Resend:

+------------------+----------------------------+---------------------------+
| Trigger          | Subject                    | Builder Function          |
+------------------+----------------------------+---------------------------+
| register         | Verify your email          | ``buildVerificationEmail``|
+------------------+----------------------------+---------------------------+
| sendMagicLink    | Your sign-in link          | ``buildMagicLinkEmail``   |
+------------------+----------------------------+---------------------------+
| forgotPassword   | Reset your password        | ``buildPasswordResetEmail``|
+------------------+----------------------------+---------------------------+
| verifyEmail      | Welcome                    | ``buildWelcomeEmail``     |
+------------------+----------------------------+---------------------------+
| resetPassword    | Password changed           | ``buildPasswordChangedEmail``|
+------------------+----------------------------+---------------------------+

Auth Directive — ``src/authDirective.ts``
------------------------------------------

The ``@auth`` GraphQL directive uses ``mapSchema`` and ``getDirective`` from
``@graphql-tools/utils`` to wrap resolvers with JWT authentication checks.
Any field marked with ``@auth`` requires a valid JWT in the ``Authorization`` header.

Queue System — ``src/queue.ts``
-------------------------------

Four BullMQ queues run in the Node.js process:

* ``research`` — full LangGraph pipeline (concurrency: 1)
* ``scrape`` — web scraping (concurrency: 5)
* ``embed`` — embedding generation (concurrency: 3)
* ``paper`` — paper editing/export (concurrency: 2)

Each worker picks up jobs and POSTs to FastAPI internal endpoints, broadcasting
progress and errors via Redis pub/sub for SSE delivery.

SSE Manager — ``src/sse.ts``
-----------------------------

The SSE manager subscribes to Redis ``research:*`` channels and manages per-job
client connections. It implements chunk-aware flushing:

* Progress < 25%: flush 30 chunks at a time
* Progress >= 25%: flush 2 chunks at a time
* Fallback timer: 500ms

Events published: ``progress``, ``token``, ``complete``, ``error``.
