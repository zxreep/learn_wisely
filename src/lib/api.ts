/**
 * Typed client for the Wisely Cloudflare Worker API (`/api/*`).
 * Same-origin in production (worker serves the SPA + API); in dev, Vite
 * proxies /api → http://localhost:8787 (`npm run worker:dev`).
 * No localhost URLs are ever referenced from browser code.
 */
import type {
  AiGenerateRequest,
  AiGenerateResponse,
  ApiCommunity,
  ApiMessage,
  ApiPresence,
  ApiRoom,
  AuthResponse,
  LeaderboardRow,
  WorkspacePushResult,
  WorkspacePull,
} from '../../shared/api'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
  get isAuth() {
    return this.status === 401
  }
}

let authToken: string | null = null
export function setAuthToken(token: string | null) {
  authToken = token
}

async function req<T>(method: string, path: string, body?: unknown, timeoutMs = 12_000): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(path, {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    throw new ApiError(0, 'network_error', 'Could not reach the server (offline or blocked).')
  }
  clearTimeout(timer)

  let json: any = null
  try {
    json = await res.json()
  } catch {
    throw new ApiError(res.status, 'bad_response', 'Server returned a non-JSON response.')
  }
  if (!res.ok) {
    throw new ApiError(res.status, json?.error ?? `http_${res.status}`, json?.message ?? `Request failed (${res.status})`)
  }
  return json as T
}

export const api = {
  /* -------------------------------- auth -------------------------------- */
  signup: (name: string, password: string, color?: string) =>
    req<AuthResponse>('POST', '/api/auth/signup', { name, password, color }),
  login: (name: string, password: string) => req<AuthResponse>('POST', '/api/auth/login', { name, password }),
  me: () => req<{ user: AuthResponse['user'] }>('GET', '/api/auth/me'),
  logout: () => req<{ ok: boolean }>('POST', '/api/auth/logout'),
  updateProfile: (patch: { name?: string; color?: string; bio?: string }) =>
    req<{ user: AuthResponse['user'] }>('PATCH', '/api/me', patch),

  /* ------------------------------ workspace ------------------------------ */
  pullWorkspace: () => req<{ workspace: WorkspacePull }>('GET', '/api/workspace'),
  pushWorkspace: (payload: { updatedAt: number; deviceId: string; deviceName?: string; data: unknown }) =>
    req<WorkspacePushResult>('PUT', '/api/workspace', payload),

  /* ----------------------------- communities ----------------------------- */
  communities: () => req<{ communities: ApiCommunity[] }>('GET', '/api/communities'),
  joinCommunity: (id: string) => req<{ ok: boolean; memberCount: number }>('POST', `/api/communities/${id}/join`),
  leaveCommunity: (id: string) => req<{ ok: boolean; memberCount: number }>('POST', `/api/communities/${id}/leave`),

  /* -------------------------------- rooms -------------------------------- */
  rooms: () => req<{ rooms: ApiRoom[] }>('GET', '/api/rooms'),
  messages: (roomId: string, after?: number) =>
    req<{ messages: ApiMessage[] }>('GET', `/api/rooms/${roomId}/messages${after ? `?after=${after}` : ''}`),
  sendMessage: (roomId: string, text: string) =>
    req<{ message: ApiMessage }>('POST', `/api/rooms/${roomId}/messages`, { text }),
  heartbeat: (roomId: string, p: { subject: string; focusing: boolean; label?: string }) =>
    req<{ ok: boolean }>('POST', `/api/rooms/${roomId}/presence`, p),
  leaveRoom: (roomId: string) => req<{ ok: boolean }>('DELETE', `/api/rooms/${roomId}/presence`),
  presence: (roomId: string) => req<{ presence: ApiPresence[] }>('GET', `/api/rooms/${roomId}/presence`),

  /* ----------------------------- leaderboard ----------------------------- */
  leaderboard: () => req<{ leaderboard: LeaderboardRow[] }>('GET', '/api/leaderboard'),

  /* --------------------------------- AI ---------------------------------- */
  aiGenerate: (body: AiGenerateRequest) => req<AiGenerateResponse>('POST', '/api/ai/generate', body, 60_000),

  healthz: () => req<{ ok: boolean; ai: boolean; model: string }>('GET', '/api/healthz'),
}
