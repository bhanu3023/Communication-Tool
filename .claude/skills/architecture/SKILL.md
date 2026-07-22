---
name: architecture
description: The AI Comm Trainer's architecture — layered Spring backend, Azure→app-JWT auth flow, the AI facade with mock fallback, and React module boundaries. Use to place new code correctly or answer "how is this built" without scanning the whole repo.
---

# Architecture — AI Comm Trainer

> Read this (and `.claude/memory/architecture.md`) instead of scanning source when you need to
> understand or extend the system. Boundaries are enforced by `.claude/rules/architecture-boundaries.md`.

## Big picture

React SPA (MSAL) → Microsoft **ID token** → `POST /api/auth/login` → backend validates against Azure
**JWKS** (audience = client id) → issues an **application JWT** (HS256) → SPA sends
`Authorization: Bearer <jwt>` → `JwtAuthenticationFilter` authenticates every request. Stateless
(no session/cookies; CSRF disabled by design). Persistence via Spring Data JPA → PostgreSQL.

## Backend layers (one direction)

`controller → service (+ service.ai) → repository → entity`, with supporting `dto`, `security`,
`config`, `exception`, `mapper`, `util`, `domain`.

- **Controllers**: REST + validation only; never touch repositories/entities.
- **Services**: all business logic; only callers of repositories.
- **`service.ai`**: `AiService` facade over `OpenAiClient` (JSON-mode chat) with a deterministic
  `MockAiEvaluator` fallback. **Any OpenAI error → mock result; the app never breaks.** OpenAI types
  stay inside this package. Optional `AzureSpeechService` for real pronunciation scoring.
- **entity/repository/dto/domain**: JPA entities, Spring Data repos, per-module DTO records, enums.

## Assessment modules

Three parallel modules — **Listening / Speaking / Writing** — each with a controller
(`/api/{listening,speaking,writing}`), a service, a content bank entity
(`ListeningQuestion`+`ListeningStory` / `SpeakingSentence` / `WritingPrompt`), and shared
`AssessmentSession` + `SectionResult` (with a JSON `details` payload). `ProctorController` records
`ProctorEvent`s; `ManagerController` exposes team views + PDF (`PdfService`).

## Frontend structure

`pages/{employee,assessment,manager}` compose `components/`, `hooks/` (timers, audio recorder,
speech), `contexts/` (`AuthContext`, `ToastContext`), and `services/` wrappers over the single axios
instance `services/api.js`. Routes guarded by `ProtectedRoute`. Two timers per section via
`useCountdown` (overall 10 min + per-question).

## When extending
- New module/assessment type → follow the module template in `architecture-boundaries.md`.
- Anything crossing a boundary (or new package/dependency) → escalate to the `architect` agent and
  record it in `.claude/memory/decisions.md`.
