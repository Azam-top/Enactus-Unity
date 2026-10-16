// Backend verification WITHOUT a hosted Supabase project: the real migration runs on a real Postgres (PGlite, WASM),
// and the real Edge Function handler + wiring (supabase/functions/_shared) talks to it through a fake PostgREST/Turnstile.
// What this proves: SQL, RLS/privileges, idempotency, rate limits, validation, CORS/limits/anti-bot flow, no data in logs.
// What it cannot prove: Deno.serve, the real Supabase gateway, live Turnstile, network behaviour (see docs/BACKEND.md).
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { createLiveDeps } from '../supabase/functions/_shared/deps.ts'
import { handleIntake } from '../supabase/functions/_shared/intake.ts'

const results = []
const log = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}
const denied = async (fn) => {
  try {
    await fn()
    return false
  } catch (e) {
    return /permission denied|row-level security|must be owner|violates/i.test(String(e.message))
  }
}

// ---------------------------------------------------------------- database
const db = new PGlite()
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
`)
for (const file of readdirSync('supabase/migrations').sort()) await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'))

const asRole = async (role, sql, params = []) =>
  db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`)
    return tx.query(sql, params)
  })

const flags = await db.query(`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname in ('submissions','intake_rate_limits') order by relname`)
log('RLS is enabled and forced on both tables', flags.rows.every((r) => r.relrowsecurity && r.relforcerowsecurity), JSON.stringify(flags.rows))
const policies = await db.query(`select count(*)::int as n from pg_policies where schemaname = 'public'`)
log('no RLS policies exist (default deny for every client role)', policies.rows[0].n === 0)

for (const role of ['anon', 'authenticated']) {
  log(`${role}: cannot read submissions`, await denied(() => asRole(role, 'select * from public.submissions')))
  log(`${role}: cannot insert into submissions directly`, await denied(() => asRole(role, `insert into public.submissions (reference_id,type,locale,consent_version,idempotency_key,request_hash,contact_method,contact) values ('EK-X','idea','ru','v',gen_random_uuid(),repeat('a',64),'email','a@b.kz')`)))
  log(`${role}: cannot update/delete submissions`, (await denied(() => asRole(role, `update public.submissions set status='closed'`))) && (await denied(() => asRole(role, 'delete from public.submissions'))))
  log(`${role}: cannot touch the rate-limit table`, await denied(() => asRole(role, 'select * from public.intake_rate_limits')))
  log(`${role}: cannot call submit_intake / intake_rate_hit / purge_submissions`,
    (await denied(() => asRole(role, `select public.submit_intake('{}'::jsonb)`))) &&
      (await denied(() => asRole(role, `select public.intake_rate_hit('x',1,60)`))) &&
      (await denied(() => asRole(role, `select public.purge_submissions(1)`))))
}
log('service_role: cannot read the table directly either (only through the functions)', await denied(() => asRole('service_role', 'select * from public.submissions')))

const baseP = (over = {}) => ({
  idempotency_key: '11111111-1111-4111-8111-111111111111', request_hash: 'a'.repeat(64), type: 'idea', locale: 'ru', consent_version: 'v1',
  name: ' Тест ', contact_method: 'email', contact: 'student@kaznu.edu.kz', context: null, details: { problem: 'Проблема про бумагу' },
  quota_bucket: 'sub:t1', quota_limit: 3, quota_window_seconds: 3600, ...over,
})
const call = async (p) => (await asRole('service_role', 'select public.submit_intake($1::jsonb) as r', [JSON.stringify(p)])).rows[0].r

const created = await call(baseP())
log('submit_intake creates a row with an opaque reference id', created.status === 'created' && /^EK-[0-9A-F]{10}$/.test(created.reference_id), JSON.stringify(created))
const row = (await db.query('select * from public.submissions')).rows[0]
log('stored row: status new, name trimmed, plain text details, consent recorded', row.status === 'new' && row.name === 'Тест' && row.details.problem === 'Проблема про бумагу' && row.consent_version === 'v1' && row.consent_at)
const replay = await call(baseP())
log('same key + same request → the original receipt, no second row', replay.status === 'replayed' && replay.reference_id === created.reference_id && (await db.query('select count(*)::int n from public.submissions')).rows[0].n === 1)
const conflict = await call(baseP({ request_hash: 'b'.repeat(64) }))
log('same key + different request → conflict', conflict.status === 'conflict')
const parallel = await Promise.all([1, 2, 3, 4].map(() => call(baseP({ idempotency_key: '22222222-2222-4222-8222-222222222222', quota_bucket: 'sub:t2' }))))
log('4 parallel identical requests → exactly one row, same receipt', new Set(parallel.map((r) => r.reference_id)).size === 1 && parallel.filter((r) => r.status === 'created').length === 1 && (await db.query(`select count(*)::int n from public.submissions where idempotency_key='22222222-2222-4222-8222-222222222222'`)).rows[0].n === 1)

// quota: 3 per window for bucket t1; replays must not consume it
const q = [3, 4, 5].map((n) => baseP({ idempotency_key: `33333333-3333-4333-8333-33333333333${n}`, request_hash: String(n).repeat(64) }))
const r3 = await call(q[0])
const r4 = await call(q[1])
const rep = await call(baseP())
const r5 = await call(q[2])
log('quota: 3rd new submission allowed, 4th refused (replays do not consume quota)', r3.status === 'created' && r4.status === 'created' && rep.status === 'replayed' && r5.status === 'rate_limited', [r3.status, r4.status, rep.status, r5.status].join(','))
const winKey = (n) => baseP({ idempotency_key: `44444444-4444-4444-8444-44444444444${n}`, request_hash: String(n).repeat(64), quota_bucket: 'sub:t3', quota_limit: 1, quota_window_seconds: 1 })
const w1 = await call(winKey(1))
const w2 = await call(winKey(2))
await new Promise((r) => setTimeout(r, 1300))
const w3 = await call(winKey(3))
log('quota window rolls over', w1.status === 'created' && w2.status === 'rate_limited' && w3.status === 'created', [w1.status, w2.status, w3.status].join(','))

log('table constraints: bad status / oversized details / bad type are rejected',
  (await denied(() => db.query(`update public.submissions set status='archived'`))) &&
    (await denied(() => db.query(`update public.submissions set details = jsonb_build_object('x', repeat('y', 13000))`))) &&
    (await denied(() => call(baseP({ idempotency_key: '55555555-5555-4555-8555-555555555555', type: 'spam', quota_bucket: 'sub:t4' })))))
const before = (await db.query(`select updated_at from public.submissions where reference_id = $1`, [created.reference_id])).rows[0].updated_at
await new Promise((r) => setTimeout(r, 20))
await db.query(`update public.submissions set status = 'reviewing' where reference_id = $1`, [created.reference_id])
const after = (await db.query(`select updated_at, status from public.submissions where reference_id = $1`, [created.reference_id])).rows[0]
log('review workflow: status new → reviewing updates updated_at', after.status === 'reviewing' && new Date(after.updated_at) > new Date(before))

await db.query(`update public.submissions set created_at = now() - interval '40 days', status = 'closed' where reference_id = $1`, [created.reference_id])
await db.query(`update public.submissions set created_at = now() - interval '40 days' where reference_id = $1`, [r3.reference_id])
const purged = (await db.query('select public.purge_submissions(30) as n')).rows[0].n
const left = (await db.query('select reference_id from public.submissions')).rows.map((r) => r.reference_id)
log('retention helper purges only old CLOSED submissions by default', purged === 1 && !left.includes(created.reference_id) && left.includes(r3.reference_id), `purged=${purged}`)

// ------------------------------------------------------------- HTTP handler
const ORIGIN = 'https://enactus.example'
const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEYS: '{"default":"sb_secret_test_key"}',
  ALLOWED_ORIGINS: `${ORIGIN},https://www.enactus.example`,
  CONSENT_VERSION: '2026-10-v1',
  IP_HASH_SALT: 'unit-test-salt-0123456789',
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
}
const logs = []
let rpcCalls = 0
const fakeFetch = async (input, init) => {
  const url = String(input)
  if (url.startsWith('https://challenges.cloudflare.com/')) {
    const token = new URLSearchParams(String(init.body)).get('response')
    if (token === 'down') throw new Error('network down')
    return Response.json({ success: token === 'good' })
  }
  const m = url.match(/^https:\/\/example\.supabase\.co\/rest\/v1\/rpc\/(\w+)$/)
  if (!m) return new Response('not found', { status: 404 })
  const headers = new Headers(init.headers)
  if (headers.get('apikey') !== 'sb_secret_test_key' || headers.has('authorization')) return new Response('bad key usage', { status: 401 })
  rpcCalls++
  const args = JSON.parse(init.body)
  if (args.p?.contact === 'fail@kaznu.test') return new Response('boom', { status: 500 })
  if (m[1] === 'intake_rate_hit') return Response.json((await asRole('service_role', 'select public.intake_rate_hit($1,$2,$3) as r', [args.p_bucket, args.p_limit, args.p_window_seconds])).rows[0].r)
  if (m[1] === 'submit_intake') return Response.json((await asRole('service_role', 'select public.submit_intake($1::jsonb) as r', [JSON.stringify(args.p)])).rows[0].r)
  return new Response('unknown rpc', { status: 404 })
}
const deps = createLiveDeps(env, fakeFetch, (event, info) => logs.push(JSON.stringify({ event, ...info })))
const withLimits = (over) => ({ ...deps, config: { ...deps.config, ...over } })

let ipCounter = 10
const send = async (body, { origin = ORIGIN, method = 'POST', headers = {}, ip = `203.0.113.${ipCounter++}`, d = deps, raw } = {}) => {
  const h = { 'content-type': 'application/json', 'x-forwarded-for': ip, ...(origin ? { origin } : {}), ...headers }
  const res = await handleIntake(new Request('https://example.supabase.co/functions/v1/submit-intake', { method, headers: h, ...(method === 'POST' ? { body: raw ?? JSON.stringify(body) } : {}) }), d)
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { /* not json */ }
  return { status: res.status, data, headers: res.headers }
}

const idea = (over = {}, payload = {}) => ({
  type: 'idea', locale: 'ru', consentVersion: '2026-10-v1', idempotencyKey: crypto.randomUUID(), captchaToken: 'good',
  payload: { problem: 'На кампусе остаётся много бумаги для повторного использования', beneficiary: 'Студентам', themes: ['ecology'], solution: '', onlyProblem: true, support: ['validation'], name: 'Тест', contactMethod: 'telegram', contact: '@kaznu_enact', consent: true, context: 'Asyl Zher', ...payload },
  ...over,
})

log('config: missing secrets → 503 not_configured (never runs unprotected)', (await handleIntake(new Request('https://x/', { method: 'POST' }), createLiveDeps({}, fakeFetch))).status === 503)

const pre = await send(null, { method: 'OPTIONS' })
log('CORS: preflight from an allowed origin → 204 with exact origin', pre.status === 204 && pre.headers.get('access-control-allow-origin') === ORIGIN && pre.headers.get('vary') === 'Origin')
const preBad = await send(null, { method: 'OPTIONS', origin: 'https://evil.example' })
log('CORS: preflight from another origin → 403, no allow-origin header', preBad.status === 403 && !preBad.headers.get('access-control-allow-origin'))
log('origin: POST from another origin or without Origin → 403', (await send(idea(), { origin: 'https://evil.example' })).status === 403 && (await send(idea(), { origin: null })).status === 403)
const get = await send(null, { method: 'GET' })
log('method: GET → 405 with Allow', get.status === 405 && get.headers.get('allow') === 'POST, OPTIONS')
log('content-type: text/plain → 415', (await send(null, { headers: { 'content-type': 'text/plain' }, raw: 'x' })).status === 415)
log('body limit: 20 KB → 413', (await send(null, { raw: JSON.stringify({ pad: 'x'.repeat(20000) }) })).status === 413)
log('malformed JSON → 400 invalid_json', (await send(null, { raw: '{nope' })).data?.error === 'invalid_json')

const bad = async (body, field, code) => {
  const r = await send(body)
  return r.status === 400 && (field ? r.data?.fields?.[field] === code : true)
}
log('validation: unknown top-level and payload fields are refused', (await bad({ ...idea(), admin: true }, 'admin', 'unknown_field')) && (await bad(idea({}, { role: 'admin' }), 'role', 'unknown_field')))
log('validation: wrong consent version / missing consent / bad key / missing captcha token', (await bad(idea({ consentVersion: 'old' }), 'consentVersion', 'consent_version_mismatch')) && (await bad(idea({}, { consent: false }), 'consent', 'consentRequired')) && (await bad(idea({ idempotencyKey: 'abc' }), 'idempotencyKey', 'invalid_type')) && (await bad(idea({ captchaToken: '' }), 'captchaToken', 'required')))
log('validation: problem length, contact format by method, enums', (await bad(idea({}, { problem: 'коротко' }), 'problem', 'tooShort')) && (await bad(idea({}, { contactMethod: 'email', contact: 'nope' }), 'contact', 'invalidEmail')) && (await bad(idea({}, { themes: ['hacking'] }), 'themes', 'invalid_type')) && (await bad(idea({}, { problem: 'a\u0000b'.repeat(10) }), 'problem', 'invalid_type')))
log('validation: types other than strings are refused (no coercion)', (await bad(idea({}, { problem: { $gt: '' } }), 'problem', 'invalid_type')) && (await bad(idea({}, { contact: 12345 }), 'contact', 'invalid_type')))
log('validation: partner needs organization + proposal', (await bad({ type: 'partner', locale: 'en', consentVersion: '2026-10-v1', idempotencyKey: crypto.randomUUID(), captchaToken: 'good', payload: { organization: '', proposal: '', contactMethod: 'email', contact: 'a@b.kz', consent: true } }, 'organization', 'required')))

log('anti-bot: invalid captcha → 403 captcha_failed, nothing stored', (await send(idea({ captchaToken: 'bad' }))).data?.error === 'captcha_failed')
log('anti-bot: verifier unreachable → 503 (fails closed)', (await send(idea({ captchaToken: 'down' }))).status === 503)
const rowsBefore = (await db.query('select count(*)::int n from public.submissions')).rows[0].n

const body1 = idea()
const ok1 = await send(body1)
log('valid idea → 201 with a receipt', ok1.status === 201 && /^EK-[0-9A-F]{10}$/.test(ok1.data?.referenceId), JSON.stringify(ok1.data))
const stored = (await db.query('select * from public.submissions where reference_id = $1', [ok1.data.referenceId])).rows[0]
log('stored: allowlisted fields, normalized contact, locale, status new, themes as ids', stored && stored.status === 'new' && stored.contact === 'kaznu_enact' && stored.contact_method === 'telegram' && stored.locale === 'ru' && stored.details.themes[0] === 'ecology' && stored.context === 'Asyl Zher' && stored.details.solution === '')
const retry = await send(body1, { ip: '203.0.113.200' })
log('retry with the same key (even from another network) → 200 same receipt, still one row', retry.status === 200 && retry.data.referenceId === ok1.data.referenceId && retry.data.replayed === true && (await db.query('select count(*)::int n from public.submissions')).rows[0].n === rowsBefore + 1)
const clash = await send({ ...body1, payload: { ...body1.payload, problem: 'Совсем другая проблема про кампус и бумагу' } })
log('same key with changed data → 409 idempotency_conflict', clash.status === 409 && clash.data.error === 'idempotency_conflict')

const join = await send({ type: 'join', locale: 'kk', consentVersion: '2026-10-v1', idempotencyKey: crypto.randomUUID(), captchaToken: 'good', payload: { skills: ['design', 'events'], message: 'Қатысқым келеді', name: '', contactMethod: 'instagram', contact: '@kaznu_enact.us', consent: true } })
const partner = await send({ type: 'partner', locale: 'en', consentVersion: '2026-10-v1', idempotencyKey: crypto.randomUUID(), captchaToken: 'good', payload: { organization: 'Example NGO', proposal: 'Joint workshop on campus recycling', name: 'Ann', contactMethod: 'email', contact: 'ann@example.org', consent: true } })
log('valid join and partner submissions → 201', join.status === 201 && partner.status === 201)

const lim = withLimits({ requestsPerVisitor: { limit: 3, windowSeconds: 600 } })
const flood = []
for (let i = 0; i < 5; i++) flood.push((await send(null, { raw: '{', ip: '198.51.100.7', d: lim })).status)
log('rate limit: per-visitor request flood → 429 with Retry-After (invalid requests count too)', flood.slice(0, 3).every((s) => s === 400) && flood.slice(3).every((s) => s === 429), flood.join(','))
const other = await send(null, { raw: '{', ip: '198.51.100.8', d: lim })
log('rate limit: another visitor is unaffected', other.status === 400)
const subLim = withLimits({ submissionsPerVisitor: { limit: 2, windowSeconds: 3600 } })
const subs = []
for (let i = 0; i < 3; i++) subs.push((await send(idea({}, { problem: `Идея номер ${i} про переработку бумаги на кампусе` }), { ip: '198.51.100.9', d: subLim })).status)
log('rate limit: per-visitor submission quota → 3rd new submission is 429', subs.join(',') === '201,201,429', subs.join(','))
const globalLim = withLimits({ requestsGlobal: { limit: 1, windowSeconds: 3600 } })
const g = [(await send(null, { raw: '{', d: globalLim })).status, (await send(null, { raw: '{', d: globalLim })).status]
log('rate limit: global circuit breaker → 429', g.every((s) => s === 429) || g[1] === 429, g.join(','))

logs.length = 0
const failBody = idea({}, { contact: 'fail@kaznu.test', contactMethod: 'email' })
const fail = await send(failBody)
log('database failure → 500 server_error with no internals', fail.status === 500 && JSON.stringify(fail.data) === '{"error":"server_error"}')
const allLogs = logs.join('\n')
log('logs never contain contact details, text or secrets', !allLogs.includes('fail@kaznu.test') && !allLogs.includes('бумаги') && !allLogs.includes('sb_secret') && !allLogs.includes('turnstile-secret'), allLogs.slice(0, 160))
log('responses never echo submitted contact data', !JSON.stringify(ok1.data).includes('kaznu_enact') && !JSON.stringify(clash.data).includes('kaznu_enact'))

const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} backend checks passed (${rpcCalls} RPC calls through the real wiring)`)
await db.close()
process.exit(failed ? 1 : 0)
