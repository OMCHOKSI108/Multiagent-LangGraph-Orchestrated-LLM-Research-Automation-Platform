# Custom Railway Deployment Guide (CLI Only)

This guide covers deploying the **API**, **Worker**, and **AI Engine** strictly using the Railway CLI from your local machine.

*Note: I have already auto-generated the three required `Dockerfile`s in your codebase (`backend/Dockerfile.api`, `backend/Dockerfile.worker`, and `ai_engine/Dockerfile`).*

---

## 1. Railway CLI Setup

1. **Install the CLI** (if you haven't already):
   ```bash
   npm i -g @railway/cli
   ```
2. **Login to Railway** via CLI (You've likely just completed this):
   ```bash
   railway login
   ```
3. **Initialize the Project**:
   ```bash
   cd d:\SEM 6\AIML317_PROJECT_III\project_sgp
   railway init
   ```
   *Follow the prompt to name the project `deep-research-engine-prod` (or similar).*

---

## 2. Docker Configuration Included

I have set up the following production-ready Dockerfiles directly in your system:

### A. Node.js API (`backend/Dockerfile.api`)
- Bootstraps `node:20-slim`.
- Uses `npm ci` for lockfile correctness.
- Uses a non-root `appuser` for security constraints.
- Exposes `$PORT` (dynamically injected by Railway).
- Executes `server.js`.

### B. Node.js Worker (`backend/Dockerfile.worker`)
- Identical to the API docker setup, but **does not specify an `EXPOSE` port command**, as workers shouldn't receive generic HTTP web traffic.
- Executes `worker.js`.

### C. Python FastAPI (`ai_engine/Dockerfile`)
- Bootstraps `python:3.11-slim` with `build-essential`.
- Specifically overrides output buffering with `PYTHONUNBUFFERED=1` inside Railway's container boundary.
- Forces Uvicorn to bind strictly to host `0.0.0.0` (required for Railway's inbound routing controller).

---

## 3. Deploying Without GitHub (CLI Execution)

Because all services are under a single codebase (Monorepo), we upload them selectively by pointing `railway up` to the respective file logic.

To deploy each service, you will issue a `railway up` command. Railway will prompt you to create an empty service (Answer: **Empty Service**) on the first deployment of each.

**1. Deploy the API:**
```bash
cd backend
copy Dockerfile.api Dockerfile
railway up -d
```
*Wait for the CLI to return. It will zip the backend folder, read `Dockerfile`, and deploy the web service.*

**2. Deploy the Worker:**
```bash
cd backend
copy Dockerfile.worker Dockerfile
railway up -d
```
*When prompted by `railway up`, choose to create a **New Empty Service**. Railway isolates it.*

**3. Deploy the AI Engine:**
```bash
cd ../ai_engine
railway up -d
```
*Again, create a **New Empty Service**. Railway reads the standard `Dockerfile`.*

---

## 4. Environment Variables Setup

You can set variables via CLI (`railway vars set KEY="value"`) or dump them securely in the Dashboard UI.

1. **API Environment:**
   ```bash
   # From root
   railway vars set NODE_ENV=production PORT=5000 JWT_SECRET="..." REDIS_URL="..." DATABASE_URL="..." AI_ENGINE_URL="http://ai-engine.railway.internal:8000" --service <API_SERVICE_NAME>
   ```

2. **Worker Environment:**
   ```bash
   railway vars set NODE_ENV=production REDIS_URL="..." DATABASE_URL="..." --service <WORKER_SERVICE_NAME>
   ```

3. **AI Engine Environment:**
   ```bash
   railway vars set OPENAI_API_KEY="..." PORT=8000 --service <AI_ENGINE_SERVICE_NAME>
   ```
*Tip: For Shared Variables like `REDIS_URL`, navigate to the Railway Project Settings -> Shared Variables to make them universally accessible to both API and Worker without duplicating strings.*

---

## 5. Networking Between Services

Railway provisions Private Networking automatically under the `.railway.internal` domain.

- **API -> AI Engine:** Do not generate a public domain for the AI Engine. The API should exclusively call the AI Engine over the Private Network. Set `AI_ENGINE_URL=http://<ai-engine-service-name>.railway.internal:8000` in the API env vars.
- **Worker & Database:** If you spin up Postgres and Redis plugins from the Railway dashboard, they auto-inject `DATABASE_URL` and `REDIS_URL` directly to the attached services.

---

## 6. Production Validation Checklist

- [ ] **Port Binding Validation:** Check the logs inside Railway Dashboard. Ensure `server.js` reports `Listening on 0.0.0.0:5000` (or dynamic port) and `main.py` reports `Uvicorn running on http://0.0.0.0:8000`.
- [ ] **SSE Streaming:** Ensure the API service has a **Public Domain** attached in the Railway settings. Railway's proxy is heavily optimized for SSE out-of-the-box.
- [ ] **Worker Verification:** The Worker service **should not** have a public domain. Verify its Railway logs output `Connected to Redis`.
- [ ] **Memory Control:** Monitor metric graphs in the dashboard. If `ai_engine` exceeds the Free Tier limits (~512MB RAM), the container will report `OOMKilled`.

---

## 7. Common Deployment Mistakes to Avoid

1. **Binding to localhost or 127.0.0.1:** If FastAPI binds to `127.0.0.1`, Railway’s incoming web proxies cannot reach it. The Dockerfile already overrides this to `0.0.0.0`.
2. **Not Swapping Dockerfiles:** Since `api` and `worker` share the `backend/` directory, ensure you have actively copied the correct `Dockerfile.api` / `Dockerfile.worker` to `Dockerfile` prior to executing `railway up` for each respectively.
3. **Railway Sleep Behavior:** If deploying on a Hobby/Free tier, inactive background services will go to sleep. Your frontend should gracefully handle 3-10 sec cold starts on SSE endpoints after idle periods.
