# Workflow: Deployment

Ship and deploy the AI Comm Trainer. gstack orchestrates land+deploy; the `/deploy` command holds the
project-specific Docker Compose steps.

> Pre-flight gstack check first (`CLAUDE.md`).

## 1. Pre-merge (the PR gate — never skip)
1. `/review` → `/team-review` — code review (generic + project conventions).
2. `/qa <staging-url>` — real browser test of the affected flow.
3. `/cso` — security audit if the change is security-sensitive.
4. `/ship` — open the PR (`.claude/rules/pr-standard.md`).

## 2. Land & deploy
- **`/land-and-deploy`** (gstack) — orchestrates merge → deploy → verify.
- **`/deploy`** (project) — the concrete Docker Compose build/run for this repo:
  ```bash
  docker compose up --build -d
  docker compose ps && docker compose logs -f backend
  ```
  Service map: frontend **:5174** · backend **:8080** · db **:5432**.

## 3. Pre-deploy checklist (project-specific)
- [ ] `.env` complete: `AZURE_TENANT_ID`/`AZURE_CLIENT_ID` (+ `VITE_` copies).
- [ ] `APP_DEV_LOGIN_ENABLED=false` **and** `VITE_DEV_LOGIN=false`.
- [ ] `APP_JWT_SECRET` is a real long random value (not `change-me-...`).
- [ ] `APP_CORS_ORIGINS` / `VITE_AZURE_REDIRECT_URI` match the served frontend origin
      (mind 5174 Docker vs 5173 dev — see [[decisions]]).
- [ ] `.env` not staged for commit.

## 4. Post-deploy verification
- [ ] `curl -f http://localhost:8080/actuator/health` (or Swagger loads).
- [ ] Frontend loads at :5174; Microsoft sign-in works → correct role dashboard.
- [ ] One assessment section smoke-tested end-to-end (start → submit → score).
- [ ] Seed data present without duplicates (idempotent `data.sql`).

## 5. Rollback
```bash
docker compose down       # stop (keep DB volume)
docker compose down -v    # DANGER: also drops the database
```

> No CI/CD pipeline exists in-repo yet (`.claude/memory/progress.md`) — deployment is manual Docker
> Compose. Adding CI (build + `mvn test` + `npm run build`) is a suggested next step.
