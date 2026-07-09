GraphQL API
===========

The GraphQL API is served at ``POST /graphql`` by the Node.js server (``:4000``).
It handles authentication, session management, projects, API keys, and settings.

Authentication
--------------

All mutations except ``register`` and ``login`` require a JWT in the ``Authorization`` header:

.. code-block::

   Authorization: Bearer <jwt_token>

Some query/mutation fields are protected with the ``@auth`` directive. Fields without
``@auth`` (like ``checkEmail``, ``checkUsername``) are public.

Schema
------

.. code-block:: graphql

   type Query {
     # Public
     checkEmail(email: String!): Boolean!
     checkUsername(username: String!): Boolean!
     verifiedUserCount: Int! @auth

     # Authenticated (@auth)
     me: User!
     dashboardStats: DashboardStats!
     recentSessions(limit: Int = 10): [ResearchSession!]!
     mySessions(limit: Int = 20, offset: Int = 0): [ResearchSession!]!
     researchSession(sessionId: String!): ResearchSession!
     projects: [Project!]!
     project(id: String!): Project!
     apiKeys: [ApiKey!]!
     mySettings: UserSetting!
   }

   type Mutation {
     # Auth (public)
     register(email: String!, name: String!, username: String!,
              password: String!): Boolean!
     login(emailOrUsername: String!, password: String!): AuthPayload!
     sendMagicLink(emailOrUsername: String!): Boolean!
     verifyMagicLink(token: String!): AuthPayload!
     verifyEmail(token: String!): Boolean!
     forgotPassword(email: String!): Boolean!
     resetPassword(token: String!, newPassword: String!): AuthPayload!

     # Authenticated (@auth)
     startResearch(question: String!, sessionId: String, depth: Int): ResearchSession!
     updateSettings(...): UserSetting!
     createProject(title: String!, description: String): Project!
     updateProject(id: String!, title: String, description: String): Project!
     deleteProject(id: String!): Boolean!
     createApiKey(provider: String!, label: String!): ApiKey!
     deleteApiKey(id: String!): Boolean!
   }

Types
-----

.. code-block:: graphql

   type User {
     id: String!
     email: String!
     name: String!
     username: String!
     emailVerified: Boolean!
     createdAt: String!
   }

   type AuthPayload {
     token: String!
     user: User!
   }

   type ResearchSession {
     id: String!
     title: String!
     status: String!
     createdAt: String!
     updatedAt: String!
   }

   type DashboardStats {
     totalSessions: Int!
     completedSessions: Int!
     totalProjects: Int!
     totalPapers: Int!
   }

   type Project {
     id: String!
     title: String!
     description: String
     createdAt: String!
   }

   type ApiKey {
     id: String!
     keyPreview: String!
     provider: String!
     label: String!
     lastUsedAt: String
     usageLimit: Int
     createdAt: String!
   }

   type UserSetting {
     bio: String
     dob: String
     personalizationPrompt: String
     defaultDepth: String
     outputStyle: String
     citationPreference: String
     exportPreference: String
   }

Flow Examples
-------------

**Register:**

.. code-block:: graphql

   mutation {
     register(email: "user@example.com", name: "Alice",
              username: "alice", password: "securepass") {
       true # verification email sent
     }
   }

**Login:**

.. code-block:: graphql

   mutation {
     login(emailOrUsername: "alice", password: "securepass") {
       token
       user { id email name }
     }
   }

**Start Research:**

.. code-block:: graphql

   mutation {
     startResearch(question: "What are the latest advances in RAG?") {
       id
       title
       status
     }
   }

**Get Dashboard:**

.. code-block:: graphql

   query {
     dashboardStats {
       totalSessions
       completedSessions
       totalProjects
     }
   }
