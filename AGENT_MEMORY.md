# Learn Wisely — Agent Memory

> Canonical handoff context for future agents. Read after `INSTRUCTIONS.md`; verify claims against code and tests. Never put secrets here.

**Last updated:** 2026-10-05  
**Branch context:** Arena work is on `arena/01a10ce6-learn-wisely`.

## Product truth

Learn Wisely is a real-data study workspace. New accounts begin empty. The application must never seed fabricated users, posts, chats, activity, progress, testimonials, or leaderboard entries. Static option lists (subjects, exams, widget types, coach prompt starters) are UI choices, not user data.

Implemented user journeys:

- Email/password signup, login, logout, 30-day server sessions, onboarding, account deletion.
- Profile, appearance, study goals, real focus-session totals and streaks.
- Multiple study boards with note, task, focus-timer, and countdown widgets.
- User-created notes, flashcard decks, and quizzes.
- Community creation, membership, posts, votes, comments, moderation/deletion.
- Direct and group chats by exact account handle; five-second message polling.
- Groq-backed study coach grounded in the user's profile and recent library content.

## Architecture map

| Area | Canonical location |
|---|---|
| React application | `src/` |
| Pages and product flows | `src/pages/` |
| Shared UI | `src/components/` |
| API client/auth context | `src/lib/`, `src/contexts/` |
| Worker entry and middleware | `server/index.ts` |
| API route handlers | `server/routes/` |
| Mongo connection/indexes | `server/db.ts` |
| Auth/CSRF/password/session logic | `server/auth.ts` |
| Runtime request contracts | `shared/contracts.ts` |
| Static honest UI choices | `shared/constants.ts` |
| Cloudflare config | `wrangler.jsonc` |
| Deployment/runbook | `README.md` |
| Historical layout reference only | `proto/` |
| Agent planning references only | `skills/` |

Request path: React -> same-origin `/api/*` -> Hono Worker -> Zod validation -> auth/CSRF middleware -> MongoDB Atlas. `/api/coach/messages` additionally calls Groq from the Worker. Production static assets come only from `dist/`; neither `skills/` nor `proto/` is published.

## Durable data

MongoDB collections are created on use; indexes are idempotently ensured by `server/db.ts`:

`users`, `sessions`, `boards`, `library_items`, `communities`, `community_members`, `posts`, `comments`, `votes`, `conversations`, `messages`, `study_sessions`, `coach_messages`, `rate_limits`.

ObjectIds never cross the API boundary as BSON; serializers return strings. User-generated content is rendered as React text, never injected HTML.

## Security invariants

- Passwords use Web Crypto PBKDF2-SHA256 with a random salt and 210,000 iterations.
- Session tokens are random, hashed in MongoDB, and sent in HTTP-only `SameSite=Strict` cookies.
- Mutations require a matching double-submit CSRF token after authentication.
- Authorization checks are performed by owner/member/participant on every protected resource.
- Groq and Mongo credentials exist only as Worker secrets or uncommitted `.dev.vars` values.
- Request bodies are capped at 64 KiB; API inputs use Zod; expensive coach/auth operations are Mongo-rate-limited.
- Security headers and a same-origin CSP are set in `server/index.ts`.

## Commands and quality gate

```bash
npm install
npm run dev          # Vite :5173 + Wrangler :8787
npm run typecheck
npm run lint
npm test
npm run test:e2e     # requires an installed Playwright Chromium
npm run build:worker # frontend build + Worker dry-run bundle
npm run check        # all quality checks
```

At the last update: TypeScript, ESLint, 13 unit/API tests, Vite build, Worker dry-run, and `npm audit` pass. The dry-run Worker upload was ~2.66 MiB uncompressed / ~376 KiB gzip. Browser-facing development accepts the Arena preview host.

## Deployment status and honest gaps

- Source and deployment configuration are complete.
- No credentials were supplied, so no real Atlas/Groq production smoke test or deployment was performed.
- Playwright public-page tests are committed, but this sandbox could not download Chromium from the Playwright CDN (`ECONNRESET`); run `npm run test:e2e` where Chromium is available.
- `/api/health` intentionally returns `503 degraded` until `MONGODB_URI` is configured.
- The official MongoDB Node driver bundles successfully for the 2026-10-05 Workers runtime. Wrangler currently emits a non-fatal `whatwg-url`/unenv default-export warning; the Worker starts, but a real Atlas connection must still be verified after secrets/network access are configured.
- MongoDB Atlas must permit Cloudflare's dynamic egress (for an M0 cluster this commonly means `0.0.0.0/0`); mitigate with a unique least-privilege database user and a strong generated password.
- Chat uses polling rather than fake realtime or paid infrastructure. Do not claim WebSocket realtime.

## Decisions to preserve

1. One Cloudflare Worker serves both API and Vite assets to keep cookies same-origin and deployment free-tier friendly.
2. MongoDB Atlas is the only durable store. Do not add localStorage persistence or seed/demo databases as a fallback.
3. The Groq key is never accepted from or exposed to the browser.
4. Uploaded binary files are intentionally not implemented: browser/Worker local disk is not durable. “Files local” means project assets stay in this repository; study content is text/structured MongoDB data.
5. `proto/` is visual/product reference only. Do not deploy or import it directly.
6. The UI uses restrained glass only for shell/chrome/cards, with solid-enough contrast and a no-backdrop-filter fallback.

## Next-agent checklist

1. Read `INSTRUCTIONS.md`, then this file, then task-relevant `skills/*/SKILL.md`.
2. Check `git status`; do not overwrite user changes.
3. Run the quality gate before and after material changes.
4. For deployment work, follow `README.md` exactly and test `/api/health`, signup, board save, community post, chat between two real test accounts, and one coach request.
5. Update this file only when architecture, security invariants, deployment status, or known gaps materially change.

## Delete zone / do not resurrect

- Do not make `proto/index.html` the production entry point.
- Do not restore sample records from `proto/data.js` into production.
- Do not add MongoDB Atlas Data API code; Atlas App Services Data API is not the selected/current integration.
- Do not commit `.dev.vars`, credentials, generated `dist/`, `.wrangler/`, or Worker dry-run output.
