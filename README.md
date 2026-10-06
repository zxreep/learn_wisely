# Learn Wisely

A calm, real-data study workspace for boards, notes, flashcards, quizzes, communities, chats, focus tracking, profiles, and a Groq-powered study coach.

The product intentionally ships with **no fake social or progress data**. New accounts begin empty; everything shown in a user's workspace is created by a real user or derived from completed focus sessions.

## Stack

- **Frontend:** React 19, TypeScript, Vite, TanStack Query, Lucide
- **API:** Hono on Cloudflare Workers
- **Database:** MongoDB Atlas (M0/free-compatible)
- **AI:** Groq's OpenAI-compatible chat completion API
- **Validation:** Shared Zod runtime contracts
- **Deployment:** One Cloudflare Worker serving both API and static Vite assets

## Local development

Requirements: Node.js 22+ and npm.

```bash
npm install
cp .env.example .dev.vars
```

Fill `.dev.vars` with your own Atlas connection string and Groq key. The file is ignored by Git.

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Worker API: `http://localhost:8787`
- Vite proxies browser `/api` requests to the Worker.

Check readiness:

```bash
curl http://localhost:5173/api/health
```

A missing database is reported honestly as `503 degraded`; the app never falls back to fake or in-memory production data.

## MongoDB Atlas free-tier setup

1. Create an Atlas M0 cluster.
2. Create a dedicated database user with read/write access only to the `learn_wisely` database. Use a generated password.
3. In Network Access, allow Cloudflare Worker egress. Workers do not provide one fixed outbound IP on the free plan, so an M0 setup commonly needs `0.0.0.0/0`. The database still requires TLS and credentials; use least privilege and rotate the password if exposed.
4. Copy the Node driver `mongodb+srv://...` connection string.
5. Do **not** paste it into source files, GitHub variables, client code, or `wrangler.jsonc`.

Collections and indexes are initialized idempotently on first database access. No seed script runs.

## Groq free-tier setup

1. Create a Groq API key.
2. Keep the default `llama-3.1-8b-instant` model or set another model available to your account with `GROQ_MODEL`.
3. The Worker caps coach requests per user and limits responses to protect free-tier quota.
4. Exact Groq limits vary by model/account; use the Groq console as the live source of truth.

The key is used only in `server/routes/coach.ts` and is never sent to the browser.

## Cloudflare deployment

Authenticate Wrangler, then create encrypted secrets:

```bash
npx wrangler login
npx wrangler secret put MONGODB_URI
npx wrangler secret put GROQ_API_KEY
```

Optional non-secret variables are already in `wrangler.jsonc`:

- `MONGODB_DB=learn_wisely`
- `GROQ_MODEL=llama-3.1-8b-instant`
- `APP_ENV=production`

Run the full gate and deploy:

```bash
npm run check
npm run deploy
```

Cloudflare serves only `dist/` static assets and the Worker bundle. `skills/`, `proto/`, local env files, source maps outside `dist/`, and development files are not public assets.

### Cloudflare dashboard Git deployment

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: repository root
- Add encrypted secrets `MONGODB_URI` and `GROQ_API_KEY`
- Optional build-watch exclusion: `skills/*`

## Post-deploy smoke test

Use temporary, real test accounts—never seed demo records.

1. `GET /api/health` returns `200` with database `configured: true`.
2. Create account A, complete onboarding, create a board, add/edit a note widget, and reload.
3. Create one library note, deck, and quiz; edit and delete one.
4. Create account B in a separate browser session.
5. Account A creates a community; account B joins, posts, votes, and comments.
6. Start a direct chat by exact handle and exchange messages in both directions.
7. Complete or temporarily shorten a focus timer in a test branch; confirm profile totals come from the logged session.
8. Ask the coach about a saved note and confirm it does not invent unavailable material.
9. Delete temporary content/accounts after verification.

## Quality commands

```bash
npm run typecheck    # strict TypeScript
npm run lint         # ESLint + React hooks rules
npm test             # Vitest unit/API checks
npx playwright install chromium  # once per development machine
npm run test:e2e     # public desktop/mobile browser smoke tests
npm run build        # production frontend
npm run build:worker # frontend + Cloudflare Worker dry run
npm audit            # dependency advisories
npm run check        # complete pre-deploy gate
```

## Data and privacy notes

- Sessions are random server-side records; only an HTTP-only cookie reaches the browser.
- State-changing routes require a CSRF token and resource authorization.
- User content is plain text/structured data and is never rendered as HTML.
- Coach context includes profile goals/subjects and bounded excerpts of recent library items. It does not include passwords or private chats.
- Binary uploads are not implemented. Cloudflare Worker local disk is not durable; adding uploads later requires an explicit storage design (for example R2, with its own free-tier/privacy review).

## Repository map

```text
src/                 React UI
server/              Hono Worker, MongoDB, Groq integration
shared/              runtime schemas and shared API types
public/              local static assets
proto/               historical layout reference; not deployed
skills/              agent guidance; not deployed
AGENT_MEMORY.md      current architecture/status handoff
INSTRUCTIONS.md      contributor and agent rules
wrangler.jsonc       Cloudflare production config
```

See `AGENT_MEMORY.md` for current implementation status and preserved architectural decisions.
