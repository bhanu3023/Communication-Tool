---
name: api-design
description: How THIS project shapes its HTTP API — /api/<module> routing, per-module DTO records, the ErrorResponse envelope, app-JWT auth, and role scoping for the AI Comm Trainer. Use when adding or changing an endpoint.
---

# API design — AI Comm Trainer conventions

> Concrete rules live in `.claude/rules/api-conventions.md`; this skill is the working guide for
> designing an endpoint that fits the existing surface. gstack `/review`/`/qa` verify behavior.

## Shape of an endpoint here

1. **Route**: `@RequestMapping("/api/<module>")` on the controller; method sub-paths like `/start`,
   `/submit`, `/submitSpeech`, `/saveDraft`, `/employee/{id}`. Match neighboring casing.
2. **Request**: a validated DTO record — `@Valid @RequestBody <Module>Dtos.XxxRequest`.
3. **Delegate**: controller calls the service; **no logic in the controller**.
4. **Response**: a DTO record (e.g. `SectionScoreResponse`, `<Module>Dtos.XxxResponse`) — **never an
   entity**. Binary output uses `ResponseEntity<byte[]>` with explicit `Content-Type` + `CacheControl`
   (see PDF report and speaking-recording endpoints).
5. **Docs**: `@Tag` on the controller, `@Operation(summary=...)` on the method.

## Existing surface (reference)

`/api/auth` (login, profile, logout) · `/api/employee` (dashboard, history, sections, attempts,
request-attempt) · `/api/manager/**` (team, employee/{id}, report, attempts, grant-attempt,
download-pdf) · `/api/listening|speaking|writing` (start / submit / drafts / recordings) ·
`/api/proctor/event`.

## Errors (mandatory envelope)

Throw `ResourceNotFoundException` (404), `ForbiddenException` (403), or `ApiException` (custom).
`GlobalExceptionHandler` renders the **`ErrorResponse`** record `{timestamp,status,error,message,path}`.
Never return ad-hoc maps/strings or raw entities on error.

## Auth & authorization

- Only `/api/auth/login`, Swagger, and health are public (`SecurityConfig`). Everything else needs a
  valid app JWT.
- Manager-only endpoints go under `/api/manager/**` (→ `ROLE_MANAGER`) and/or `@PreAuthorize`.
- **Never resolve the caller's own data from a client-supplied id** — use `currentUser.user()`.

## Frontend contract
Add a wrapper in `frontend/src/services/` (built on `api.js`) so the Bearer token + 401 handling are
applied. Keep request/response fields exactly in sync with the backend DTO records.
