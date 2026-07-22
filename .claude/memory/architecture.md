# Architecture (project memory)

Mirror of the structural facts (long-form in `docs/ARCHITECTURE.md`; boundaries enforced by
`.claude/rules/architecture-boundaries.md`). Read this before scanning source.

## Request & auth flow
1. React SPA signs in with **MSAL** → receives a Microsoft **ID token**.
2. SPA calls `POST /api/auth/login { idToken }`.
3. `AzureTokenVerifier` validates the token against the tenant's **JWKS** and checks
   **audience == configured client id**.
4. `AuthService` provisions/updates the `users` row and issues an **application JWT** (HS256,
   `JwtService`) containing `uid`, `email`, `role`, `name`.
5. SPA stores it and sends `Authorization: Bearer <jwt>` on every call; `JwtAuthenticationFilter`
   authenticates and sets an `AppPrincipal` with `ROLE_EMPLOYEE` / `ROLE_MANAGER`.
6. **Stateless** (no cookies/session) → CSRF disabled by design. SQLi prevented by JPA binding; all
   input validated (Jakarta); sensitive actions written to `audit_log`.

## Backend layers (`com.cloudfuze.trainer`)
`controller → service (+ service.ai) → repository → entity`; supporting `dto`, `security`, `config`,
`exception`, `mapper`, `util`, `domain`.
- **service.ai**: `AiService` facade over `OpenAiClient` (JSON-mode chat) with deterministic
  `MockAiEvaluator` fallback — **any OpenAI error falls back to mock; the app never breaks**. Optional
  `AzureSpeechService` for real pronunciation scoring.

## Modules
Three assessment modules (Listening / Speaking / Writing), each: controller `/api/<module>` →
`<Module>Service` → content-bank entity (`ListeningQuestion`+`ListeningStory` / `SpeakingSentence` /
`WritingPrompt`) + shared `AssessmentSession` & `SectionResult` (JSON `details`). Plus `ProctorController`
(`ProctorEvent`), `ManagerController`/`ManagerService` (team + PDF via `PdfService`), `DashboardService`,
`AttemptService`/`AttemptPolicy`/`SectionAttemptControl`.

## Scoring (see [[domain-knowledge]])
- Listening: MCQ, 10/correct (max 100), deterministic AI summary.
- Speaking: weighted rubric pron 30 / acc 25 / flu 20 / gram 10 / vocab 10 / conf 5; section = average.
- Writing: 10-dimension rubric average + mistakes/suggestions/improved version.
- Weak area = lowest section; **pass mark = 75** per section (pass/fail status). NB: README says
  "overall = mean of sections" but the code does not compute a numeric combined score — sections are
  independent by design (see [[domain-knowledge]] / [[decisions]]). Doc/code discrepancy to resolve.

## Timers
Per section, two `useCountdown` timers: **overall 10 min** (toast at 5m/1m/10s, auto-submit at 0) and
**per-question** (60s listening / 30s speaking / 5m writing, auto-advance + `resetKey`).

## Persistence & config
PostgreSQL 16; Hibernate `ddl-auto: update`; `defer-datasource-initialization: true` runs
**idempotent** `data.sql` after schema creation. Azure resource-server is intentionally NOT configured
in `application.yml` — tokens are verified lazily by `AzureTokenVerifier`.

## Frontend
`pages/{employee,assessment,manager}` → `components/`, `hooks/`, `contexts/` (`AuthContext`,
`ToastContext`), `services/` over single axios instance `services/api.js` (Bearer token + 401 →
`/login`). Routes guarded by `ProtectedRoute`. MUI + `theme.js`. MSAL config in `authConfig.js`.

## Deploy topology
Docker Compose: `db` (postgres:16) · `backend` (Spring Boot, :8080) · `frontend` (nginx, host **:5174**
→ :80). See [[decisions]] for the 5173/5174 port note.
