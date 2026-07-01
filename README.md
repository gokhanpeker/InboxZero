# InboxZero

[![CI](https://github.com/gokhanpeker/InboxZero/actions/workflows/ci.yml/badge.svg)](https://github.com/gokhanpeker/InboxZero/actions/workflows/ci.yml)

AI batch triage for support messages — submit a batch, get a job back instantly, and watch a background worker classify each item with Google Gemini while the UI polls for live progress.

Built for the Efsora Labs Full-Stack Challenge.

**Live demo:** https://inbox-zero-green-phi.vercel.app (frontend on Vercel; API via cloudflared tunnel to local Docker stack during demo)
**Demo video link** https://drive.google.com/file/d/1UsR0LOWWhpYKtOPSggirQ7OlSIgJjlRW/view?usp=sharing

## Stack

| Layer | Choice |
|-------|--------|
| API | FastAPI + SQLAlchemy 2.0 + Alembic |
| Worker / queue | Celery 5 + Redis 7 |
| Database | PostgreSQL 16 |
| Auth | JWT (email/password, bcrypt) |
| AI | Google Gemini (`gemini-2.5-flash`) |
| Frontend | Next.js 14 (App Router) + TanStack Query |
| Containers | Docker Compose (api, worker, postgres, redis) |
| Deployment | Vercel (frontend) + local backend via cloudflared tunnel |

## Architecture

```
Browser → Next.js (Vercel) → /api/* route handler (fetch proxy) → FastAPI (tunnel)
                                              ↓ enqueue
                                         Celery worker → Gemini → PostgreSQL
                                              ↑
                                            Redis
```

- **API** handles auth, batch submit, job/item reads, and manual retry. It never calls the AI directly.
- **Worker** claims items from the queue, runs Gemini, writes results, and rolls up job status.
- **Frontend** proxies `/api/*` through `frontend/app/api/[...path]/route.ts` (server-side `fetch` to `BACKEND_TUNNEL_URL` or `http://127.0.0.1:8000`).
- **Postgres and Redis** stay on the internal Docker network — only the API is exposed on `127.0.0.1:8000`.

## Quick start (local)

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for the frontend dev server)
- A [Google Gemini API key](https://aistudio.google.com/apikey)

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

- `JWT_SECRET` — random string, **at least 32 characters**
- `GEMINI_API_KEY` — your Gemini key

Other defaults work with Docker Compose as-is.

### 2. Start the backend stack

```bash
docker compose up -d --build
docker compose run --rm api alembic upgrade head
```

Services:

| Service | URL / access |
|---------|----------------|
| API | http://127.0.0.1:8000 |
| Health | http://127.0.0.1:8000/health |
| Postgres | internal only |
| Redis | internal only |
| Worker | internal only (concurrency=2) |

OpenAPI docs (`/docs`) are available only when `DEBUG=true`.

Worker logs (debugging AI / queue issues):

```bash
docker compose logs worker -f
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — the Next.js dev server proxies `/api/*` to `http://127.0.0.1:8000` via the route handler.

### 4. Try the flow

1. Register and sign in.
2. Go to **Submit batch** — paste messages (one per line) or upload a `.txt` / `.csv` file. Sample files are in `samples/`.
3. Open the job detail page and watch items move through `queued → processing → done`.
4. Click **Detail** on a completed item to view full AI output and copy the draft reply.
5. Include the word `FAIL` in a message to simulate a failed item on first processing, then use **Retry** (manual retry runs real AI and can succeed).
6. If an item stays in `queued` or `processing` for more than **2 minutes**, a **Retry** button appears to re-enqueue it.

## Batch input

| Source | Rule |
|--------|------|
| Textarea | One message per line; blank lines are skipped |
| `.txt` | Same as textarea |
| `.csv` | One message per row (first column); optional header `text` or `message` is skipped |

Limits (enforced on both client and server):

- Max **50** items per batch
- Max **10,000** characters per item
- Max **1 MB** upload size

## API overview

All protected routes require `Authorization: Bearer <token>`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account, returns JWT |
| POST | `/auth/login` | Sign in, returns JWT |
| GET | `/health` | Liveness probe |
| POST | `/jobs` | Submit batch (returns immediately) |
| GET | `/jobs` | List your jobs with rollup counts |
| GET | `/jobs/{id}` | Job detail |
| GET | `/jobs/{id}/items` | Items for a job |
| POST | `/items/{id}/retry` | Re-enqueue a failed or stuck item |

Cross-user access returns **404** (not 403) to avoid resource enumeration.

## Retry and idempotency

Three layers prevent duplicate or corrupt processing:

1. **DB status guard** — the worker atomically claims an item only when `status ∈ {queued, failed}` and `attempts < MAX_RETRY_ATTEMPTS`. If the update affects zero rows, the task exits early.
2. **Unique Celery task ids** — each enqueue uses `task_id=item-{item_id}-{timestamp}` so manual retries are not dropped by the broker.
3. **Terminal write protection** — items already marked `done` are never overwritten. Manual retry resets state (`attempts=0`, clears error/AI fields) and re-enqueues.

**Automatic retries (worker):**

- Transient failures (AI timeout, HTTP 429/5xx, invalid JSON from Gemini) → Celery `autoretry` with exponential backoff (max 3 retries, cap 60s).
- Permanent failures (invalid API key, validation errors) → item marked `failed` with a user-safe error message; no further automatic retry.

**Manual retry (API):**

- `POST /items/{id}/retry` accepts `failed`, `queued`, or `processing` items owned by the authenticated user.
- Resets `attempts` to `0`, clears prior results/errors, sets status to `queued`, and re-enqueues with `skip_fail_simulation=True`.
- The UI shows **Retry** immediately for `failed` items, and for `queued`/`processing` items that have not updated in **2 minutes**.

**Simulated failure (demo):**

- On **automatic** first processing, if an item's text contains `FAIL`, the worker marks it failed with: `Simulated processing failure.`
- On **manual retry**, the `FAIL` check is skipped and real AI processing runs.

## Deployment (Vercel + tunnel)

The challenge expects a live Vercel frontend talking to a locally running backend during demo.

### Option A — Vercel Dashboard (recommended)

1. Open [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Import **gokhanpeker/InboxZero** (or your fork).
3. Configure the project:

   | Setting | Value |
   |---------|--------|
   | Framework Preset | Next.js |
   | Root Directory | `frontend` |
   | Build Command | `npm run build` (default) |
   | Output Directory | `.next` (default) |
   | Install Command | `npm install` (default) |

4. **Do not deploy yet** — open **Environment Variables** and add:

   | Name | Value | Environments |
   |------|--------|--------------|
   | `BACKEND_TUNNEL_URL` | `https://your-subdomain.trycloudflare.com` | Production, Preview, Development |

   Use your real cloudflared URL (see backend steps below). No `NEXT_PUBLIC_` prefix.

5. Click **Deploy**. Production URL: **https://inbox-zero-green-phi.vercel.app**

6. The API route handler (`app/api/[...path]/route.ts`) proxies `/api/*` to `BACKEND_TUNNEL_URL`. It strips `Content-Encoding` from backend responses so browsers do not hit `ERR_CONTENT_DECODING_FAILED` after gzip decompression in Node `fetch`.

### Option B — Vercel CLI

```bash
cd frontend
npx vercel login          # one-time browser auth
npx vercel link           # link to a Vercel project
npx vercel env add BACKEND_TUNNEL_URL   # paste tunnel URL when prompted
npx vercel --prod
```

### Backend (laptop)

Keep Docker Compose running:

```bash
docker compose up -d
docker compose run --rm api alembic upgrade head   # first time only
```

Expose the API through cloudflared (leave this terminal open during demo):

```bash
cloudflared tunnel --url http://127.0.0.1:8000
```

Copy the `https://….trycloudflare.com` URL into Vercel as `BACKEND_TUNNEL_URL`, then **Redeploy** if you already deployed without it.

Verify the tunnel:

```bash
curl https://YOUR-TUNNEL.trycloudflare.com/health
# → {"status":"ok"}
```

### Demo day checklist

1. `docker compose up -d` — API + worker + Postgres + Redis running
2. `cloudflared tunnel --url http://127.0.0.1:8000` — tunnel active
3. Vercel `BACKEND_TUNNEL_URL` matches the current tunnel URL (tunnel URL changes each time unless you use a named tunnel)
4. Open your Vercel URL → register → submit a batch → watch live progress

**Note:** If the tunnel URL changes, update `BACKEND_TUNNEL_URL` in Vercel and redeploy (or use Vercel env + redeploy from the dashboard without a full rebuild — **Redeploy** from Deployments tab after updating env).

## Development

### Backend (without Docker)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Start Postgres + Redis locally, set DATABASE_URL and REDIS_URL in .env
alembic upgrade head
uvicorn app.main:app --reload
celery -A app.worker.celery_app worker --loglevel=info --concurrency=2
```

### Tests and lint

```bash
# Backend
cd backend && pip install -r requirements.txt && pytest tests/ -v
cd backend && pip install ruff && ruff check .

# Frontend
cd frontend && npm run lint && npx tsc --noEmit
```

## Security notes

- Never commit `.env`. Use `.env.example` as a template.
- `JWT_SECRET` must be ≥ 32 characters — the API refuses to start otherwise.
- `GEMINI_API_KEY` and `JWT_SECRET` exist only in backend/worker environment; they are never sent to the browser.
- Rate limits: login/register **5/minute** per IP; batch submit **10/hour** per user.
- If you fork this repo, rotate all secrets and API keys.

## Project structure

```
├── backend/          FastAPI app, Celery worker, Alembic migrations
├── frontend/         Next.js UI (includes /api route handler proxy)
├── samples/          Example batch files for testing
├── docker-compose.yml
├── .env.example
└── README.md
```

## Submission checklist

- [x] Repo link — https://github.com/gokhanpeker/InboxZero
- [x] Live Vercel URL — https://inbox-zero-green-phi.vercel.app
- [x] Backend local + tunnel (`cloudflared tunnel --url http://localhost:8000`)
- [x] Registration instructions (above)
- [x] AI provider: Google Gemini (`gemini-2.5-flash`)
- [x] Queue/broker: Celery + Redis; retry & idempotency documented (above)
- [x] `.env.example` committed
- [x] Migration file(s) committed
- [x] `docker compose up` brings up API + worker + DB + broker
- [ ] Demo video link (2–5 min)
- [x] No secrets committed

## License

MIT — see repository for details.
