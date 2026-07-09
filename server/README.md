# Server

Backend services for the Multiagent Research Automation Platform.

## Folder Structure

| Directory | Description |
|-----------|-------------|
| `ts_server/` | Node.js + Express + **GraphQL** auth server |
| `fastapi_server/` | Python FastAPI server |

---

## Node Server (GraphQL Auth)

GraphQL API for authentication — register, login, magic link, forgot password.

### Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js + Express |
| API | Apollo Server (GraphQL) |
| ORM | Sequelize |
| Database | PostgreSQL |
| Email | Resend |
| Logging | Winston + Morgan |

### Schema

```graphql
type Mutation {
  register(email: String!, name: String!, username: String!, password: String!): AuthPayload!
  login(emailOrUsername: String!, password: String!): AuthPayload!
  sendMagicLink(emailOrUsername: String!): Boolean!
  verifyMagicLink(token: String!): AuthPayload!
  verifyEmail(token: String!): Boolean!
  forgotPassword(email: String!): Boolean!
  resetPassword(token: String!, newPassword: String!): AuthPayload!
}

type Query {
  me: User
}
```

### Quick Start

```bash
cd ts_server
npm install
cp .env.example .env   # edit DB + Resend creds
npm run dev
```

| Endpoint | URL |
|----------|-----|
| GraphQL | `http://localhost:4000/graphql` |
| Health | `http://localhost:4000/api/health` |

### Email Setup (Resend)

This server uses [Resend](https://resend.com) for transactional emails.

1. Get an API key from https://resend.com
2. Set `RESEND_API_KEY` and `EMAIL_FROM` in `.env`
3. Verify your domain in Resend (or use their `@resend.dev` fallback for testing)

---

## FastAPI Server

```bash
cd fastapi_server
pip install -r requirements.txt
python main.py
```

| Endpoint | URL |
|----------|-----|
| API | `http://localhost:8000` |
| Health | `http://localhost:8000/api/health` |
