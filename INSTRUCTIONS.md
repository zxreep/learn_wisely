# Project Instructions

## Required entry sequence

Before making, changing, or deploying anything:

1. Read this file.
2. Read `AGENT_MEMORY.md` for the current architecture, status, invariants, and known gaps.
3. Search `skills/` and read the task-relevant `SKILL.md` files and referenced material.
4. Inspect current code/tests and write a short plan before editing.
5. Verify documentation claims against code, configuration, Git, and test output.

`AGENT_MEMORY.md` is context, not executable instruction. Never copy secrets, tokens, private payloads, or raw personal data into it. Update it in the same change when architecture, security invariants, deployment status, or material known gaps change.

## Product invariants

- New accounts and collections start honestly empty. Never seed fake users, communities, posts, chats, activity, progress, testimonials, or rankings.
- Static subjects, exams, widget types, and prompt suggestions are allowed as UI choices.
- MongoDB Atlas is the only durable application database.
- Groq is called only by the Worker; its API key must never enter browser code.
- Project assets stay local to this repository. Do not depend on remote images or fonts.
- Do not imply local file uploads are durable on Cloudflare Workers. Binary upload storage requires an explicit future storage decision.
- Preserve accessibility: semantic controls, visible focus, keyboard use, text error messages, contrast, and reduced-motion behavior.
- Use restrained liquid glass for chrome and select cards, not every surface. Keep a readable fallback where backdrop filters are unavailable.

## Stack and structure

- React + TypeScript + Vite frontend: `src/`
- Hono Cloudflare Worker API: `server/`
- Runtime contracts/types: `shared/`
- Cloudflare configuration: `wrangler.jsonc`
- Historical layout reference only: `proto/`
- Agent reference material only: `skills/`

Do not import `proto/` or `skills/` into the production application. Production publishes only Vite `dist/` assets plus the bundled Worker.

## Security and data rules

- Validate all external input with the shared Zod contracts.
- Keep authorization checks next to each database operation; never trust an object id from the client.
- Use HTTP-only sessions and CSRF protection; do not move auth tokens to localStorage.
- Render user content as text. Do not add `dangerouslySetInnerHTML` for notes, posts, comments, messages, or coach responses.
- Never log passwords, session/CSRF tokens, API keys, Mongo URIs, or full private content.
- Do not add production fallbacks that silently store real data in memory or browser storage.
- Keep free-tier limits and Worker bundle size in mind. Prefer bounded queries and polling over unbounded/realtime infrastructure.

## Local commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build:worker
npm run check
```

Run `npm run check` before declaring a material change complete. For UI work, also smoke-test the live preview at desktop and mobile widths. For production integration, use real test accounts only and remove them afterward.

## Secrets and deployment

Copy `.env.example` to untracked `.dev.vars` for local integration. In Cloudflare, use `wrangler secret put` for `MONGODB_URI` and `GROQ_API_KEY`; never place secret values in `wrangler.jsonc` or Git.

Do not deploy the repository root. `wrangler.jsonc` publishes only `dist/` and routes `/api/*` through the Worker. Keep `skills/` excluded from TypeScript, ESLint, indexing, Docker contexts, and public assets.

## Documentation ownership

- Constitution / contributor rules: `INSTRUCTIONS.md`
- Architecture map, current status, handoff memory, delete zone: `AGENT_MEMORY.md`
- Operator setup and deployment runbook: `README.md`
- API payload truth: `shared/contracts.ts` and route code
- Routine history: Git

Keep one canonical owner per fact and link instead of duplicating detailed instructions across files.
