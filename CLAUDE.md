# AI Communication Skills Trainer — CloudFuze

An internal web app that lets **managers evaluate and improve their employees'
communication skills** through AI-scored **Listening**, **Speaking**, and **Writing**
assessments. Employees take timed, proctored assessments; the backend scores them (OpenAI
with a deterministic mock fallback) and managers review team results and download PDF reports.
Microsoft Azure AD is the only sign-in method; a short-lived application JWT authorizes all API calls.

> **This file is the entry point.** Read it first, then the memory files in `.claude/memory/`,
> then the relevant `.claude/rules/*.md` — before scanning source. Treat `.claude/` as the
> project's source of truth for **project-specific** guidance, and `~/.claude/skills/gstack/`
> as the shared toolkit for **generic** workflows (review, QA, ship, deploy).

---

## Prerequisites — Install gstack once on your machine

This project uses **gstack** for AI-assisted development (code review, QA, security audits, docs, deployment). Every contributor must install gstack **once** on their own machine before using Claude Code on this repo.

**Requirements:** Claude Code, Git, Node.js 18+ ([nodejs.org](https://nodejs.org) LTS). Bun is installed automatically by gstack's setup.

**Windows users:** you must use **Git Bash** (comes with Git for Windows). PowerShell and CMD will NOT work.

### Fastest install — paste this to Claude Code

Open Claude Code (from anywhere on your machine) and paste this exact message:

> Install gstack: run `git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup` then confirm the skills are available by listing `~/.claude/skills/`.

Claude will clone the repo, run setup, and verify. Takes ~60 seconds.

### Manual install

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack
./setup
```

### Verify it works

Reopen this project in Claude Code and type `/office-hours` — if Claude responds with the office-hours flow, gstack is working.

### Update gstack later

Inside any Claude Code session, run `/gstack-upgrade`.

### Troubleshooting

| Problem | Fix |
|---|---|
| `/office-hours` not recognized | `cd ~/.claude/skills/gstack && ./setup` |
| Windows: `bad interpreter: /bin/bash^M` | `cd ~/.claude/skills/gstack && git config core.autocrlf false && git config core.eol lf && git rm --cached -r . && git reset --hard HEAD && ./setup` |
| `/browse` fails | `cd ~/.claude/skills/gstack && bun install && bun run build` |

---

## Tech Stack

- **Frontend:** React 19 + Vite 5 + Material UI 6 + React Router 6 + Axios + Chart.js; MSAL (`@azure/msal-browser`/`-react`) for Azure sign-in.
- **Backend:** Spring Boot 3.3 + Java 21 + Spring Security + Spring Data JPA; JJWT 0.12 (app JWT), springdoc-openapi (Swagger), openhtmltopdf (PDF), Lombok. Maven build. Base package `com.cloudfuze.trainer`.
- **Database:** PostgreSQL 16. Hibernate `ddl-auto: update` + idempotent `data.sql` seed.
- **Auth:** Azure AD (OIDC) ID token → validated backend-side → application JWT (HS256), stateless.
- **AI:** OpenAI JSON-mode chat completions with a deterministic `MockAiEvaluator` fallback; optional Azure AI Speech for real pronunciation scoring.
- **Deploy:** Docker + Docker Compose (Postgres, Spring Boot backend, nginx-served frontend).

## Architecture Summary

Browser (React SPA) signs in with MSAL → sends Microsoft ID token to `POST /api/auth/login`
→ backend `AzureTokenVerifier` validates against Azure JWKS → `AuthService` provisions the
user and issues an app JWT → SPA sends `Authorization: Bearer <jwt>` on every call →
`JwtAuthenticationFilter` populates the `SecurityContext`. Backend is strictly layered:
`controller → service (+ service.ai) → repository → entity`, with `dto`, `security`, `config`,
`exception`, `mapper`, `util`, `domain` supporting packages. See `.claude/memory/architecture.md`.

## Critical Constraints

- **Microsoft login only.** No passwords. The dev-login bypass (`APP_DEV_LOGIN_ENABLED` / `VITE_DEV_LOGIN`) must stay **`false`** outside local dev.
- **Stateless API.** No cookies/session; CSRF is intentionally disabled. Never introduce session state.
- **AI must never break the app.** Every OpenAI call falls back to `MockAiEvaluator` on any error. Preserve that contract.
- **Role isolation.** Employees see only their own data; managers see only their direct reports. `/api/manager/**` requires `ROLE_MANAGER`.
- **Secrets live only in `.env`** (gitignored). Never commit real Azure/OpenAI/JWT values. See `.claude/rules/security-rules.md`.
- **Seed data is idempotent.** `data.sql` must only insert when a table is empty — safe on every boot.

## Repository Navigation

| Path | What lives here |
|---|---|
| `backend/src/main/java/com/cloudfuze/trainer/controller` | REST endpoints (`/api/**`), Swagger tags |
| `.../service` + `.../service/ai` | Business logic; AI facade (`OpenAiClient` + `MockAiEvaluator`) |
| `.../repository` `.../entity` `.../dto` | JPA repos, entities, per-module DTO record groups |
| `.../security` `.../config` `.../exception` | Azure/JWT auth, security/CORS/OpenAPI config, error handling |
| `backend/src/main/resources` | `application.yml`, `data.sql` (seed) |
| `frontend/src/pages/{employee,assessment,manager}` | Role-scoped screens |
| `frontend/src/{services,contexts,hooks,components}` | axios API layer, Auth/Toast contexts, timers/recorder hooks, UI |
| `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` | Container build & orchestration |
| `docs/ARCHITECTURE.md` | Long-form architecture notes |

## Memory Files

- [`.claude/memory/project-context.md`](.claude/memory/project-context.md) — business purpose, users, scope, status
- [`.claude/memory/architecture.md`](.claude/memory/architecture.md) — auth flow, layers, scoring, timers
- [`.claude/memory/decisions.md`](.claude/memory/decisions.md) — architectural decisions & rationale
- [`.claude/memory/domain-knowledge.md`](.claude/memory/domain-knowledge.md) — assessment/scoring domain concepts
- [`.claude/memory/repository-map.md`](.claude/memory/repository-map.md) — file-level map & entry points
- [`.claude/memory/progress.md`](.claude/memory/progress.md) — what's done, known limitations, TODOs

## Environment Variables

Copy `.env.example` → `.env` and fill in values. Key vars (full list in `.env.example`):
`AZURE_TENANT_ID`, `AZURE_CLIENT_ID` (+ `VITE_` copies) — **required**; `APP_JWT_SECRET`,
`APP_JWT_EXPIRATION_MINUTES`, `APP_CORS_ORIGINS`; `OPENAI_API_KEY` (+ `OPENAI_MODEL`,
`OPENAI_AUDIO_MODEL`) — optional (mock fallback); `AZURE_SPEECH_KEY`/`_REGION` — optional;
`APP_DEV_LOGIN_ENABLED`/`VITE_DEV_LOGIN` — keep `false` outside dev.

## Common Commands

```bash
# Full stack (Docker):  Frontend :5174 · Backend :8080 · Swagger /swagger-ui.html · DB :5432
cp .env.example .env && docker compose up --build

# Backend (JDK 21 + Maven)
cd backend && mvn spring-boot:run          # http://localhost:8080
cd backend && mvn test                     # (no tests yet — see .claude/rules/testing-standard.md)

# Frontend (Node 18+)
cd frontend && npm install && npm run dev   # http://localhost:5173
cd frontend && npm run build
```

---

## Available gstack Commands

gstack is installed globally at `~/.claude/skills/gstack`. Use `/browse` from gstack for all web browsing; never use `mcp__claude-in-chrome__*` tools.

- **Planning:** `/office-hours`, `/autoplan`, `/spec`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`
- **Review & investigate:** `/review`, `/investigate`, `/codex`
- **Testing:** `/qa <url>`, `/qa-only <url>`, `/browse`, `/open-gstack-browser`
- **Security & docs:** `/cso`, `/document-release`, `/document-generate`
- **Ship & deploy:** `/ship`, `/land-and-deploy`, `/canary`
- **Safety:** `/careful`, `/freeze`, `/guard`, `/unfreeze`
- **Learn & upgrade:** `/learn`, `/gstack-upgrade`

Project-specific slash commands (in `.claude/commands/`, do **not** collide with gstack):
`/team-review`, `/deploy`, `/scaffold`, `/feature`, `/bugfix`.

## Recommended Workflow

- **New feature:** `/office-hours` → `/autoplan` → implement → `/review` → `/qa` → `/cso` → `/ship`
- **Routine change:** implement → `/review` → `/qa` → `/ship`
- **Bug fix:** `/investigate` → fix → `/review` → `/qa` → `/ship`

**Before every PR (never skip):**
1. `/review` — bugs CI won't catch
2. `/qa <staging-url>` — real browser test
3. `/cso` — security audit (if security-sensitive)
4. `/ship` — opens PR

---

## Pre-flight — gstack availability check

Before offering the Skill routing menu OR running any gstack slash command, Claude MUST first verify gstack is installed:

```bash
test -f ~/.claude/skills/gstack/setup && echo "gstack_installed" || echo "gstack_missing"
```

- `gstack_installed` → show **Menu A** below
- `gstack_missing` → show **Menu B** below

Install command (used when the user chooses "Install gstack now"):

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup
```

After install, tell the user: "✅ gstack installed. Reopen this project in Claude Code so the new skills are discovered. Then re-ask your original question."

If install fails, report the error, suggest the manual install, and fall back to the normal project approach.

## Skill routing

Before any repository task, Claude must run the Pre-flight check and show the correct menu.

### Menu A — gstack IS installed

"Before I start, choose one:
1. Use gstack workflow
2. Use normal project files / plain Claude approach
3. Let Claude recommend the best option first"

### Menu B — gstack is NOT installed

"gstack is not installed on your machine. Before I start, choose one:
1. Install gstack now (~60 seconds), then use gstack workflow
2. Use normal project files / plain Claude approach (no gstack workflows available)
3. Let Claude recommend the best option first"

The install option MUST appear on every question until gstack is installed — not just the first time.

**Slash command exception:** if the user types a gstack slash command (`/review`, `/qa`, `/cso`, `/ship`, `/office-hours`, etc.) directly, run the Pre-flight check first. If installed, run the command directly. If not, show Menu B.

Claude must wait for the user's selection before reading files, editing files, or invoking any skill.

### Option 1 (Menu A) — Use gstack workflow

Mappings:
- Product brainstorm / feature ideas → `/office-hours`
- Rough idea to spec → `/spec`
- Scope tradeoffs → `/plan-ceo-review`
- New-feature architecture → `/plan-eng-review`
- Bugs / unexpected errors → `/investigate`
- Test a URL → `/qa` or `/qa-only`
- Diff review before land → `/review`
- Security-sensitive change → `/cso`
- Open a PR → `/ship`
- Deploy / verify prod → `/land-and-deploy`
- Docs update → `/document-release`
- Docs generation → `/document-generate`

### Option 1 (Menu B) — Install gstack now

Run the install command. On success, tell the user to reopen the project. On failure, fall back to Option 2.

### Option 2 — Use normal project files / plain Claude approach

Reading files, explaining code, small edits, typo fixes, one-file updates, basic refactoring, config changes, project Q&A, checking implementation details.

### Option 3 — Let Claude recommend

If gstack installed → recommend between gstack workflow and normal approach. If gstack missing → recommend between installing gstack (for tasks that need it) or normal approach (for small tasks).
