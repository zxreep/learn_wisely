/**
 * Password hashing + session tokens using only WebCrypto, so the exact
 * same code runs in Cloudflare Workers (workerd) and in Node 20+ (tests).
 */

const enc = new TextEncoder()

const toHex = (b: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(b as ArrayBuffer)].map((x) => x.toString(16).padStart(2, '0')).join('')

export async function sha256Hex(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(text)))
}

export function randomToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  // base64url-ish hex-free token
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface HashResult {
  hash: string
  salt: string
  iterations: number
}

export async function hashPassword(password: string, iterations = 100_000): Promise<HashResult> {
  const saltBytes = new Uint8Array(16)
  crypto.getRandomValues(saltBytes)
  const salt = toHex(saltBytes)
  const hash = await pbkdf2(password, salt, iterations)
  return { hash, salt, iterations }
}

export async function verifyPassword(
  password: string,
  expected: HashResult,
): Promise<boolean> {
  const hash = await pbkdf2(password, expected.salt, expected.iterations)
  // constant-time compare
  if (hash.length !== expected.hash.length) return false
  let diff = 0
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ expected.hash.charCodeAt(i)
  return diff === 0
}

async function pbkdf2(password: string, saltHex: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const saltBytes = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)))
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations },
    key,
    256,
  )
  return toHex(bits)
}
