# Backend API

The backend is built with **Node.js** and **Express**, serving as the gateway to the AI Engine.

## Base URL

By default, the API runs at `http://localhost:5000`.

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:
`Authorization: Bearer <token>`

## Endpoints

### Research

#### `POST /research/start`
Starts a new research job.

**Body:**
```json
{
  "topic": "Quantum Computing",
  "breadth": 3,
  "depth": 2
}
```

#### `GET /research/:id`
Retrieves the status and results of a research job.

#### `GET /research/list`
Lists all past research jobs for the authenticated user.

### Events

#### `GET /events/:researchId`
Streams server-sent events (SSE) for a running research job.

### User & Settings

#### `POST /user/apikey/generate`
Generates a new API key for programmatic access.

#### `GET /usage`
Returns token usage statistics and cost estimates.
