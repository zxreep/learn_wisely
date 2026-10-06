# Wisely — a local-first digital study workspace (Cloudflare + MongoDB + Groq)

Wisely is a cohesive study home for students: customizable **study boards**, a **library** with an
**AI assistant** (Groq in the cloud, on-device NLP offline), a **Focus Mode** timer, **gamified
progress** (XP, streaks, badges, quests), a **Discover** catalog — and a **real social layer**:
accounts, cloud sync, communities, co-working room chat, live presence and a weekly XP leaderboard.

Everything is local-first: your workspace lives in the browser's localStorage and keeps working
offline; sign in once and it syncs to your account on every device. **Nothing social is simulated** —
every community member, chat line and leaderboard row is a real signed-up user stored in MongoDB.

> 🧠 Agents: read **MEMORY.md** for the full architecture, verification suites and gotchas.

## Stack

- **Client** — Vite + React 18 + TypeScript, Tailwind (liquid-glass design system), Zustand with
  `persist`, React Router, Framer Motion, Lucide.
- **Backend** — Cloudflare **Workers** (Hono) with `nodejs_compat`: PBKDF2 auth + opaque sessions,
  workspace sync (LWW), communities/memberships, room chat, presence heartbeat, leaderboard,
  Groq AI proxy. The same deploy also serves the SPA via Workers Static Assets.
- **Database** — **MongoDB Atlas M0** (official Node driver over Workers outbound TCP/TLS),
  behind a `Storage` interface with an in-memory reference impl used by tests.
- **AI** — **Groq** `llama-3.3-70b-versatile` server-side (key never touches the client).
  Automatic fallback to an on-device extractive engine so the AI drawer keeps working offline.

## Quick start

```bash
npm install
npm run dev                    # http://localhost:5173 (Vite)

# optional: run the API locally (proxied from /api on 5173)
cp .dev.vars.example .dev.vars # fill MONGODB_URI + GROQ_API_KEY
npm run worker:dev             # http://localhost:8787

npm run build                  # typechecks app+worker, bundles to dist/
npm run deploy                 # npm run build && wrangler deploy (Cloudflare)
```

Secrets are provisioned with `wrangler secret put MONGODB_URI` / `wrangler secret put GROQ_API_KEY`
(never committed). See MEMORY.md §4 for the full environment inventory and schema.

## Feature map

| Area | What you get |
| --- | --- |
| **Dashboard** | Daily-goal ring, streak, due flashcards, quests, week chart, "Ask Wisely" shortcuts |
| **Study boards** | Unlimited kanban: drag & drop, columns CRUD, due dates, priorities, tags, linked notes |
| **Library** | Folders, markdown-lite notes with autosave + preview, file shelf, flashcard decks |
| **AI drawer** | Summarize, flashcard generation, quiz, explain, ask — Groq when online (grounded in just the matching notes), private on-device engine as fallback, with an engine badge per answer |
| **Flashcards** | Spaced repetition (SM-2 lite), due queues, deck mastery |
| **Focus Mode** | Pomodoro / deep-work / sprint / custom, deadline-based engine that survives navigation, generated soundscapes, zen overlay, announce-your-focus in a room |
| **Progress** | XP & levels, streaks, badges, daily + weekly quests, heatmap, XP feed |
| **Communities** | Real server records — join/leave, live activity feed of real members |
| **Study rooms** | Real chat (4s polling), live presence (~90s TTL), "Focus in this room" announces your timer |
| **Leaderboard** | Weekly XP computed server-side from synced workspaces |
| **Offline & sync** | Offline banner, queued-change counter, debounced push, 60s pulls, conflict toast, backup export/import |

## Tests

```bash
TSX_TSCONFIG_PATH=$PWD/tsconfig.app.json npx tsx tests/logic.mts    # domain logic
TSX_TSCONFIG_PATH=$PWD/tsconfig.app.json npx tsx tests/api.mts      # API e2e (hono + memory DB)
TSX_TSCONFIG_PATH=$PWD/tsconfig.app.json npx tsx tests/groq.mts     # Groq adapter
TSX_TSCONFIG_PATH=$PWD/tsconfig.app.json npx tsx tests/render.mts   # SSR smoke + full client e2e against the real in-process API
TSX_TSCONFIG_PATH=$PWD/tsconfig.app.json npx tsx tests/timer.mts    # focus engine
```

## Project layout

```
src/            # client app (pages, components, stores, lib)
worker/         # Cloudflare Worker API (hono) + Mongo storage + Groq proxy
shared/         # shared API contracts imported by both sides
tests/          # tsx verification suites (logic / api / groq / render / timer)
skills/         # vendor agent skills (reference only — never deployed)
wrangler.jsonc  # single full-stack deploy: API + SPA assets
MEMORY.md       # agent handoff memory (architecture, gotchas, roadmap)
```

## Notes for deploys

Deploy only `dist/` + the worker bundle through `wrangler deploy` — never the repo root. The
`skills/` folder is planning reference and stays out of any public output (see INSTRUCTIONS.md).
