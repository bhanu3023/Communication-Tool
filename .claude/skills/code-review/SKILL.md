---
name: code-review
description: This project's code-review conventions for the AI Comm Trainer — the naming, layering, DTO, and auth patterns gstack's generic /review doesn't know. Use alongside gstack /review, not instead of it.
---

# Code review — AI Comm Trainer conventions

> gstack `/review` handles generic bugs and quality. This skill teaches Claude **what's specific to
> this repo** so a review catches convention violations gstack can't see. Pair with the
> `/team-review` command checklist.

## What to check that is unique to this codebase

**Backend layering** — the one-directional contract (`controller → service → repository → entity`):
- Controllers must be thin and never call a repository/entity. Repositories are called only by
  services. (Full rules: `.claude/rules/architecture-boundaries.md`.)
- AI usage goes through `AiService`; the OpenAI path **must** fall back to `MockAiEvaluator` on any
  error. Flag any change that removes/weakens that fallback — it's a Critical Constraint.

**DTO & injection idioms**:
- DTOs are `record`s grouped per module in `<Module>Dtos` (e.g. `WritingDtos.SubmitRequest`). Flag a
  one-file-per-DTO pattern or entities returned from controllers.
- Constructor injection only, `private final` fields. Flag `@Autowired` fields.

**Errors & API shape**:
- Errors must flow through `GlobalExceptionHandler` → the `ErrorResponse` record. Flag ad-hoc error
  maps/strings. Endpoints need `@Operation`/`@Tag`. (See `.claude/rules/api-conventions.md`.)

**Auth & role isolation**:
- Caller's own data must come from `currentUser.user()`, never a client-supplied id. Manager
  capabilities live under `/api/manager/**`. Flag any cross-user data exposure.

**Frontend**:
- All HTTP through `services/api.js`/`services/*` — flag raw `axios`/`fetch` in components. Auth via
  `AuthContext`, toasts via `ToastContext`, styling via MUI + `theme.js`.

## How to run a review here
1. `git diff` the branch. 2. Run gstack `/review` for the generic pass. 3. Walk the checklist above
(and `/team-review`). 4. Report findings as `file:line` grouped blocking / should-fix / nit, ending
with a **ready-to-ship / needs-changes** verdict.
