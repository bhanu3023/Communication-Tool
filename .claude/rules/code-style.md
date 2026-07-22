# Code Style

Project-specific coding conventions for the AI Communication Skills Trainer. gstack `/review`
reads these rules. Match the surrounding code first; these codify the patterns already in use.

## Backend (Java 21 / Spring Boot 3)

- **Base package:** `com.cloudfuze.trainer`. New classes go in the correct layer package
  (`controller`, `service`, `service.ai`, `repository`, `entity`, `dto`, `security`, `config`,
  `exception`, `mapper`, `util`, `domain`). See `.claude/rules/architecture-boundaries.md`.
- **Dependency injection: constructor injection only.** No `@Autowired` fields. Declare
  collaborators `private final` and inject via a single constructor (see `SpeakingController`).
- **DTOs are Java `record`s, grouped per module** in a container class named `<Module>Dtos`
  (e.g. `SpeakingDtos.StartResponse`, `WritingDtos.SubmitRequest`). Cross-cutting DTOs live at
  the top of `dto/` (e.g. `SectionScoreResponse`, `ProfileDto`). Do not create one file per DTO.
- **Enums live in `domain/`** (`Role`, `Section`, `Difficulty`, `SessionStatus`).
- **Lombok** is available; use it consistently with the file you're editing (entities use it).
- **Current user:** obtain the authenticated user via the `CurrentUser` helper
  (`currentUser.user()`), never by parsing the token in the controller.
- **Controllers are thin:** validate (`@Valid`), delegate to a service, return a DTO. No
  business logic or repository access in controllers.
- **Swagger:** annotate every controller with `@Tag` and each endpoint with `@Operation(summary=...)`.
- **Imports:** explicit, no wildcards (matches existing files).

## Frontend (React 19 / Vite)

- **Function components + hooks only.** No class components.
- **File naming:** components/pages `PascalCase.jsx`; hooks `useX.js`; services/utils `camelCase.js`.
- **All HTTP goes through `src/services/api.js`** (the shared axios instance) or a wrapper in
  `src/services/`. Never call `axios`/`fetch` directly from a component.
- **Auth/session state** comes from `AuthContext`; toasts from `ToastContext`. Don't read
  `localStorage` tokens directly in components.
- **Styling:** Material UI (`@mui/material`) with the shared `theme.js`. Prefer MUI `sx`/components
  over ad-hoc CSS.
- **Routing:** React Router 6; role-guarded routes use `ProtectedRoute`.

## General

- Keep changes minimal and localized; match existing formatting (indentation, import order).
- No new top-level dependencies without an architect decision (`.claude/memory/decisions.md`).
- Comments explain *why*, not *what*; match the surrounding comment density.
