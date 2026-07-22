# API Conventions

How the AI Communication Skills Trainer structures its HTTP API. gstack `/review` and `/qa`
use these to judge API changes. These are *this project's* shapes — not generic REST advice.

## Routing & naming

- All endpoints are under `/api`, grouped by module controller:
  `/api/auth`, `/api/employee`, `/api/manager`, `/api/listening`, `/api/speaking`,
  `/api/writing`, `/api/proctor`.
- Base path is set with `@RequestMapping("/api/<module>")` on the controller; methods add the
  sub-path (`@PostMapping("/start")`, `@GetMapping("/employee/{id}")`).
- Action-style sub-paths are used where they read clearly (`/submitSpeech`, `/saveDraft`,
  `/request-attempt`, `/grant-attempt`). Follow the existing casing of neighboring endpoints.

## Requests & responses

- **Request bodies** are validated DTO records annotated with Jakarta Validation; controllers use
  `@Valid @RequestBody <Module>Dtos.XxxRequest`.
- **Responses** are DTO records — never entities. Assessment scoring returns `SectionScoreResponse`;
  auth returns `AuthDtos.*`; dashboards return `DashboardDtos.*`, etc.
- **Binary responses** (PDF report, speaking recording) return `ResponseEntity<byte[]>` with an
  explicit `Content-Type` (`application/pdf`, `audio/wav`) and appropriate `CacheControl`.

## Errors

- All errors flow through `GlobalExceptionHandler` (`@RestControllerAdvice`) and return the
  **`ErrorResponse`** record: `{ timestamp, status, error, message, path }`.
- Throw the domain exceptions in `exception/`: `ResourceNotFoundException` (404),
  `ForbiddenException` (403), or `ApiException` (custom status). Do **not** return ad-hoc error maps
  or raw strings from controllers.
- Validation failures are auto-formatted to `field: message; field: message`.

## Auth & authorization

- Public endpoints are whitelisted in `SecurityConfig` (`/api/auth/login`, Swagger, health).
  Everything else requires a valid app JWT (`Authorization: Bearer <jwt>`).
- Manager-only endpoints live under `/api/manager/**` (enforced by URL rule → `ROLE_MANAGER`) and/or
  `@PreAuthorize`. Employee endpoints must scope data to `currentUser.user()` — never trust an id
  from the client for the caller's own data.

## Docs

- Every endpoint is documented via `@Operation(summary=...)` and shows up in Swagger UI at
  `/swagger-ui.html`. Keep summaries accurate when you change behavior.

## Frontend contract

- The SPA consumes these via `src/services/api.js` (adds the Bearer token; on `401` clears the
  session and redirects to `/login`). New endpoints get a wrapper in `src/services/` — keep request
  and response shapes in sync with the backend DTO records.
