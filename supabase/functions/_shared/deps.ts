// Production wiring for the intake handler: environment -> config, PostgREST RPC and Turnstile verification.
// `fetchImpl` is injectable so the whole chain can be exercised locally against a real Postgres (PGlite).
import type { CaptchaResult, IntakeConfig, IntakeDeps } from './intake.ts'

type Env = Record<string, string | undefined>

const DEFAULTS = {
  maxBodyBytes: 16 * 1024,
  requestsPerVisitor: { limit: 20, windowSeconds: 600 },
  requestsGlobal: { limit: 400, windowSeconds: 3600 },
  submissionsPerVisitor: { limit: 5, windowSeconds: 3600 },
} as const

/** Returns null when a required secret is missing, so the endpoint answers 503 instead of running unprotected. */
export function readConfig(env: Env): IntakeConfig | null {
  const origins = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const consentVersion = env.CONSENT_VERSION?.trim()
  const salt = env.IP_HASH_SALT?.trim()
  if (!origins.length || !consentVersion || !salt || salt.length < 16 || !env.TURNSTILE_SECRET_KEY) return null
  return { allowedOrigins: origins, consentVersion, ipHashSalt: salt, ...DEFAULTS }
}

/** Secret keys (sb_secret_…) are not JWTs and go on `apikey` only; legacy service_role JWTs also need Bearer. */
function authHeaders(key: string): Record<string, string> {
  return key.startsWith('eyJ') ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key }
}

export function readSecretKey(env: Env): string | null {
  if (env.SUPABASE_SECRET_KEYS) {
    try {
      const parsed = JSON.parse(env.SUPABASE_SECRET_KEYS) as Record<string, string>
      if (parsed.default) return parsed.default
    } catch {
      /* fall through to the legacy variable */
    }
  }
  return env.SUPABASE_SERVICE_ROLE_KEY ?? null
}

export function createLiveDeps(env: Env, fetchImpl: typeof fetch = fetch, log?: IntakeDeps['log']): IntakeDeps {
  const url = env.SUPABASE_URL?.replace(/\/$/, '')
  const secretKey = readSecretKey(env)
  const config = url && secretKey ? readConfig(env) : null

  return {
    config,
    log,
    async rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
      const response = await fetchImpl(`${url}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(secretKey ?? '') },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) throw new Error(`rpc ${name} failed with ${response.status}`)
      return (await response.json()) as T
    },
    async verifyCaptcha(token: string, ip: string | null): Promise<CaptchaResult> {
      try {
        const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY ?? '', response: token })
        if (ip) form.set('remoteip', ip)
        const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: form,
          signal: AbortSignal.timeout(5000),
        })
        if (!response.ok) return 'unavailable'
        const result = (await response.json()) as { success?: boolean }
        return result.success === true ? 'ok' : 'failed'
      } catch {
        return 'unavailable'
      }
    },
  }
}
