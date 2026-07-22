# Progress

Snapshot of what's built, what's missing, and known watch-outs. Update when status changes (dated,
absolute).

## Done (as of 2026-07-22)
- Full layered backend (Spring Boot 3 / Java 21): auth (Azure→app JWT), all three assessment modules,
  sessions/scoring, attempts, proctoring, manager reporting + PDF, dashboards, audit log.
- AI facade with OpenAI JSON-mode scoring + deterministic `MockAiEvaluator` fallback; optional Azure
  Speech pronunciation scoring.
- React 19 + Vite frontend: MSAL login, role-guarded routing, employee/assessment/manager pages,
  timers, audio recorder, exam-mode/proctoring, intro videos.
- PostgreSQL schema (Hibernate `ddl-auto: update`) + idempotent `data.sql` seed. Swagger. Docker
  Compose for all three services.
- Recent commits: 75 pass mark per section w/ pass/fail; non-fast-forward intro videos; seeded
  managers/employees; full-page Microsoft redirect sign-in; Abhinav set to employee.

## Not done / known limitations
- **No automated tests yet** — `backend/src/test` does not exist; no frontend test setup. Test deps
  are present in `pom.xml`. First tests should target the deterministic scoring core + AI mock
  fallback + role isolation (see `.claude/rules/testing-standard.md`, `testing-patterns` skill).
- **No CI/CD pipeline** in the repo (no `.github/workflows`). Deployment is manual Docker Compose
  (`/deploy` command).
- AI prompt tuning and some edge behaviors use solid defaults intended to be refined iteratively.
- Frontend port mismatch to keep straight: Docker **:5174** vs Vite dev **:5173** (see [[decisions]]).

## Watch-outs / recurring gotchas
- Keep `APP_DEV_LOGIN_ENABLED` / `VITE_DEV_LOGIN` = `false` outside local dev.
- Never commit `.env` (real Azure/OpenAI/JWT values live there only); `.env.example` is placeholders.
- Preserve the AI mock-fallback contract and the one-directional layering on every change.
- Keep `data.sql` idempotent.

## Suggested next steps
1. Add the first backend test slice (scoring math + `MockAiEvaluator` + a security/role test).
2. Add a minimal CI (build + `mvn test` + `npm run build`).
3. Reconcile the 5173/5174 port story across README, `.env.example`, and compose.
