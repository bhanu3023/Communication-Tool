# Deploy Notes

Handoff checklist for deploying the AI Communication Skills Trainer after the
security + scoring changes. `.env` is gitignored, so environment values must be set
per environment — they do NOT come from the repo.

## 1. Pull latest `main`
Includes: JWT startup guard, AI HTTP timeouts, server-side speaking score,
true-score display, improved/declined feedback, full-page Microsoft redirect login.

## 2. Environment variables (set in each environment's `.env`)

| Variable | Required | Notes |
|---|---|---|
| `APP_JWT_SECRET` | **YES** | Long random string, **>= 32 chars**, must NOT contain `change-me`. **The backend refuses to start otherwise.** |
| `OPENAI_AUDIO_MODEL` | for audio scoring | Use `gpt-audio-mini` (or `gpt-audio`). The old `gpt-4o-audio-preview` is retired and returns 404 → Speaking silently falls back to transcript. |
| `OPENAI_API_KEY` | optional | If empty, a deterministic mock evaluator is used. |
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` (+ `VITE_` copies) | **YES** | Microsoft login. |
| `VITE_AZURE_REDIRECT_URI` | not used | The app now redirects to its own origin (`window.location.origin`) automatically — no build-time value needed. Just register the origin in Azure (see below). |
| `APP_CORS_ORIGINS` | **YES** | Must include the deployed frontend URL. |

## 3. Azure app registration (login is now a full-page redirect)
- Register the deployed URL as a **Single-Page Application (SPA)** redirect URI —
  e.g. `https://aicommunication.cftools.live` (exact, no trailing slash).
- Keep `http://localhost:5174` registered too for local dev.
- The frontend redirects to its **own origin** at runtime, so each origin the app is
  served from must be a registered SPA redirect URI. No build-time redirect variable.
- Redirect flow (not popup) is used; `navigateToLoginRequestUrl` is `false`.

## 4. Build & run
```bash
docker compose up --build -d
```

## 5. Smoke test
- Backend starts (fails fast if `APP_JWT_SECRET` is weak — that's expected).
- Sign in with Microsoft (full-page redirect) lands on the dashboard/manager view.
- A Speaking attempt scores without 404s in backend logs (audio model reachable).
