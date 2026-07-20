# AI Communication Skills Trainer — CloudFuze

An internal web application that helps managers evaluate and improve employees'
communication skills through AI-powered **Listening**, **Speaking**, and **Writing**
assessments.

- **Frontend:** React 19 + Vite + Material UI + React Router + Axios + Chart.js
- **Backend:** Spring Boot 3 + Java 21 + Spring Security + Spring Data JPA
- **Database:** PostgreSQL
- **Auth:** Microsoft Azure AD (OAuth 2.0 / OIDC) → application JWT
- **AI:** OpenAI (with deterministic mock fallback when no API key is configured)
- **Docs:** Swagger / OpenAPI 3
- **Deploy:** Docker + Docker Compose

---

## 1. Quick start (Docker Compose)

```bash
cp .env.example .env
# Fill in the Azure AD values (see section 3). OPENAI_API_KEY is optional.
docker compose up --build
```

| Service   | URL                                   |
|-----------|---------------------------------------|
| Frontend  | http://localhost:5173                 |
| Backend   | http://localhost:8080                 |
| Swagger   | http://localhost:8080/swagger-ui.html |
| Postgres  | localhost:5432 (`trainer` / `trainer`)|

On first boot the backend runs Flyway-style seed data (`data.sql`) that creates
sample departments, teams, a manager, employees, and the Listening/Speaking/Writing
content banks.

## 2. Local development (without Docker)

**Backend** (requires JDK 21 + Maven 3.9+)
```bash
cd backend
mvn spring-boot:run             # http://localhost:8080
```

**Frontend**
```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Requires a local PostgreSQL matching `application.yml`, or point
`SPRING_DATASOURCE_URL` at your instance.

## 3. Azure AD configuration (required)

Authentication is Microsoft-only. Register an app in **Azure Portal → App registrations**:

1. Redirect URI (SPA): `http://localhost:5173`
2. Expose an API / use the default `openid profile email` scopes.
3. Copy the **Tenant ID** and **Client ID**.

Set these values in `.env`:

```
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
VITE_AZURE_TENANT_ID=<your-tenant-id>
VITE_AZURE_CLIENT_ID=<your-client-id>
VITE_AZURE_REDIRECT_URI=http://localhost:5173
```

Flow: the SPA signs in with MSAL, sends the Microsoft **ID token** to
`POST /api/auth/login`. The backend validates it against Azure AD's JWKS, provisions
the user (name, email, employee id, department, team, role, manager), and returns an
**application JWT** used for all subsequent API calls.

## 3a. Running before Azure is configured (DEV login bypass)

To exercise the app without a Microsoft tenant, enable the **dev-login bypass** (already
set in the generated `.env`):

```
APP_DEV_LOGIN_ENABLED=true    # backend: exposes /api/auth/dev-login
VITE_DEV_LOGIN=true           # frontend: shows quick sign-in buttons
```

The login page then shows a **DEV MODE** panel with one-click sign-in for every seeded
user (both managers and all employees). This issues a normal application JWT without
Microsoft — no Azure values required.

> ⚠️ **Turn both flags off** (`false`) once Azure AD is configured. The bypass endpoint
> is only registered when `app.dev-login.enabled=true`, so with it off there is no bypass
> at all.

## 4. AI scoring

- If `OPENAI_API_KEY` is set, Speaking and Writing scoring calls OpenAI.
- If not set, a deterministic **mock evaluator** returns structured scores and
  feedback so the whole app works end-to-end offline. See
  `service/ai/OpenAiClient.java` and `MockAiEvaluator.java`.

## 5. Project layout

```
ai-comm-trainer/
├── backend/     Spring Boot 3 (controller/service/repository/entity/dto/security/config/exception/mapper/util)
├── frontend/    React 19 + Vite (components/pages/layouts/hooks/services/utils/contexts)
├── docker-compose.yml
└── .env.example
```

## 6. Roles

- **Employee** — sees only their own dashboard, assessments, history, AI feedback.
- **Manager** — sees a table of their team's employees + a per-employee detail page
  with full breakdowns and a downloadable PDF report.

## 7. Database tables (spec mapping)

The 20 conceptual tables in the spec are implemented with a pragmatic, normalized
schema. Some per-section detail tables are consolidated into `section_result`
(with a JSON `details` payload) to keep the model maintainable:

| Spec table(s) | Implementation |
|---|---|
| users, roles | `users` (+ `role` enum), `department`, `team` |
| departments, teams | `department`, `team` |
| assessments, assessment_sessions, scores | `assessment_session` (holds section + overall scores) |
| listening_tests/questions/answers, audio_files | `listening_question` (bank) + `section_result` (details) |
| speaking_tests/questions, speech_results | `speaking_sentence` (bank) + `section_result` |
| writing_tests/questions/answers | `writing_prompt` (bank) + `section_result` |
| manager_comments | `manager_comment` |
| notifications | `notification` |
| audit_logs | `audit_log` |

See `docs/ARCHITECTURE.md` for details.

## 8. Status

This is the **runnable foundation** delivered per the build plan: complete structure,
all three modules wired end-to-end, Docker, seed data, and Swagger. AI prompt
tuning and some edge behaviors use solid defaults intended to be refined iteratively.
