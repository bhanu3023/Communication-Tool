---
description: Project-specific review checklist for the AI Comm Trainer (runs AFTER gstack /review)
---

# /team-review — CloudFuze AI Comm Trainer review checklist

> Renamed from `review` to avoid colliding with gstack's `/review`. Run gstack **`/review`**
> first for the generic pass; use this for the **project-specific** conventions gstack doesn't know.

Review the current diff against this project's rules. Report findings grouped by severity
(blocking / should-fix / nit) with `file:line` references.

## 1. Architecture boundaries (`.claude/rules/architecture-boundaries.md`)
- [ ] No controller touches a repository/entity directly.
- [ ] Services are the only callers of repositories; no cyclic service graph.
- [ ] AI code goes through `AiService`; **OpenAI path still falls back to `MockAiEvaluator`**.
- [ ] No OpenAI SDK types leaked outside `service.ai`.
- [ ] No new top-level package/folder without a `decisions.md` entry.

## 2. API conventions (`.claude/rules/api-conventions.md`)
- [ ] New endpoints under `/api/<module>`, thin controller, `@Valid` request records.
- [ ] Responses are DTO records (never entities); `@Operation`/`@Tag` present.
- [ ] Errors go through `GlobalExceptionHandler` → `ErrorResponse`; domain exceptions used.
- [ ] Frontend call added to `services/` (not raw axios/fetch in a component).

## 3. Code style (`.claude/rules/code-style.md`)
- [ ] Constructor injection, `private final` collaborators; DTOs grouped in `<Module>Dtos`.
- [ ] React: function components, MUI + `theme.js`, `AuthContext`/`ToastContext` used correctly.

## 4. Security (`.claude/rules/security-rules.md`)
- [ ] Role isolation intact; caller data resolved via `currentUser.user()`, not client id.
- [ ] Dev-login flags remain `false`; no secrets added; CORS not widened.
- [ ] Azure token validation (JWKS + audience) unchanged or still correct.

## 5. Tests & docs
- [ ] Deterministic tests added/updated (`.claude/rules/testing-standard.md`); no live OpenAI/Azure.
- [ ] `data.sql` still idempotent if seeding changed.
- [ ] Docs updated when behavior changed.

Finish with a short verdict: **ready to `/ship`** or **needs changes** (list them).
