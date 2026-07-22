# Architectural Decisions

Log of decisions and their rationale. Add an entry (dated, absolute) for any structural change, new
dependency, schema change, boundary exception, or naming/collision resolution.

## 2026-07-22 — gstack integration & command-name collision resolution
- Adopted **gstack** as the shared AI toolkit (global install at `~/.claude/skills/gstack`, not
  vendored). `.claude/` holds only project-specific guidance.
- The scaffold's generic `review` command was named **`team-review`** to avoid colliding with
  gstack's reserved `/review`. All references updated.
- `deploy` was **kept** (not removed) because the project has unique deploy logic — Docker Compose
  build/run + project-specific pre/post checks — that gstack's generic `/land-and-deploy` doesn't
  know. It wraps those steps and defers orchestration to gstack.
- **No pre-existing `.claude/commands` or `.claude/skills`** existed in the repo, so there were no
  other collisions to rename.

## Pre-existing project decisions (captured from repo/README/ARCHITECTURE)

### Auth: Azure ID token → application JWT (not resource-server)
- The SPA uses MSAL (auth-code + PKCE); the backend **validates the Microsoft ID token** via
  `AzureTokenVerifier` (lazy JWKS decoder) and issues its own HS256 app JWT.
- **Why:** keeps the backend stateless and lets it boot without a network round-trip to Azure at
  startup. `spring.security.oauth2.resourceserver` is deliberately **not** configured.
- **No client secret** is used (SPA validates-only flow) — correct for this design.

### Stateless API, CSRF disabled
- No cookies/session; CSRF protection disabled by design. Do not reintroduce session state.

### AI with deterministic mock fallback
- Speaking/Writing scoring calls OpenAI (JSON mode) when `OPENAI_API_KEY` is set; on **any** error it
  falls back to `MockAiEvaluator`. **Why:** the app must work end-to-end offline and never break on an
  AI outage. This is a Critical Constraint.

### Consolidated schema (20 spec tables → pragmatic model)
- Per-section detail tables were consolidated into `section_result` with a JSON `details` payload.
- **Why:** keeps the data model maintainable. (Spec→implementation mapping in README §7.)

### Seed data via idempotent `data.sql`
- Runs after Hibernate schema creation (`defer-datasource-initialization: true`,
  `spring.sql.init.mode: always`); each block inserts only when its table is empty.
- **Why:** safe to run on every boot; seeds departments/teams/managers/employees + content banks.

### Frontend port 5174 in Docker vs 5173 in dev  — watch-out
- Docker Compose maps the frontend to host **:5174** (→ nginx :80); `npm run dev` uses **:5173**.
- Keep `APP_CORS_ORIGINS` and `VITE_AZURE_REDIRECT_URI` consistent with whichever is served. The
  local `.env` sets `APP_CORS_ORIGINS=http://localhost:5174` (Docker), README quick-start references
  5173 (dev). Not a bug, but a frequent source of CORS/redirect confusion.

### Dev-login bypass behind a flag
- `APP_DEV_LOGIN_ENABLED` / `VITE_DEV_LOGIN` expose passwordless sign-in for seeded users; the
  endpoint only exists when enabled. **Must be `false`** outside local dev (security-critical).
