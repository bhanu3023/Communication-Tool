---
description: Scaffold a new backend module or frontend page following this project's layered conventions
argument-hint: <backend-module|frontend-page> <name>
---

# /scaffold — generate project-consistent boilerplate

Create new code that matches the AI Comm Trainer's conventions exactly. Read
`.claude/rules/architecture-boundaries.md`, `code-style.md`, and `api-conventions.md` first, then
generate the files. Do not invent new patterns — mirror an existing module (e.g. `speaking`).

Argument: `$ARGUMENTS`

## Backend module (`/scaffold backend-module <name>`)

Under `backend/src/main/java/com/cloudfuze/trainer/`, create:

1. `controller/<Name>Controller.java` — `@RestController @RequestMapping("/api/<name>")`, `@Tag`,
   constructor injection of `<Name>Service` + `CurrentUser`, thin endpoints with `@Operation` and
   `@Valid` request records.
2. `service/<Name>Service.java` — business logic; the only layer calling repositories. Route any AI
   scoring through `AiService` (keep the `MockAiEvaluator` fallback).
3. `dto/<name>/<Name>Dtos.java` — request/response **records** grouped in one container class.
4. `entity/<Name>.java` + `repository/<Name>Repository.java` (Spring Data) if persistence is needed;
   add an enum to `domain/` if needed. If seeding, add an **idempotent** block to `data.sql`.
5. Enforce role scoping (`currentUser.user()`, or place under `/api/manager/**` for manager-only).

## Frontend page (`/scaffold frontend-page <name>`)

Under `frontend/src/`, create:

1. `pages/<area>/<Name>.jsx` — MUI + shared `theme.js`; function component.
2. A wrapper in `services/` for any new endpoint (never call axios directly).
3. Wire the route in `App.jsx`, guarded by `ProtectedRoute` with the correct role.
4. Use `AuthContext` for user/role and `ToastContext` for notifications.

After scaffolding: summarize the files created and the remaining TODOs, then suggest `/team-review`.
