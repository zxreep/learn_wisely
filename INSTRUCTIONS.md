# Project Instructions

## Skills-first planning rule

**Before making, changing, or deploying anything in this repository, check the `skills/` folder first and use the most relevant skill files to make a short plan.**

Suggested workflow:

1. Identify the task type.
2. Search `skills/` for relevant guidance.
3. Read the matching `SKILL.md` files and any referenced files.
4. Write a brief plan before editing or building.
5. Only then implement the change.

This keeps work aligned with the imported skill library and avoids starting from scratch when existing guidance is available.

## Deployment protection for `skills/`

The `skills/` folder is reference content for planning and agent guidance. It should be kept in Git, but it should **not** be included in public deployment output unless explicitly required.

Primary rule:

> Do not deploy the repository root. Deploy only the application build output directory, such as `dist/`, `build/`, `.next/`, or the framework-specific publish folder.

This keeps deployments lightweight and prevents reference-only files from being publicly served.

## Cloudflare Pages / Workers

For Cloudflare, configure the project to publish only the build output directory.

Example `wrangler.jsonc` static assets configuration:

```jsonc
{
  "name": "learn-wisely",
  "compatibility_date": "2026-10-05",
  "assets": {
    "directory": "./dist"
  }
}
```

If the build process accidentally copies `skills/` into the assets directory, add an `.assetsignore` file inside the published assets directory, for example `dist/.assetsignore`:

```gitignore
skills/
skills/**
```

For Cloudflare Git deployments, configure Build watch paths to avoid unnecessary builds when only `skills/` changes:

```text
Exclude path: skills/*
```

Build-watch exclusions reduce unnecessary builds, but they are not the main security boundary. The real protection is ensuring `skills/` is not inside the published output folder.

## Vercel

Add a root `.vercelignore` if deploying with Vercel:

```gitignore
skills/
skills/**
```

For stricter deployments, use an allowlist-style `.vercelignore` and explicitly include only the files required to build and run the app.

Example template:

```gitignore
/*
!package.json
!package-lock.json
!pnpm-lock.yaml
!yarn.lock
!src/**
!public/**
!app/**
!pages/**
!components/**
!vite.config.*
!next.config.*
!tsconfig.json
```

Adjust the allowlist for the actual framework and project structure.

## Netlify

Use a publish directory instead of deploying the repo root.

Example `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

To skip builds when only `skills/` changes, add an ignore command:

```toml
[build]
  command = "npm run build"
  publish = "dist"
  ignore = "git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- . ':(exclude)skills/**'"
```

## Docker-based platforms

For Docker, Railway, Render, Fly.io, and similar platforms, add `skills/` to `.dockerignore` so the Docker build context remains small.

Example `.dockerignore`:

```gitignore
skills/
skills/**
.git/
node_modules/
dist/
build/
coverage/
```

## Tooling excludes

If the project uses TypeScript, linting, formatting, or indexing tools, exclude `skills/` where appropriate so those tools do not scan reference-only files.

Example `tsconfig.json`:

```json
{
  "exclude": ["node_modules", "skills"]
}
```

Example ESLint flat config:

```js
export default [
  {
    ignores: ["skills/**"]
  }
]
```

## Final reminder

Before building anything:

> Use the skills first. Search the `skills/` folder, choose the relevant skill, make a plan, and then implement.
