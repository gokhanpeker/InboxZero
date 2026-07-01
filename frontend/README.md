# InboxZero Frontend

Next.js 14 (App Router) UI for the InboxZero batch triage challenge.

## Scripts

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## API proxy

Browser calls same-origin `/api/*`. The server route `app/api/[...path]/route.ts` forwards requests to:

- `BACKEND_TUNNEL_URL` (Vercel / production), or
- `http://127.0.0.1:8000` (local dev default)

Set `BACKEND_TUNNEL_URL` in Vercel project settings (server-side only — no `NEXT_PUBLIC_` prefix).

## Key pages

| Route | Purpose |
|-------|---------|
| `/login`, `/register` | Auth |
| `/submit` | Batch submit (textarea or file upload) |
| `/jobs` | Job list with live progress |
| `/jobs/[id]` | Item table, Retry, Detail modal |

## Related docs

See the root [README.md](../README.md) for full stack setup, deployment, and retry behavior.

**Live:** https://inbox-zero-green-phi.vercel.app
