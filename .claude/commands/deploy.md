---
description: Project-specific Docker Compose deploy for the AI Comm Trainer (wraps gstack /land-and-deploy)
---

# /deploy — build & run the AI Comm Trainer stack

> gstack's `/land-and-deploy` orchestrates land+deploy generically. This command captures the
> **project-specific** container steps and pre/post checks unique to this repo. Use gstack `/ship`
> to open the PR and `/land-and-deploy` for the merge→deploy orchestration; use this for the actual
> Docker Compose build/run and verification.

## Pre-deploy checks (do these first)
- [ ] `.env` exists and is filled: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` (+ `VITE_` copies) set.
- [ ] `APP_DEV_LOGIN_ENABLED=false` **and** `VITE_DEV_LOGIN=false`.
- [ ] `APP_JWT_SECRET` is a real long random value (not `change-me-...`).
- [ ] `APP_CORS_ORIGINS` matches the frontend origin actually served.
- [ ] `.env` is NOT staged for commit (`git status`).

## Build & run

```bash
cp .env.example .env   # first time only, then fill in values
docker compose up --build -d
docker compose ps
docker compose logs -f backend   # watch for "Started TrainerApplication"
```

Service map (host ports): **frontend :5174** → nginx :80 · **backend :8080** · **db :5432**.

## Post-deploy verification
- [ ] Backend health: `curl -f http://localhost:8080/actuator/health` (or Swagger loads at `/swagger-ui.html`).
- [ ] Frontend loads at http://localhost:5174 and shows the Microsoft sign-in.
- [ ] Sign in with a real Microsoft account → lands on the correct role dashboard.
- [ ] Smoke one assessment section end-to-end (start → submit → score renders).
- [ ] Seed data present (managers + employees) without duplicates (idempotent `data.sql`).

## Rollback / teardown

```bash
docker compose down            # stop (keeps the pgdata volume)
docker compose down -v         # DANGER: also drops the database volume
```

> Note the port mismatch to watch for: Docker serves the frontend on **:5174**, while
> `npm run dev` uses **:5173**. Keep `APP_CORS_ORIGINS` / `VITE_AZURE_REDIRECT_URI` consistent
> with whichever you're serving.
