# Architecture Boundaries

The layering contract for the backend, and the module boundaries for the frontend. The
`architect` agent enforces these; crossing a boundary requires a decision entry in
`.claude/memory/decisions.md`.

## Backend layering (strict, one direction)

```
controller  →  service (+ service.ai)  →  repository  →  entity
                     ↓
                    dto  (records returned to controllers)
supporting: security · config · exception · mapper · util · domain
```

- **Controllers** depend only on **services** (and DTOs). A controller must **never** touch a
  repository or entity directly.
- **Services** hold all business logic and are the only layer that calls repositories. Cross-service
  calls are allowed; keep them acyclic.
- **`service.ai`** is the AI facade. Callers depend on `AiService` — not on `OpenAiClient` or
  `MockAiEvaluator` directly. **Every OpenAI path must fall back to `MockAiEvaluator` on error**
  (Critical Constraint). Do not leak OpenAI types outside `service.ai`.
- **Repositories** are Spring Data JPA interfaces; no business logic.
- **Entities** are persistence only; they are never returned from controllers — map to DTOs
  (via `mapper/` or inline in the service).
- **DTOs** are records grouped per module (`<Module>Dtos`). Requests/responses only.
- **`domain`** holds enums (`Role`, `Section`, `Difficulty`, `SessionStatus`).
- **`security` / `config` / `exception`** are cross-cutting and may be used by controllers/services.

## Adding a new assessment-type or module

1. Controller `@RequestMapping("/api/<module>")` (thin).
2. `<Module>Service` for logic; `<Module>Dtos` for request/response records.
3. Entities + Spring Data repositories as needed; keep `data.sql` idempotent if seeding.
4. Scoring that uses AI goes through `AiService` with a mock fallback.
5. Enforce role scoping (`currentUser.user()` / `/api/manager/**`).

## Frontend module boundaries

```
pages (by role: employee / assessment / manager)
   ↓ use
services/ (axios wrappers)  ·  contexts/ (Auth, Toast)  ·  hooks/  ·  components/
   ↓
services/api.js  (single axios instance — the only place HTTP is configured)
```

- Pages compose components/hooks and call `services/*`. Components stay presentational where
  practical.
- **All network access funnels through `services/api.js`.** No direct `axios`/`fetch` in pages or
  components.
- Auth state only via `AuthContext`; global notifications only via `ToastContext`.

## Hard "do not"s

- No controller → repository/entity shortcut.
- No OpenAI SDK types outside `service.ai`; no removal of the mock fallback.
- No new top-level backend package or frontend top-level folder without an architect decision.
- No session/cookie state (the API is stateless by design).
