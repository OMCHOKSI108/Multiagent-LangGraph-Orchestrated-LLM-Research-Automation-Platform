import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { schema, getUserFromToken } from "./graphql.js";
import { sequelize } from "./db.js";
import logger from "./logger.js";
import { startWorker, startScrapeWorker, startEmbedWorker, startPaperWorker } from "./queue.js";
import { SSEManager } from "./sse.js";

const app = express();
const PORT = process.env.PORT || 4000;
const sseManager = new SSEManager();

app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later." },
});

morgan.token("graphql-query", (req: Request) => {
  const body = req.body as { query?: string };
  if (body?.query) {
    const op = body.query.replace(/\s+/g, " ").trim().slice(0, 120);
    return op;
  }
  return "";
});

app.use(
  morgan(
    ":method :url :status :res[content-length] :graphql-query :response-time ms",
    { stream: { write: (msg: string) => logger.info(msg.trim()) } },
  ),
);

app.get("/", (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Multiagent Research Automation Platform — Node Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #1a1a1a; color: #e5a985; line-height: 1.6; padding: 2rem;
    }
    .container { max-width: 720px; margin: 0 auto; }
    h1 { font-size: 1.75rem; font-weight: 600; margin-bottom: .25rem; }
    .sub { color: #e5a98599; font-size: .9rem; margin-bottom: 2rem; }
    section { margin-bottom: 2rem; }
    h2 {
      font-size: 1.1rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: .05em; color: #e5a98577; margin-bottom: .75rem;
    }
    .card {
      background: #222; border: 1px solid #e5a98522; border-radius: 10px;
      padding: 1rem 1.25rem; margin-bottom: .5rem;
    }
    .route { font-weight: 600; color: #fff; font-family: monospace; font-size: .95rem; }
    .desc { color: #e5a985bb; font-size: .85rem; margin-top: 2px; }
    .badge {
      display: inline-block; font-size: .65rem; font-weight: 700; padding: 2px 8px;
      border-radius: 999px; margin-right: 8px; vertical-align: middle;
    }
    .get { background: #22c55e22; color: #22c55e; }
    .post { background: #3b82f622; color: #3b82f6; }
    .mut { background: #a855f722; color: #a855f7; }
    .qry { background: #22c55e22; color: #22c55e; }
    .sse { background: #f59e0b22; color: #f59e0b; }
    .mono { font-family: monospace; font-size: .8rem; color: #e5a98599; }
    hr { border: none; border-top: 1px solid #e5a98515; margin: 1.5rem 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Multiagent Research Automation Platform</h1>
    <p class="sub">Node GraphQL Server</p>

    <section>
      <h2>REST</h2>
      <div class="card">
        <span class="badge get">GET</span><span class="route">/</span>
        <div class="desc">This page</div>
      </div>
      <div class="card">
        <span class="badge get">GET</span><span class="route">/api</span>
        <div class="desc">API index (JSON)</div>
      </div>
      <div class="card">
        <span class="badge get">GET</span><span class="route">/api/health</span>
        <div class="desc">Health check</div>
      </div>
      <div class="card">
        <span class="badge sse">SSE</span><span class="route">GET /api/research-jobs/:jobId/events</span>
        <div class="desc">SSE stream for research job progress & tokens</div>
      </div>
    </section>

    <section>
      <h2>GraphQL — Query</h2>
      <div class="card">
        <span class="badge qry">QRY</span><span class="route">me</span>
        <div class="desc"><span class="mono">me: User</span> &nbsp; (requires auth header)</div>
      </div>
      <div class="card">
        <span class="badge qry">QRY</span><span class="route">researchSession</span>
        <div class="desc"><span class="mono">researchSession(sessionId): ResearchSessionDetail</span></div>
      </div>
    </section>

    <section>
      <h2>GraphQL — Mutations</h2>
      <div class="card">
        <span class="badge mut">MUT</span><span class="route">register</span>
        <div class="desc"><span class="mono">register(email, name, username, password): AuthPayload</span></div>
      </div>
      <div class="card">
        <span class="badge mut">MUT</span><span class="route">login</span>
        <div class="desc"><span class="mono">login(emailOrUsername, password): AuthPayload</span></div>
      </div>
      <div class="card">
        <span class="badge mut">MUT</span><span class="route">sendMagicLink</span>
        <div class="desc"><span class="mono">sendMagicLink(emailOrUsername): Boolean</span></div>
      </div>
      <div class="card">
        <span class="badge mut">MUT</span><span class="route">verifyMagicLink</span>
        <div class="desc"><span class="mono">verifyMagicLink(token): AuthPayload</span></div>
      </div>
      <div class="card">
        <span class="badge mut">MUT</span><span class="route">verifyEmail</span>
        <div class="desc"><span class="mono">verifyEmail(token): Boolean</span></div>
      </div>
      <div class="card">
        <span class="badge mut">MUT</span><span class="route">forgotPassword</span>
        <div class="desc"><span class="mono">forgotPassword(email): Boolean</span></div>
      </div>
      <div class="card">
        <span class="badge mut">MUT</span><span class="route">resetPassword</span>
        <div class="desc"><span class="mono">resetPassword(token, newPassword): AuthPayload</span></div>
      </div>
      <div class="card">
        <span class="badge mut">MUT</span><span class="route">startResearch</span>
        <div class="desc"><span class="mono">startResearch(question, depth): ResearchJobResult</span></div>
      </div>
      <div class="card">
        <span class="badge mut">MUT</span><span class="route">createProject</span>
        <div class="desc"><span class="mono">createProject(title, description): Project</span></div>
      </div>
      <div class="card">
        <span class="badge mut">MUT</span><span class="route">updateProject</span>
        <div class="desc"><span class="mono">updateProject(id, title, description): Project</span></div>
      </div>
      <div class="card">
        <span class="badge mut">MUT</span><span class="route">deleteProject</span>
        <div class="desc"><span class="mono">deleteProject(id): Boolean</span></div>
      </div>
      <div class="card">
        <span class="badge mut">MUT</span><span class="route">createApiKey</span>
        <div class="desc"><span class="mono">createApiKey(provider, label, rawKey): ApiKey</span></div>
      </div>
      <div class="card">
        <span class="badge mut">MUT</span><span class="route">deleteApiKey</span>
        <div class="desc"><span class="mono">deleteApiKey(id): Boolean</span></div>
      </div>
    </section>

    <section>
      <h2>GraphQL — New Queries</h2>
      <div class="card">
        <span class="badge qry">QRY</span><span class="route">projects</span>
        <div class="desc"><span class="mono">projects: [Project!]!</span> &nbsp; (requires auth)</div>
      </div>
      <div class="card">
        <span class="badge qry">QRY</span><span class="route">project</span>
        <div class="desc"><span class="mono">project(id): Project</span> &nbsp; (requires auth)</div>
      </div>
      <div class="card">
        <span class="badge qry">QRY</span><span class="route">apiKeys</span>
        <div class="desc"><span class="mono">apiKeys: [ApiKey!]!</span> &nbsp; (requires auth)</div>
      </div>
    </section>

    <hr>
    <p class="mono">POST /graphql — endpoint for all queries & mutations</p>
  </div>
</body>
</html>`);
});

app.get("/api", (_req: Request, res: Response) => {
  res.json({
    server: "node-server-graphql",
    rest: {
      "GET /": "Server status",
      "GET /api": "API index",
      "GET /api/health": "Health check",
      "GET /api/research-jobs/:jobId/events": "SSE stream for research job",
    },
    graphql: {
      endpoint: "/graphql",
      queries: ["me", "researchSession(sessionId)", "projects", "project(id)", "apiKeys"],
      mutations: [
        "register(email, name, username, password)",
        "login(emailOrUsername, password)",
        "sendMagicLink(emailOrUsername)",
        "verifyMagicLink(token)",
        "verifyEmail(token)",
        "forgotPassword(email)",
        "resetPassword(token, newPassword)",
        "updateSettings(...)",
        "startResearch(question, depth)",
        "createProject(title, description)",
        "updateProject(id, title, description)",
        "deleteProject(id)",
        "createApiKey(provider, label, rawKey)",
        "deleteApiKey(id)",
      ],
    },
  });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "node-server-graphql" });
});

app.get("/api/research-jobs/:jobId/events", (req: Request, res: Response) => {
  const { jobId } = req.params;
  const jobIdValue = Array.isArray(jobId) ? jobId[0] : jobId;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ jobId: jobIdValue })}\n\n`);

  sseManager.addClient(jobIdValue, res);

  req.on("close", () => {});
});

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

const fastapiProxy = createProxyMiddleware({
  target: FASTAPI_URL || "http://localhost:8000",
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req, _res) => {
      proxyReq.setHeader("X-Forwarded-For", (req as Request).ip || "");
    },
  },
});

const fastapiProxyInternal = createProxyMiddleware({
  target: FASTAPI_URL || "http://localhost:8000",
  changeOrigin: true,
  pathRewrite: { "^/api/agents": "/internal/agents" },
  on: {
    proxyReq: (proxyReq, req, _res) => {
      proxyReq.setHeader("X-Forwarded-For", (req as Request).ip || "");
    },
  },
});

app.use("/api/papers", fastapiProxy);
app.use("/api/images", fastapiProxy);
app.use("/api/rag", fastapiProxy);
app.use("/api/research", fastapiProxy);
app.use("/api/agents", fastapiProxyInternal);
app.use("/api/ai", fastapiProxy);

const server = new ApolloServer({
  schema,
  plugins: [ApolloServerPluginLandingPageLocalDefault()],
});
await server.start();

app.use(
  "/graphql",
  authLimiter,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expressMiddleware(server as any, {
    context: async ({ req }) => {
      const raw = req.headers.authorization;
      const authHeader = Array.isArray(raw) ? raw[0] : raw;
      const user = await getUserFromToken(authHeader);
      return { user };
    },
  }) as any,
);

await sequelize.sync();
logger.info("Database synced");

startWorker(sseManager);
startScrapeWorker(sseManager);
startEmbedWorker(sseManager);
startPaperWorker(sseManager);

app.listen(PORT, () => {
  logger.info(`GraphQL: http://localhost:${PORT}/graphql`);
  logger.info(`Health:  http://localhost:${PORT}/api/health`);
  logger.info(`SSE:     http://localhost:${PORT}/api/research-jobs/:jobId/events`);
});
