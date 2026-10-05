# MEMORY — Wisely agent handoff

> Read this first if you're an agent continuing work on this repo. It is the
> current source of truth for architecture, how to run/verify, secrets, and
> every gotcha another agent has already hit.

## 1. What this is

**Wisely** — a local-first study workspace (Kanban boards, notes library +
AI drawer, flashcards with SM-2, focus timer with pomodoro, XP/streaks/
quests/badges) plus **real server-backed social features** (accounts, cloud
sync, communities, study-room chat, live presence, weekly-XP leaderboard).

Hard rule: **no simulated data anywhere.** Communities, members, chat lines,
presence and leaderboard rows all come from MongoDB via the Worker API.
The only "seeded" content is (a) the six communities + four rooms written
into the DB by `worker/seed.ts` on cold start (members count starts at 0),
and (b) the user's *own* private starter workspace on first run (their notes/
boards — standard onboarding content, wipeable in Settings → "Delete
everything").

## 2. Stack & topology

```
┌─ Client (src/) ────────────────┐       ┌─ Cloudflare Worker (worker/) ─┐
│ React 18 + Vite, zustand+persist│  HTTPS│ Hono router (/api/*)           │
│ local-first stores (localStorage)│═══════▶  auth: PBKDF2 (WebCrypto) +    │
│ sync engine: push/pull, offline  │ JSON │   opaque sessions (sha256 tok) │
│ queue, LWW by updatedAt          │      │ MongoStorage (official driver, │
│ AI: Groq first → on-device NLP   │      │  nodejs_compat, Atlas M0)      │
│ fallback (src/lib/ai.ts)         │      │ Groq proxy /api/ai/generate    │
└──────────────────────────────────┘      │ MemoryStorage (worker/storage) │
                                          └───────────────┬────────────────┘
                                                          ▼
                                              MongoDB Atlas M0 + Groq (free tiers)
```

- **Single deploy**: `wrangler deploy` ships the Hono API **and** the Vite
  `dist/` SPA via Workers Static Assets (`not_found_handling: single-page-
  application` → React Router deep links work). Same-origin, no CORS issues.
- **Dev**: `npm run dev` (Vite 5173) + `npm run worker:dev` (Wrangler 8787).
  Vite proxies `/api` → `http://localhost:8787` (vite.config.ts). Browser code
  **must never** reference localhost — always relative `/api/...`.
- Shared request/response contracts live in **`shared/api.ts`** (imported by
  both `src/` and `worker/`; keep it dependency-free).

## 3. Repo map

| Path | Purpose |
|---|---|
| `shared/api.ts` | Wire contracts (ApiUser, WorkspacePush/Pull, ApiCommunity/Room/Message/Presence, AiGenerate*). |
| `worker/index.ts` | Worker entry: `/api/*` → Hono app, else `env.ASSETS.fetch`. App cached per isolate. |
| `worker/app.ts` | `buildApp(storage, env)` — all routes. Environment-agnostic (this is what tests import). |
| `worker/crypto.ts` | PBKDF2-SHA256 100k iters (WebCrypto), 32-byte random session tokens, sha256Hex of token in DB. |
| `worker/storage.ts` | `Storage` interface + `MemoryStorage` reference impl (used by tests). |
| `worker/mongo.ts` | `MongoStorage` — real Atlas. Lazy MongoClient per isolate, TTL index prunes presence (300s) + expired sessions. |
| `worker/seed.ts` | Six communities + four rooms, **single-flight** `ensureSeeded()` (see gotcha #12). |
| `worker/ai.ts` | Groq calls (OpenAI-compatible `/chat/completions`), per-mode prompts, JSON parsing w/ fence stripping. |
| `src/lib/api.ts` | Client fetch wrapper; `axios`-style ApiError, bearer token via `setAuthToken`, timeouts. |
| `src/stores/auth.ts` | Accounts; on login/signup → `sync.afterSignIn()`. Token persisted in `wisely-auth` (localStorage). |
| `src/stores/sync.ts` | v2 engine: markDirty → 2.2s debounce push; pull on sign-in/60s/visibility; status in `local|offline|pending|syncing|synced|conflict`. `bootstrapSync()` called from App. |
| `src/lib/workspaceData.ts` | collect/apply workspace snapshot (library+boards+progress+focus). |
| `src/stores/community.ts` | API-backed social store; room polling (4s), heartbeat (30s), chat send, presence. Guests read-only (auth prompt on write). |
| `src/lib/aiEngine.ts` | `tryGroq()` → null on failure; `pickCorpus()` ranks/clips notes for grounding. |
| `src/lib/ai.ts` | On-device fallback NLP (summarize/flashcards/quiz/explain/ask). Keep! It powers offline mode. |
| `src/components/AuthModal.tsx` | Sign in / sign up UI (ui store `authPrompt`). |
| `tests/*.mts` | tsx test suites — see §6. |
| `skills/` | Vendor skills for agents (never deploy them; listed in wrangler ignores via not bundling them). |

## 4. Secrets & environments

| Name | Where | Purpose |
|---|---|---|
| `MONGODB_URI` | `wrangler secret put` (prod), `.dev.vars` (dev, gitignored) | Atlas connection string. Standard `mongodb://host1:27017,host2:27017/...&ssl=true` is the most compatible with Workers TCP; `mongodb+srv://` works on current workerd. |
| `MONGODB_DB` | `wrangler.jsonc` vars (`wisely`) | DB name. |
| `GROQ_API_KEY` | secret/`gsk_...` | Server-side only. If unset, `/api/ai/generate` → 503 `ai_unavailable` and the client silently falls to the on-device engine. |
| `GROQ_MODEL` | vars (`llama-3.3-70b-versatile`) | Override at will. |
| `AI_RATE_PER_HOUR` | vars (30) | Per-IP AI rate limit (in-isolate bucket, best effort across isolates). |

**Never commit secrets.** `.dev.vars` is gitignored; `.dev.vars.example` is the template.

MongoDB schema (all created lazily; indexes in `worker/mongo.ts#ensureIndexes`):
`users` (nameLower unique, passwordHash+salt, color, joinedAt) · `sessions`
(tokenHash, expiresAt, TTL index) · `workspaces` (userId unique-ish upsert,
updatedAt, deviceId, data=opaque snapshot) · `communities` · `memberships`
(userId+communityId unique) · `feeds` (per-community last-15 activity, $slice)
· `rooms` · `messages` (roomId, at) · `presence` (roomId+userId, TTL 300s on
`at`, server additionally filters > 90s staleness).

Atlas network access must allow Cloudflare egress (use 0.0.0.0/0 for a free-tier
personal project or fine-grained CF egress IP list).

## 5. Sync model (important, surprise-prone)

- Local stores are the source of truth for UX; cloud is a mirror.
- Snapshot = whole workspace `{ library, boards, progress, focus }` — merged
  granularity is **document-level last-write-wins** guarded by `updatedAt`
  (server rejects older pushes; client pulls newer snapshots and replaces
  stores via `applyWorkspace`). Device name shows in conflict toast.
- Clients pull on sign-in, every 60s (visible tab), on visibility resume and
  after each push. This is multi-machine safe; **it is not real-time merge**
  — item-level merging/crdt is a future enhancement (see §9).
- Guests keep full app locally; signing in later pushes the local world up
  first (or pulls if the account copy is newer).

## 6. How to verify (run all of these after changes)

```bash
npm run typecheck        # tsc app + worker suites
npm run build            # vite build (dist/)
npx wrangler deploy --dry-run   # worker bundles OK

TSX_TSCONFIG_PATH=$PWD/tsconfig.app.json npx tsx tests/logic.mts      # 41/41 domain tests
TSX_TSCONFIG_PATH=$PWD/tsconfig.app.json npx tsx tests/api.mts        # 42/42 API e2e (hono+MemoryStorage in Node)
TSX_TSCONFIG_PATH=$PWD/tsconfig.app.json npx tsx tests/groq.mts       # 10/10 Groq request/parse (mocked fetch)
TSX_TSCONFIG_PATH=$PWD/tsconfig.app.json npx tsx tests/render.mts     # 27/27 SSR smoke + client e2e vs real API shim
TSX_TSCONFIG_PATH=$PWD/tsconfig.app.json npx tsx tests/timer.mts      # 14/15 (1 known false expectation: 'Quick sprint' label)
TSX_TSCONFIG_PATH=$PWD/tsconfig.app.json npx tsx tests/pomodoro.mts   # cycle trace (visual)
```

Notes:
- `tests/render.mts` is the flagship: it mounts `<App/>` with
  `createRoot` in jsdom, shims `fetch` to the **in-process worker app**, then
  signs up, joins a community, chats, heartbeat/presence, leaderboard —
  the full real integration loop without network.
- zustand hooks under `renderToString` (SSR) read **initial** state, not
  `setState`-later state — hydrate via client mount or persist-backed
  localStorage, never by post-import setState if you test SSR.
- `tsconfig.json` is a references-only root: always set
  `TSX_TSCONFIG_PATH` (see above) or tsx uses the classic JSX transform and
  every route crashes with "React is not defined".
- Node ≥ 20 modern; WebCrypto global — same crypto code paths as workerd.

## 7. Deployment (Cloudflare free tier)

```bash
npm run build                    # typecheck + vite dist/
# one-time: wrangler login
wrangler secret put MONGODB_URI
wrangler secret put GROQ_API_KEY
npm run deploy                   # npm run build && wrangler deploy
```

Wrangler v4 + workers-types v5 are dev deps; `wrangler.jsonc` carries
`compatibility_flags: ["nodejs_compat"]`, static assets block with SPA
fallback, and non-secret vars. If MVP-bound, `wrangler dev` + `.dev.vars`
locally (copy `.dev.vars.example`).

PF: If `mongodb+srv://` handshakes fail under nodejs_compat in your
environment, Atlas → Connect → Drivers shows a "standard" (non-srv) string;
use that.

## 8. Gotchas already hit (don't relearn these)

1. **`tsconfig.json` is references-only** — tsx tests MUST have
   `TSX_TSCONFIG_PATH` (see §6) or "React is not defined" everywhere.
2. **Hono `c.req.param()`** is `string | undefined` under strictNullChecks —
   coerce with `?? ''`.
3. **mongodb driver types vs `@cloudflare/workers-types`**: the global
   `Document` collision makes generic `Collection<T>` impossible — use
   `Collection<any>` and `as never` at query sites (see worker/mongo.ts).
4. **MongoClientOptions` TLS props** mismatch with workers-types — pass as
   `as never`.
4b. **TS Interface with `| null`** at the end (as with earlier `WorkspacePull`)
    is invalid — use a `type` alias.
5. **Cold-start seed race** — concurrent requests could observe an empty DB;
   `ensureSeeded` uses a single-flight promise now. Keep it single-flight.
6. **AI JSON parsing**: Groq sometimes wraps JSON in ```json fences — the
   parser in worker/ai.ts strips them; use `response_format: json_object`
   for structured modes (supported by llama-3.3-70b-versatile).
7. **Timezones**: leaderboard weekly XP uses UTC day-keys server-side; the
   client uses local day-keys (`src/lib/dates.ts`). Acceptable skew around
   midnight; harmonize if it ever matters.
8. **Presence**: heartbeat every 30s; server shows you for ~90s + Mongo TTL
   index (300s) prunes stragglers. The client stores presence per room in
   `roomCache` (not persisted).
9. **zustand+persist**: stores persist under `wisely-*` localStorage keys.
   Old v1 `wisely-community` keys might exist on user machines — unused,
   harmless; data-export/import in Settings includes them.
10. **Branding copy**: "Wisely" is an owl brand; lucide has no Owl icon in
    0.453 — SVG mark lives in `src/components/icons.tsx` (OwlMark).
    lucide 0.453 lacks `CloudCheck`.
11. **framer-motion**: never use `motion.article`/`motion.*` around DnD
    card shells in BoardDetail — breaks HTML5 drag (use plain divs + animate
    on mount only).
12. **wrangler v4 + workers-types** — install together (`npm i -D wrangler@4
    @cloudflare/workers-types@5`), else erresolve.
13. **Don't tighten regex in python `str.replace` chains on this repo** —
    nested character classes cause catastrophic backtracking (one 30s stall
    in production code already; use simple literal replaces).
14. **ercheught: No trailing `.catch(() => {})` on `ensureSeeded` inside
    middleware** — there's an intentional `.catch(() => {})` in
    `worker/app.ts` middleware so a locked DB doesn't take down *all* routes;
    routes will 500 individually with clean JSON errors.
15. **Fastdl MongoDB blocked-ish in this sandbox** — can't run mongodb-memory-
    server; `MemoryStorage` + in-process hono tests are the verification law
    of the land.
16. **Liquid-glass CSS**: surfaces are `glass*` util classes in
    `src/index.css` (@layer components). Dark overrides. `@supports
    not backdrop-filter` → opaque fallback. Boot bg = radial aurora mesh —
    glass needs color behind it, don't paint opaque panels over the body.

## 9. Roadmap hooks (not built, keep in mind)

- Item-level merge/crdt for workspace sync (currently doc-level LWW).
- Real-time chat via Durable Objects/WebSockets — short polling was chosen
  for free-tier safety; swap `pollRoom`/`startRoomPolling` when upgrading.
- Password reset and email identity (name+password only today; rate-limited).
- Image/file sync (files currently live local-only in `wisely-library`;
  sizes stay under the 1.4 MB AI upload cap).
- `AI rate limit`: per-isolate token buckets shard naturally with replicas —
  acceptable best-effort; move to Durable Object if abuse shows.

## 10. Design system quick reference

Tailwind tokens in `index.css`/tailwind.config (warm desk palette, Fraunces +
Inter, dark `class` strategy). Glass tiers — `.glass` (cards, nav pill,
board columns), `.glass-strong` (topbar, modal, drawers, palette, toasts,
auth dropdown), `.glass-subtle` (chips, tabs, subtle/outline buttons, sync
chip), `.glass-input` (fields), `.glass-tint` (icon tiles, set `--tint` hex).
Applied principles: only chrome is glass; content surfaces ([paper] note
editor) stay matte; always leave colorful gradients visible behind glass;
top specular highlight via `inset 0 1px 0`; interactive states come from
Tailwind hover/active classes.
