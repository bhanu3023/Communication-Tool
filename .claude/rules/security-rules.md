# Security Rules

Security invariants for the AI Communication Skills Trainer. The `security-reviewer` agent and
gstack `/cso` enforce these. These are *this app's* rules; `/cso` adds generic coverage.

## Authentication

- **Microsoft (Azure AD) is the only real sign-in.** The SPA gets a Microsoft **ID token** via
  MSAL and posts it to `POST /api/auth/login`. The backend (`AzureTokenVerifier`) MUST:
  validate the token against the tenant's **JWKS**, and check the **audience == configured
  client id**. Never trust an ID token without both checks.
- The backend then issues its own **application JWT** (HS256, `JwtService`) with `uid`, `email`,
  `role`, `name`. `JwtAuthenticationFilter` validates it on every request.
- **No client secret** is used or required (SPA auth-code + PKCE; backend only *validates* the ID
  token). Do not add a secret-based flow.

## Dev-login bypass — handle with care

- `APP_DEV_LOGIN_ENABLED` / `VITE_DEV_LOGIN` expose one-click sign-in for seeded users **without
  Microsoft**. This endpoint is only registered when the flag is `true`.
- **Both flags MUST be `false`** in any shared/staging/prod environment. A PR that flips either to
  `true` (or defaults them true) is a blocking security finding.

## Authorization / role isolation

- Employees may access **only their own** data (`currentUser.user()`); managers may access **only
  their direct reports**. Never resolve the caller's own data from a client-supplied id.
- Manager-only routes are `/api/manager/**` → `ROLE_MANAGER` (URL rule + `@PreAuthorize`). Any new
  manager capability must be under this path or explicitly guarded.

## Secrets

- Real secrets live **only in `.env`** (gitignored: `.env`, `frontend/.env`, `backend/.env`).
  Never commit real `AZURE_*`, `OPENAI_API_KEY`, `APP_JWT_SECRET`, or `AZURE_SPEECH_KEY` values.
- `.env.example` must contain **placeholders only**.
- `APP_JWT_SECRET` must be a long random value (>= 32 chars) in any real environment; never keep
  the `change-me-...` default.
- **If a secret is ever committed or shared, rotate it immediately** (Azure app registration /
  OpenAI key / regenerate JWT secret) — rotation, not deletion, is the fix.
- Claude must not print secret values. The hook `.claude/hooks/block-sensitive-writes.sh` blocks
  writes to env/key files as a backstop.

## API surface

- Stateless API → **CSRF intentionally disabled**; do not "fix" this by adding sessions/cookies.
- SQL injection is prevented by JPA parameter binding — no string-concatenated queries.
- All request bodies are validated with Jakarta Validation. Security-relevant actions are written
  to `audit_log` (`AuditService`) — preserve that when adding sensitive operations.
- CORS is restricted to `APP_CORS_ORIGINS`; keep it tight (no `*`) with credentials enabled.
