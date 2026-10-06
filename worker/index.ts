/**
 * Worker entrypoint: serves /api/* from the Hono app backed by MongoDB Atlas,
 * and everything else from the bundled SPA assets (Workers Static Assets
 * with single-page-application fallback — React Router deep links work).
 */
import { buildApp } from './app'
import { MongoStorage } from './mongo'

interface Env {
  MONGODB_URI: string
  MONGODB_DB?: string
  GROQ_API_KEY?: string
  GROQ_MODEL?: string
  AI_RATE_PER_HOUR?: string
  ASSETS: { fetch: (req: Request) => Promise<Response> }
}

let cachedApp: ReturnType<typeof buildApp> | null = null

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      // cache the app per isolate; bindings are constant for the isolate's life
      cachedApp ??= buildApp(new MongoStorage(env), env)
      return cachedApp.fetch(request)
    }
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
