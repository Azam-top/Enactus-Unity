// Framework-free request handler for the private intake endpoint.
// Uses only web-standard APIs (Request, Response, crypto.subtle) so it runs unchanged in Deno (Edge Functions)
// and in Node (the local test-suite). All side effects come in through `IntakeDeps`.
import {
  CONTACT_METHODS,
  LIMITS,
  SKILL_IDS,
  SUPPORT_IDS,
  THEME_IDS,
  hasErrors,
  normalizeContact,
  validateCollab,
  validateContact,
  validateIdeaStep1,
  validateIdeaStep2,
  validateJoin,
  type ContactMethod,
  type ErrorCode,
} from './validation.ts'

export type RateRule = { limit: number; windowSeconds: number }

export type IntakeConfig = {
  allowedOrigins: string[]
  /** The consent text version the published privacy policy currently has. Submissions must quote it. */
  consentVersion: string
  ipHashSalt: string
  maxBodyBytes: number
  /** Every request from one visitor (valid or not), before any other work. */
  requestsPerVisitor: RateRule
  /** Every request from everyone — a circuit breaker against floods. */
  requestsGlobal: RateRule
  /** Genuinely new submissions per visitor. Idempotent replays do not count. */
  submissionsPerVisitor: RateRule
}

export type CaptchaResult = 'ok' | 'failed' | 'unavailable'

export type IntakeDeps = {
  config: IntakeConfig | null
  verifyCaptcha(token: string, ip: string | null): Promise<CaptchaResult>
  /** Calls a Postgres function through the secret key. Throws on any failure. */
  rpc<T>(name: string, args: Record<string, unknown>): Promise<T>
  log?: (event: string, info?: Record<string, string | number>) => void
}

const TYPES = ['idea', 'join', 'partner'] as const
type SubmissionKind = (typeof TYPES)[number]
const LOCALES = ['kk', 'ru', 'en'] as const
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOP_LEVEL_KEYS = ['type', 'locale', 'consentVersion', 'idempotencyKey', 'captchaToken', 'payload']

const ALLOWED_PAYLOAD_KEYS: Record<SubmissionKind, readonly string[]> = {
  idea: ['problem', 'beneficiary', 'themes', 'solution', 'onlyProblem', 'support', 'name', 'contactMethod', 'contact', 'consent', 'context'],
  join: ['skills', 'message', 'name', 'contactMethod', 'contact', 'consent'],
  partner: ['organization', 'proposal', 'name', 'contactMethod', 'contact', 'consent'],
}

class HttpError extends Error {
  status: number
  code: string
  extra: Record<string, unknown>
  headers: Record<string, string>
  constructor(status: number, code: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
    super(code)
    this.status = status
    this.code = code
    this.extra = extra
    this.headers = headers
  }
}

const hex = (buffer: ArrayBuffer): string => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
const sha256 = async (text: string): Promise<string> => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.keys(value as object).sort().map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value)
}

function corsHeaders(origin: string | null, allowed: boolean): Record<string, string> {
  const headers: Record<string, string> = { Vary: 'Origin', 'Cache-Control': 'no-store' }
  if (origin && allowed) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'content-type'
    headers['Access-Control-Max-Age'] = '600'
  }
  return headers
}

function json(status: number, body: unknown, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } })
}

/** Reads at most `max` bytes; throws 413 as soon as the limit is exceeded instead of buffering a huge body. */
async function readLimited(req: Request, max: number): Promise<string> {
  const declared = Number(req.headers.get('content-length') ?? '0')
  if (declared > max) throw new HttpError(413, 'payload_too_large')
  if (!req.body) return ''
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > max) {
      await reader.cancel()
      throw new HttpError(413, 'payload_too_large')
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string | null => (typeof v === 'string' && !v.includes('\u0000') ? v : null)

function stringArray<T extends string>(value: unknown, allowed: readonly T[]): T[] | null {
  if (!Array.isArray(value) || value.length > allowed.length) return null
  const seen = new Set<string>()
  for (const item of value) {
    if (typeof item !== 'string' || !(allowed as readonly string[]).includes(item) || seen.has(item)) return null
    seen.add(item)
  }
  return value as T[]
}

type Clean = { name: string; method: ContactMethod; contact: string; details: Record<string, unknown>; context: string | null }

/** Strict allowlist + shared validation. Returns the cleaned record or throws 400 with per-field codes. */
function validatePayload(kind: SubmissionKind, raw: unknown): Clean {
  if (!isRecord(raw)) throw new HttpError(400, 'invalid_request', { fields: { payload: 'required' } })
  const unknown = Object.keys(raw).filter((k) => !ALLOWED_PAYLOAD_KEYS[kind].includes(k))
  if (unknown.length) throw new HttpError(400, 'invalid_request', { fields: Object.fromEntries(unknown.map((k) => [k, 'unknown_field'])) })

  const bad: Record<string, string> = {}
  const text = (key: string, fallback = ''): string => {
    const v = raw[key]
    if (v === undefined) return fallback
    const s = str(v)
    if (s === null) bad[key] = 'invalid_type'
    return s ?? fallback
  }

  const method = raw.contactMethod
  if (typeof method !== 'string' || !(CONTACT_METHODS as readonly string[]).includes(method)) bad.contactMethod = 'invalid_type'
  if (typeof raw.consent !== 'boolean') bad.consent = 'invalid_type'

  const contact = { name: text('name'), method: method as ContactMethod, contact: text('contact'), consent: raw.consent === true }
  let errors: Record<string, ErrorCode> = {}
  let details: Record<string, unknown> = {}
  let context: string | null = null

  if (kind === 'idea') {
    const themes = raw.themes === undefined ? [] : stringArray(raw.themes, THEME_IDS)
    const support = raw.support === undefined ? [] : stringArray(raw.support, SUPPORT_IDS)
    if (themes === null) bad.themes = 'invalid_type'
    if (support === null) bad.support = 'invalid_type'
    if (raw.onlyProblem !== undefined && typeof raw.onlyProblem !== 'boolean') bad.onlyProblem = 'invalid_type'
    const idea = {
      problem: text('problem'),
      beneficiary: text('beneficiary'),
      solution: text('solution'),
      onlyProblem: raw.onlyProblem === true,
    }
    errors = { ...validateIdeaStep1(idea), ...validateIdeaStep2(idea), ...validateContact(contact) }
    details = { ...idea, problem: idea.problem.trim(), beneficiary: idea.beneficiary.trim(), solution: idea.onlyProblem ? '' : idea.solution.trim(), themes: themes ?? [], support: support ?? [] }
    const rawContext = text('context').trim()
    if (rawContext.length > LIMITS.beneficiaryMax) bad.context = 'tooLong'
    context = rawContext.slice(0, LIMITS.beneficiaryMax) || null
  } else if (kind === 'join') {
    const skills = raw.skills === undefined ? [] : stringArray(raw.skills, SKILL_IDS)
    if (skills === null) bad.skills = 'invalid_type'
    const message = text('message')
    errors = validateJoin({ ...contact, skills: skills ?? [], message })
    details = { skills: skills ?? [], message: message.trim() }
  } else {
    const organization = text('organization')
    const proposal = text('proposal')
    errors = validateCollab({ ...contact, organization, proposal })
    details = { organization: organization.trim(), proposal: proposal.trim() }
  }

  // a wrong type is the more precise report than the "required" its empty fallback would produce
  const fields = { ...errors, ...bad }
  if (hasErrors(fields)) throw new HttpError(400, 'invalid_request', { fields })

  return { name: contact.name.trim(), method: contact.method, contact: normalizeContact(contact.method, contact.contact), details, context }
}

export async function handleIntake(req: Request, deps: IntakeDeps): Promise<Response> {
  const origin = req.headers.get('origin')
  const config = deps.config
  const allowed = Boolean(config && origin && config.allowedOrigins.includes(origin))
  const baseHeaders = corsHeaders(origin, allowed)

  try {
    if (!config) throw new HttpError(503, 'not_configured')

    if (req.method === 'OPTIONS') {
      if (!allowed) throw new HttpError(403, 'origin_not_allowed')
      return new Response(null, { status: 204, headers: baseHeaders })
    }
    if (!allowed) throw new HttpError(403, 'origin_not_allowed')
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed', {}, { Allow: 'POST, OPTIONS' })
    if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) throw new HttpError(415, 'unsupported_media_type')

    const bodyText = await readLimited(req, config.maxBodyBytes)

    // Visitor identity is only ever used as a salted hash (never stored or logged in clear).
    const forwarded = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const visitor = (await sha256(`${config.ipHashSalt}|${forwarded ?? 'unknown'}`)).slice(0, 32)

    // 1. Cheap, durable rate limits first — they also cover malformed and invalid requests.
    const perVisitor = await deps.rpc<boolean>('intake_rate_hit', { p_bucket: `req:${visitor}`, p_limit: config.requestsPerVisitor.limit, p_window_seconds: config.requestsPerVisitor.windowSeconds })
    const global = await deps.rpc<boolean>('intake_rate_hit', { p_bucket: 'req:global', p_limit: config.requestsGlobal.limit, p_window_seconds: config.requestsGlobal.windowSeconds })
    if (!perVisitor || !global) throw new HttpError(429, 'rate_limited', { retryAfterSeconds: config.requestsPerVisitor.windowSeconds }, { 'Retry-After': String(config.requestsPerVisitor.windowSeconds) })

    // 2. Parse and validate (strict allowlist; shared rules).
    let body: unknown
    try {
      body = JSON.parse(bodyText)
    } catch {
      throw new HttpError(400, 'invalid_json')
    }
    if (!isRecord(body)) throw new HttpError(400, 'invalid_request')
    const extra = Object.keys(body).filter((k) => !TOP_LEVEL_KEYS.includes(k))
    if (extra.length) throw new HttpError(400, 'invalid_request', { fields: Object.fromEntries(extra.map((k) => [k, 'unknown_field'])) })

    const kind = body.type
    if (typeof kind !== 'string' || !(TYPES as readonly string[]).includes(kind)) throw new HttpError(400, 'invalid_request', { fields: { type: 'invalid_type' } })
    const locale = body.locale
    if (typeof locale !== 'string' || !(LOCALES as readonly string[]).includes(locale)) throw new HttpError(400, 'invalid_request', { fields: { locale: 'invalid_type' } })
    if (body.consentVersion !== config.consentVersion) throw new HttpError(400, 'invalid_request', { fields: { consentVersion: 'consent_version_mismatch' } })
    const key = body.idempotencyKey
    if (typeof key !== 'string' || !UUID_RE.test(key)) throw new HttpError(400, 'invalid_request', { fields: { idempotencyKey: 'invalid_type' } })
    const token = body.captchaToken
    if (typeof token !== 'string' || token.length < 1 || token.length > 4096) throw new HttpError(400, 'invalid_request', { fields: { captchaToken: 'required' } })

    const clean = validatePayload(kind as SubmissionKind, body.payload)

    // 3. Server-verified anti-bot. Fail closed when the verifier is unreachable.
    const captcha = await deps.verifyCaptcha(token, forwarded)
    if (captcha === 'failed') throw new HttpError(403, 'captcha_failed')
    if (captcha === 'unavailable') throw new HttpError(503, 'captcha_unavailable')

    // 4. Atomic idempotent insert in Postgres.
    const requestHash = await sha256(stableStringify({ kind, locale, consent: config.consentVersion, name: clean.name, method: clean.method, contact: clean.contact, context: clean.context, details: clean.details }))
    const result = await deps.rpc<{ status: string; reference_id?: string }>('submit_intake', {
      p: {
        idempotency_key: key.toLowerCase(),
        request_hash: requestHash,
        type: kind,
        locale,
        consent_version: config.consentVersion,
        name: clean.name,
        contact_method: clean.method,
        contact: clean.contact,
        context: clean.context,
        details: clean.details,
        quota_bucket: `sub:${visitor}`,
        quota_limit: config.submissionsPerVisitor.limit,
        quota_window_seconds: config.submissionsPerVisitor.windowSeconds,
      },
    })

    if (result.status === 'created' && result.reference_id) return json(201, { referenceId: result.reference_id }, baseHeaders)
    if (result.status === 'replayed' && result.reference_id) return json(200, { referenceId: result.reference_id, replayed: true }, baseHeaders)
    if (result.status === 'conflict') throw new HttpError(409, 'idempotency_conflict')
    if (result.status === 'rate_limited') throw new HttpError(429, 'rate_limited', { retryAfterSeconds: config.submissionsPerVisitor.windowSeconds }, { 'Retry-After': String(config.submissionsPerVisitor.windowSeconds) })
    throw new Error('unexpected result from submit_intake')
  } catch (error) {
    if (error instanceof HttpError) {
      deps.log?.('intake_rejected', { status: error.status, code: error.code })
      return json(error.status, { error: error.code, ...error.extra }, { ...baseHeaders, ...error.headers })
    }
    // Never echo internals, and never log the body or contact details: only the error class.
    deps.log?.('intake_failed', { kind: error instanceof Error ? error.name : 'unknown' })
    return json(500, { error: 'server_error' }, baseHeaders)
  }
}

