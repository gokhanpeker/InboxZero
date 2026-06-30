# InboxZero

[![CI](https://github.com/gokhanpeker/InboxZero/actions/workflows/ci.yml/badge.svg)](https://github.com/gokhanpeker/InboxZero/actions/workflows/ci.yml)

AI batch triage for support messages — submit a batch, get a job back instantly, and watch a background worker classify each item with Google Gemini while the UI polls for live progress.

Built for the Efsora Labs Full-Stack Challenge.

## Stack

| Layer | Choice |
|-------|--------|
| API | FastAPI + SQLAlchemy 2.0 + Alembic |
| Worker / queue | Celery 5 + Redis 7 |
| Database | PostgreSQL 16 |
| Auth | JWT (email/password, bcrypt) |
| AI | Google Gemini (`gemini-2.0-flash`) |
| Frontend | Next.js 14 (App Router) + TanStack Query |
| Containers | Docker Compose (api, worker, postgres, redis) |
| Deployment | Vercel (frontend) + local backend via cloudflared tunnel |

## Architecture

```
Browser → Next.js (Vercel) → /api/* rewrite → FastAPI (local tunnel)
                                              ↓ enqueue
                                         Celery worker → Gemini → PostgreSQL
                                              ↑
                                            Redis
```

- **API** handles auth, batch submit, job/item reads, and manual retry. It never calls the AI directly.
- **Worker** claims items from the queue, runs Gemini, writes results, and rolls up job status.
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

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — the Next.js dev server proxies `/api/*` to `http://localhost:8000`.

### 4. Try the flow

1. Register and sign in.
2. Go to **Submit batch** — paste messages (one per line) or upload a `.txt` / `.csv` file.
3. Open the job detail page and watch items move through `queued → processing → done`.
4. Include the word `FAIL` in a message to simulate a failed item, then use **Retry**.

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
| POST | `/items/{id}/retry` | Re-enqueue a failed item |

Cross-user access returns **404** (not 403) to avoid resource enumeration.

## Retry and idempotency

Three layers prevent duplicate or corrupt processing:

1. **DB status guard** — the worker atomically claims an item only when `status ∈ {queued, failed}` and `attempts < MAX_RETRY_ATTEMPTS`. If the update affects zero rows, the task exits early.
2. **Celery task deduplication** — each enqueue uses `task_id=item-{item_id}` so duplicate tasks for the same item are rejected by the broker.
3. **Terminal write protection** — items already marked `done` are never overwritten. Manual retry resets a failed item to `queued`, clears its error/result fields, and re-enqueues.

**Automatic retries (worker):**

- Transient failures (AI timeout, HTTP 429/5xx, invalid JSON from Gemini) → Celery `autoretry` with exponential backoff (max 3 retries, cap 60s).
- Permanent failures (invalid API key, validation errors) → item marked `failed` with a user-safe error message; no further automatic retry.

**Manual retry (API):**

- `POST /items/{id}/retry` accepts only `failed` items owned by the authenticated user.
- Resets status to `queued`, clears prior results, and re-enqueues the item.

**Simulated failure (demo):**

- If an item's text contains `FAIL`, the worker marks it failed with: `Simulated processing failure.`

## Deployment (Vercel + tunnel)

The challenge expects a live Vercel frontend talking to a locally running backend during demo.

### Backend (laptop)

Keep Docker Compose running:

```bash
docker compose up -d
```

Expose the API through cloudflared:

```bash
cloudflared tunnel --url http://localhost:8000
```

Copy the generated `*.trycloudflare.com` URL.

### Frontend (Vercel)

1. Import the repo and set the root directory to `frontend`.
2. Add a server-side environment variable (no `NEXT_PUBLIC_` prefix):

   ```
   BACKEND_TUNNEL_URL=https://your-tunnel.trycloudflare.com
   ```

3. Deploy. Browser requests to `/api/*` are rewritten to your tunnel URL server-side.

During demo: laptop on, Docker stack running, tunnel active.

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

### Lint

```bash
# Frontend
cd frontend && npm run lint && npx tsc --noEmit

# Backend (install ruff first)
cd backend && pip install ruff && ruff check .
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
├── frontend/         Next.js UI
├── docker-compose.yml
├── .env.example
└── README.md
```

## License

MIT — see repository for details.
