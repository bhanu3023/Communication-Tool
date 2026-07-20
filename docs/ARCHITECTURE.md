# Architecture

## Overview

```
┌─────────────┐      Microsoft ID token       ┌──────────────┐
│   Browser   │ ───────────────────────────▶  │  Azure AD    │
│ (React SPA) │ ◀───────────────────────────  │  (OIDC)      │
└─────┬───────┘        ID token                └──────────────┘
      │  POST /api/auth/login { idToken }
      ▼
┌─────────────────────────────┐   verify JWKS    ┌──────────────┐
│  Spring Boot backend        │ ───────────────▶ │  Azure JWKS  │
│  - verify Azure ID token    │                  └──────────────┘
│  - provision user           │
│  - issue application JWT     │      OpenAI (optional)
│  - assessment + scoring     │ ───────────────▶ api.openai.com
└─────┬───────────────────────┘
      │ JPA
      ▼
┌─────────────┐
│ PostgreSQL  │
└─────────────┘
```

## Authentication flow

1. The SPA signs in with **MSAL** (`loginPopup`) and receives a Microsoft **ID token**.
2. It calls `POST /api/auth/login` with the ID token.
3. The backend (`AzureTokenVerifier`) validates the token against the tenant's JWKS
   endpoint and checks the audience equals the configured client id.
4. `AuthService` provisions or updates the `users` row and issues an **application JWT**
   (`JwtService`, HS256) containing `uid`, `email`, `role`, `name`.
5. The SPA stores the app JWT and sends it as `Authorization: Bearer <jwt>` on every call.
6. `JwtAuthenticationFilter` validates it and populates the `SecurityContext` with an
   `AppPrincipal` and a `ROLE_EMPLOYEE`/`ROLE_MANAGER` authority.

Because the API is **stateless** (no cookies/session), CSRF protection is disabled by
design; SQL injection is prevented by JPA parameter binding; all inputs are validated
with Jakarta Validation; and security-relevant actions are written to `audit_log`.

## Layers (backend)

| Package | Responsibility |
|---|---|
| `controller` | REST endpoints, request validation, HTTP concerns |
| `service` | Business logic (sessions, scoring, dashboards, PDF) |
| `service.ai` | AI facade: `OpenAiClient` + deterministic `MockAiEvaluator` fallback |
| `repository` | Spring Data JPA repositories |
| `entity` | JPA entities |
| `dto` | Request/response records (grouped per module) |
| `security` | Azure verification, JWT, filter, current-user |
| `config` | Security, CORS, OpenAPI |
| `exception` | `ApiException` hierarchy + `@RestControllerAdvice` |
| `mapper` / `util` | Entity→DTO mapping, JSON helper |

## Scoring

- **Listening** — objective MCQ. 10 marks per correct answer (max 100). AI summary
  (attention / accuracy / consistency) is deterministic.
- **Speaking** — per sentence, weighted rubric: pronunciation 30%, accuracy 25%,
  fluency 20%, grammar 10%, vocabulary 10%, confidence 5%. Section score is the average.
- **Writing** — 10-dimension rubric (grammar, clarity, vocabulary, tone, professionalism,
  structure, readability, completeness, spelling, conciseness) plus mistakes, suggestions,
  and an improved version. Section score is the dimension average.

When `OPENAI_API_KEY` is set, Speaking and Writing scoring is delegated to OpenAI
(JSON-mode chat completion); on any error it falls back to the mock evaluator so the app
never breaks. A session's **overall score** is the mean of the three sections, and the
**weak area** is the lowest-scoring section.

## Frontend structure

```
src/
├── authConfig.js         MSAL configuration
├── contexts/             AuthContext, ToastContext
├── services/             axios instance + API wrappers
├── hooks/                useCountdown, useSpeechSynthesis, useSpeechRecognition
├── components/           CircularTimer, ScoreGauge, FeedbackPanel, timers, guards
├── layouts/              AppLayout (brand bar + role chip + logout)
└── pages/
    ├── Login.jsx
    ├── employee/Dashboard.jsx
    ├── assessment/{AssessmentHub,Listening,Speaking,Writing}.jsx
    └── manager/{ManagerDashboard,EmployeeDetail}.jsx
```

## Timers

Every assessment section runs two `useCountdown` timers:

- **Overall** (10 min) — emits toast warnings at 5 min, 1 min, and 10 s; auto-submits at 0.
- **Per-question** (60 s listening / 30 s speaking / 5 min writing) — auto-advances at 0
  and resets on each question via `resetKey`.

## Seed data

`backend/src/main/resources/data.sql` runs after Hibernate creates the schema
(`defer-datasource-initialization: true`). It is idempotent — each block inserts only
when its table is empty — so it is safe on every boot. It seeds:
- 4 departments, 5 teams
- 2 managers (`Abhishek.Sakala@cloudfuze.com`, `alex@filefuze.co`) + 6 employees (3 reports each)
- 14 listening questions, 10 writing prompts, 100+ speaking sentences
