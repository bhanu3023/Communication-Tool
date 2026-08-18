# Deploy Notes

Handoff checklist for deploying the AI Communication Skills Trainer after the
security + scoring changes. `.env` is gitignored, so environment values must be set
per environment — they do NOT come from the repo.

## 1. Pull latest `main`
Includes: JWT startup guard, AI HTTP timeouts, server-side speaking score,
true-score display, improved/declined feedback, full-page Microsoft redirect login.

## 2. Environment variables (set in each environment's `.env`)

| Variable | Required | Notes |
|---|---|---|
| `APP_JWT_SECRET` | **YES** | Long random string, **>= 32 chars**, must NOT contain `change-me`. **The backend refuses to start otherwise.** |
| `OPENAI_AUDIO_MODEL` | for audio scoring | Use `gpt-audio-mini` (or `gpt-audio`). The old `gpt-4o-audio-preview` is retired and returns 404 → Speaking silently falls back to transcript. |
| `OPENAI_TRANSCRIBE_MODEL` | for speaking | Defaults to `gpt-4o-transcribe`, which is what Speaking is graded from. Measured at 13.0% word error rate on real candidate recordings vs 15.8% for `whisper-1` -- but ONLY with the accent prompt the backend sends; without it the same model is 20.6%. Do not set this to a `gpt-4o-*` value expecting timings: those models reject `response_format=verbose_json`. |
| `OPENAI_API_KEY` | optional | If empty, a deterministic mock evaluator is used. |
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` (+ `VITE_` copies) | **YES** | Microsoft login. |
| `VITE_AZURE_REDIRECT_URI` | not used | The app now redirects to its own origin (`window.location.origin`) automatically — no build-time value needed. Just register the origin in Azure (see below). |
| `APP_CORS_ORIGINS` | **YES** | Must include the deployed frontend URL. |

## 3. Azure app registration (login is now a full-page redirect)
- Register the deployed URL as a **Single-Page Application (SPA)** redirect URI —
  e.g. `https://aicommunication.cftools.live` (exact, no trailing slash).
- Keep `http://localhost:5174` registered too for local dev.
- The frontend redirects to its **own origin** at runtime, so each origin the app is
  served from must be a registered SPA redirect URI. No build-time redirect variable.
- Redirect flow (not popup) is used; `navigateToLoginRequestUrl` is `false`.

## 4. Build & run
```bash
docker compose up --build -d
```

## 5. Smoke test
- Backend starts (fails fast if `APP_JWT_SECRET` is weak — that's expected).
- Sign in with Microsoft (full-page redirect) lands on the dashboard/manager view.
- A Speaking attempt scores without 404s in backend logs (audio model reachable).

## 6. Speaking / recording in production — the three things that break it

Recording works on every local machine and can still fail once deployed, because all three
causes below live in the environment rather than in the app. Check them on every new host.

### 6.1 The page MUST be served over https (this is the usual cause)

`getUserMedia` is gated on a **secure context**. On an `http://` page the browser does not
prompt for the microphone and does not show a blocked-permission icon — it removes
`navigator.mediaDevices` **entirely**, and nothing the candidate can click will bring it back.
`localhost` is exempt from the rule, which is exactly why this never reproduces in local
testing and only ever appears in production. It looks like "some browsers don't allow the mic",
but every modern browser behaves this way; the difference is the origin, not the browser.

It bites when someone reaches the app by:
- an `http://` link (bookmark, email, or an old shortcut),
- a raw IP such as `http://10.0.0.5:5174`,
- an internal hostname with no TLS.

What the app now does:
- `frontend/nginx.conf` sends a **301 to https** when the upstream proxy reports
  `X-Forwarded-Proto: http`. The container itself listens on plain 80 because TLS terminates
  upstream, so the redirect is deliberately conditional — an unconditional one would loop.
  **If your proxy does not set `X-Forwarded-Proto`, configure the redirect there instead.**
- The Speaking mic-check screen detects the insecure origin, states the real reason, and
  **disables both** "Start Speaking Test" and "Start anyway", so nobody can enter an exam that
  cannot record.

Verify: open the deployed URL over `http://` and confirm it lands on `https://`.

### 6.2 Body size limit — a submit is now about 5 MB

All ten recordings go up in **one POST** as base64 WAV. With the current Level 2 set
(301 words, ~120s of speech at 16 kHz mono 16-bit) that is **≈3.7 MB of WAV, ≈4.9 MB base64**,
and the longest single sentence is ~0.9 MB on its own.

**nginx's default `client_max_body_size` is 1 MB**, which returns **413** and loses the whole
attempt *after* the candidate has finished speaking. On any proxy in front of the backend:

```nginx
client_max_body_size 16m;
```

### 6.3 Read timeout — a submit takes minutes, not seconds

`SpeakingService.submit` scores the ten sentences **sequentially**, and each one makes two
OpenAI calls (transcribe, then grade) with a 60s read timeout each. Normal completion is well
under a minute, but the worst case is far longer, and the longer sentences increase it.

**nginx's default `proxy_read_timeout` is 60s** → **504**, again after the exam is over. Raise it
on any proxy in front of the backend:

```nginx
proxy_read_timeout 300s;
proxy_send_timeout 300s;
```

### 6.4 Mixed content

`VITE_API_BASE_URL` is baked in at **build** time. If it is `http://…` while the page is served
over https, the browser blocks every API call as mixed content and the app appears dead. It must
be an `https://` URL (or a same-origin path). Rebuild the frontend image after changing it —
editing `.env` alone does nothing, because the value is compiled into the bundle.

### 6.5 Speaking smoke test on the deployed URL

1. Open the production URL over **http://** → it must redirect to **https://**.
2. Sign in, start Speaking, and confirm the mic check shows a moving level bar.
3. Press **Record answer** and confirm the button only reports recording after
   "Getting the mic ready" clears. Speak, press stop, and **play the take back** — that playback
   is the actual audio that will be scored.
4. Deny microphone permission once and confirm the app says permission is blocked and does
   **not** show a running recorder.
5. Submit a full 10-sentence attempt and confirm it scores rather than returning 413 or 504.

Note `VITE_SPEAKING_AUDIO` in `docker-compose.yml` is **dead** — it is passed to the build but
read nowhere in `src/`. It does not gate recording; leave it alone or remove it.
