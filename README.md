# Wisely — a local-first digital study workspace

Wisely is a cohesive study home for students: customizable **study boards**, a **library** with
integrated on-device **AI**, a **Focus Mode** timer, **gamified progress** (XP, streaks, badges,
quests), a **Discover** catalog of shared content, **communities & study rooms** — all local-first,
so everything keeps working offline and syncs when you reconnect.

Built with **Vite + React 18 + TypeScript**, **Tailwind CSS** (design-token theming),
**Zustand** with `persist` for local-first state, **React Router**, **Framer Motion** and
**Lucide** icons. No backend required.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks, then bundles to dist/
npm run preview    # serve the production build
```

## Feature map

| Area | What you get |
| --- | --- |
| **Dashboard** | Daily-goal ring, streak, due flashcards, today's quests, week chart, "Ask Wisely" shortcuts, jump-back-in lists |
| **Study boards** | Unlimited kanban boards: drag & drop cards, columns CRUD, due dates, priorities, tags, linked notes, done = XP |
| **Library** | Folders, markdown-lite notes with autosave editor + preview, file shelf (small files stored offline), flashcard decks |
| **On-device AI** | Summarize notes, generate flashcards (definition/date/cloze extraction), multiple-choice quizzes, "explain" and "ask" over your own library — zero network calls, works on a plane |
| **Flashcards** | Spaced repetition (SM-2 lite): Again/Hard/Good/Easy rescheduling, due queues, deck mastery %, keyboard study (Space, 1–4) |
| **Focus Mode** | Pomodoro / deep-work / sprint / custom timer with breaks & cycles, deadline-based engine that survives navigation and reloads, generated ambient soundscapes (rain, brown noise, forest), zen overlay |
| **Progress** | XP & levels, streak (current/longest), 14 badges, daily + weekly quests, activity heatmap, 7-day charts, XP feed |
| **Discover** | Starter boards, shared decks (real card content) and note packs you clone into your workspace |
| **Communities** | Join/leave circles with activity feeds, study rooms with live presence and chat, weekly XP leaderboard with your real stats |
| **Offline & sync** | `navigator.onLine` tracking, offline banner, queued-change counter, debounced simulated sync, manual "Sync now", backup export/import (JSON) |

## Local-first architecture

Every write lands in `localStorage` instantly via Zustand `persist` ("wisely-*" keys). The sync
engine keeps a pending-changes queue that drains when online — the same contract a future
multi-device backend will satisfy. The focus timer is deadline-based (`endAt` timestamps), so it
stays accurate in background tabs and across navigation.

The AI assistant (`src/lib/ai.ts`) is fully local extractive NLP: term-frequency scoring,
definition-pattern detection and cloze deletion over your notes. That is a deliberate product
choice — a student's notes never leave the device.

## Project layout

```
src/
  components/   layout shell, UI primitives, charts, command palette, AI drawer, quiz runner
  hooks/        useAmbient (WebAudio soundscapes)
  lib/          utils, dates, on-device AI engine, templates, seed data, audio chimes
  pages/        Dashboard, Boards, BoardDetail, Library, FocusPage, Progress, Discover, Community, Settings
  stores/       zustand stores: settings, sync, progress (gamification), library, boards, focus, community, ui, toast
```

## Notes for deploys

Publish only `dist/` (see `INSTRUCTIONS.md`). Ready-made configs included for Cloudflare
(`wrangler.jsonc`), Netlify (`netlify.toml`), Vercel (`vercel.json` + `.vercelignore`) and
Docker (`.dockerignore`) — all excluding the reference-only `skills/` folder.
