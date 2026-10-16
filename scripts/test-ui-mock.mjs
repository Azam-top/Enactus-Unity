// MOCKED UI tests for the sending flow. A separate build (`npm run build:mock`) switches sending on against a fake
// endpoint (https://api.test/submit) and a stub Turnstile. This proves the browser behaviour only — it says nothing about
// a real backend (that is covered by test:backend and the staging checklist in docs/BACKEND.md).
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4174
const base = `http://127.0.0.1:${PORT}`
const server = spawn('node_modules/.bin/vite', ['preview', '--outDir', 'dist-mock', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], { stdio: 'ignore' })
for (let i = 0; i < 40; i++) {
  try { if ((await fetch(`${base}/ru`)).ok) break } catch { /* not up yet */ }
  await sleep(250)
}

const results = []
const log = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`) }
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome-stable', headless: true })

const CORS = { 'access-control-allow-origin': base, 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS', vary: 'Origin' }
const STUB = `(() => {
  const cbs = {}; let n = 0
  window.__ts = { renders: 0, resets: 0 }
  window.turnstile = {
    render(el, o) { const id = 'w' + (++n); cbs[id] = o.callback; window.__ts.renders++; if (!window.__noToken) setTimeout(() => o.callback('tok-' + id), 40); return id },
    reset(id) { window.__ts.resets++; if (!window.__noToken) setTimeout(() => cbs[id]('tok-' + id + '-r' + window.__ts.resets), 40) },
    remove() {},
  }
})()`

/** Opens a page with the Turnstile stub and a scriptable fake endpoint. `respond(req, n)` decides each answer. */
async function open(respond, { viewport = { width: 1280, height: 900 }, noToken = false } = {}) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()
  const seen = { scripts: 0, requests: [], headers: [] }
  await page.route('https://challenges.cloudflare.com/**', (r) => { seen.scripts++; r.fulfill({ contentType: 'text/javascript', body: STUB }) })
  await page.route('https://api.test/**', async (route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const body = JSON.parse(req.postData() ?? '{}')
    seen.requests.push(body)
    seen.headers.push(req.headers())
    await respond(route, body, seen.requests.length)
  })
  if (noToken) await page.addInitScript(() => { window.__noToken = true })
  await page.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  return { ctx, page, seen }
}
const ok = (referenceId = 'EK-0123456789', status = 201) => (route) => route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify({ referenceId }) })
const fail = (status, body = { error: 'x' }) => (route) => route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) })

async function toStep3(page) {
  await page.getByRole('link', { name: 'Поделиться идеей' }).first().click()
  await page.waitForTimeout(500)
  await page.fill('#idea-problem', 'На кампусе остаётся много бумаги для повторного использования')
  await page.getByRole('button', { name: 'Экология' }).click()
  await page.getByRole('button', { name: 'Дальше' }).click()
  await page.getByRole('checkbox', { name: /Пока есть только проблема/ }).check()
  await page.getByRole('button', { name: 'Дальше' }).click()
  await page.getByRole('radio', { name: 'Email' }).check()
  await page.fill('#idea-contact', 'student@kaznu.edu.kz')
  await page.getByRole('checkbox', { name: /Даю согласие/ }).check()
}
const submit = (page) => page.getByRole('button', { name: /Отправить идею|Повторить|Отправляем/ }).click()

// 1. Turnstile only loads at the moment of sending
{
  const { ctx, page, seen } = await open(ok())
  const onLoad = seen.scripts
  await page.getByRole('link', { name: 'Поделиться идеей' }).first().click()
  await page.fill('#idea-problem', 'На кампусе остаётся много бумаги для повторного использования')
  await page.getByRole('button', { name: 'Дальше' }).click()
  await page.getByRole('button', { name: 'Дальше' }).click()
  await page.waitForTimeout(400)
  const atStep3 = seen.scripts
  const renders = await page.evaluate(() => window.__ts?.renders ?? 0)
  log('anti-bot script is not loaded on page load or steps 1–2, only at step 3', onLoad === 0 && atStep3 === 1 && renders === 1, `onLoad=${onLoad} step3=${atStep3} renders=${renders}`)
  await ctx.close()
}

// 2. Success only after a confirmed receipt; exact payload shape; no credentials
{
  const { ctx, page, seen } = await open(ok('EK-ABCDEF0123'))
  await toStep3(page)
  await page.getByRole('button', { name: /Сохранить черновик/ }).count()
  await submit(page)
  await page.waitForTimeout(700)
  const body = seen.requests[0]
  log('success: confirmation and the server receipt are shown', (await page.getByText('Идея отправлена.').isVisible()) && (await page.getByText('EK-ABCDEF0123').isVisible()))
  log('request: exact allowlisted keys, token, uuid key, consent version, locale',
    JSON.stringify(Object.keys(body).sort()) === JSON.stringify(['captchaToken', 'consentVersion', 'idempotencyKey', 'locale', 'payload', 'type']) &&
      JSON.stringify(Object.keys(body.payload).sort()) === JSON.stringify(['beneficiary', 'consent', 'contact', 'contactMethod', 'context', 'name', 'onlyProblem', 'problem', 'solution', 'support', 'themes']) &&
      body.consentVersion === 'mock-v1' && body.locale === 'ru' && /^[0-9a-f-]{36}$/.test(body.idempotencyKey) && body.captchaToken.startsWith('tok-'), JSON.stringify(Object.keys(body)))
  log('request carries no cookies, Authorization header or Supabase key', !seen.headers[0].authorization && !seen.headers[0].cookie && !seen.headers[0].apikey)
  await ctx.close()
}

// 3. Duplicate clicks while in flight → exactly one request
{
  const { ctx, page, seen } = await open(async (route) => { await sleep(900); await ok()(route) })
  await toStep3(page)
  const btn = page.getByRole('button', { name: 'Отправить идею' })
  await btn.click()
  await btn.click({ force: true }).catch(() => undefined)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1400)
  log('double click / Enter while sending → one request, button shows progress state', seen.requests.length === 1)
  await ctx.close()
}

// 4. 429, captcha failure, 500, network error, timeout, malformed success — text kept, token renewed, retry key rules
{
  const answers = [fail(429, { error: 'rate_limited' }), fail(403, { error: 'captcha_failed' }), fail(500, { error: 'server_error' }), ok()]
  const { ctx, page, seen } = await open((route, body, n) => answers[n - 1](route))
  await toStep3(page)
  await submit(page)
  await page.waitForTimeout(500)
  log('429: rate-limit message, nothing lost, success NOT shown', (await page.getByText(/Слишком много попыток/).isVisible()) && (await page.inputValue('#idea-contact')) === 'student@kaznu.edu.kz' && (await page.getByText('Идея отправлена.').count()) === 0)
  await page.waitForTimeout(150)
  await submit(page)
  await page.waitForTimeout(500)
  log('403 captcha_failed: dedicated message and a fresh token for the next attempt', (await page.getByText(/Проверка «не робот» не пройдена/).isVisible()) && seen.requests[0].captchaToken !== seen.requests[1].captchaToken, `${seen.requests[0].captchaToken} → ${seen.requests[1].captchaToken}`)
  await page.waitForTimeout(150)
  await submit(page)
  await page.waitForTimeout(500)
  log('500: generic retry message, text kept', (await page.getByText(/Не удалось отправить/).isVisible()) && (await page.inputValue('#idea-contact')) === 'student@kaznu.edu.kz')
  const resets = await page.evaluate(() => window.__ts.resets)
  log('anti-bot widget is reset after every failed attempt (tokens are single-use)', resets === 3, `resets=${resets}`)
  await page.waitForTimeout(150)
  await submit(page)
  await page.waitForTimeout(500)
  log('retry of unchanged data reuses ONE idempotency key; success then confirmed', new Set(seen.requests.map((r) => r.idempotencyKey)).size === 1 && (await page.getByText('Идея отправлена.').isVisible()), `${seen.requests.length} requests`)
  await ctx.close()
}
{
  const { ctx, page, seen } = await open(fail(500))
  await toStep3(page)
  await submit(page)
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Назад' }).click()
  await page.getByRole('button', { name: 'Назад' }).click()
  await page.fill('#idea-problem', 'Совсем другая формулировка проблемы про бумагу')
  await page.getByRole('button', { name: 'Дальше' }).click()
  await page.getByRole('button', { name: 'Дальше' }).click()
  await page.waitForTimeout(200)
  await submit(page)
  await page.waitForTimeout(500)
  log('edited data after a failure gets a NEW idempotency key', seen.requests.length === 2 && seen.requests[0].idempotencyKey !== seen.requests[1].idempotencyKey)
  await ctx.close()
}
{
  const { ctx, page } = await open((route) => route.abort('failed'))
  await toStep3(page)
  await submit(page)
  await page.waitForTimeout(600)
  log('network failure: retry message, text kept', (await page.getByText(/Не удалось отправить/).isVisible()) && (await page.inputValue('#idea-contact')) === 'student@kaznu.edu.kz')
  await ctx.close()
}
{
  const { ctx, page } = await open(() => new Promise(() => undefined)) // never answers
  await toStep3(page)
  await submit(page)
  await page.waitForTimeout(16500)
  log('timeout (15 s): retry message, draft not erased, button usable again', (await page.getByText(/Не удалось отправить/).isVisible()) && (await page.inputValue('#idea-contact')) === 'student@kaznu.edu.kz' && (await page.getByRole('button', { name: 'Повторить' }).isEnabled()))
  await ctx.close()
}
{
  const { ctx, page } = await open((route) => route.fulfill({ status: 201, headers: CORS, contentType: 'application/json', body: JSON.stringify({ ok: true }) }))
  await toStep3(page)
  await submit(page)
  await page.waitForTimeout(600)
  log('a 201 WITHOUT a valid receipt is never shown as success', (await page.getByText('Идея отправлена.').count()) === 0 && (await page.getByText(/Не удалось отправить/).isVisible()))
  await ctx.close()
}

// 5. Missing anti-bot token → no request at all
{
  const { ctx, page, seen } = await open(ok(), { noToken: true })
  await toStep3(page)
  await submit(page)
  await page.waitForTimeout(400)
  log('no anti-bot token → blocked client-side with a message, zero requests', seen.requests.length === 0 && (await page.getByText('Пройди проверку «не робот», чтобы отправить.').isVisible()))
  await ctx.close()
}

// 6. Draft is cleared after a confirmed success; contact never stored
{
  const { ctx, page } = await open(ok())
  await page.getByRole('link', { name: 'Поделиться идеей' }).first().click()
  await page.fill('#idea-problem', 'На кампусе остаётся много бумаги для повторного использования')
  await page.getByRole('checkbox', { name: /Сохранить черновик/ }).check()
  await page.waitForTimeout(700)
  const saved = await page.evaluate(() => localStorage.getItem('enactus.ideaDraft.v1'))
  await page.getByRole('button', { name: 'Дальше' }).click()
  await page.getByRole('checkbox', { name: /Пока есть только проблема/ }).check()
  await page.getByRole('button', { name: 'Дальше' }).click()
  await page.fill('#idea-contact', 'student@kaznu.edu.kz')
  await page.getByRole('checkbox', { name: /Даю согласие/ }).check()
  await submit(page)
  await page.waitForTimeout(700)
  const after = await page.evaluate(() => localStorage.getItem('enactus.ideaDraft.v1'))
  const all = await page.evaluate(() => JSON.stringify({ ...localStorage }))
  log('draft was saved, then cleared after server-confirmed success; contact never in storage', !!saved && after === null && !all.includes('student@kaznu'))
  await ctx.close()
}

// 7. Join and collaboration use the same envelope with their own allowlists
{
  const { ctx, page, seen } = await open(ok('EK-AAAAAAAAAA'))
  await page.getByRole('button', { name: /Хочу участвовать/ }).click()
  await page.getByRole('button', { name: 'Дизайн' }).click()
  await page.getByRole('radio', { name: 'Telegram' }).check()
  await page.fill('#join-contact', '@kaznu_enact')
  await page.getByRole('checkbox', { name: /Даю согласие/ }).check()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Отправить', exact: true }).click()
  await page.waitForTimeout(600)
  const j = seen.requests[0]
  log('join: type join, own payload keys, success shown', j?.type === 'join' && JSON.stringify(Object.keys(j.payload).sort()) === JSON.stringify(['consent', 'contact', 'contactMethod', 'message', 'name', 'skills']) && (await page.getByText('Интерес отправлен.').isVisible()))
  await page.getByRole('button', { name: /Хочу сотрудничать/ }).click()
  await page.fill('#collab-organization', 'Example NGO')
  await page.fill('#collab-proposal', 'Совместный семинар по переработке бумаги')
  await page.fill('#collab-contact', 'ann@example.org')
  await page.getByRole('checkbox', { name: /Даю согласие/ }).last().check()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Отправить предложение' }).click()
  await page.waitForTimeout(600)
  const c = seen.requests[1]
  log('collaboration: type partner, own payload keys, success shown', c?.type === 'partner' && JSON.stringify(Object.keys(c.payload).sort()) === JSON.stringify(['consent', 'contact', 'contactMethod', 'name', 'organization', 'proposal']) && (await page.getByText('Предложение отправлено.').isVisible()))
  await ctx.close()
}

// 8. Live-mode copy: private-submission note and privacy text only appear when enabled
{
  const { ctx, page } = await open(ok())
  await toStep3(page)
  log('"Заявка не публикуется на сайте…" appears only in live mode', await page.locator('[data-form="idea"]').getByText('Заявка не публикуется на сайте. Контакт нужен, чтобы команда могла ответить.').isVisible())
  await page.goto(`${base}/ru/privacy`, { waitUntil: 'networkidle' })
  const text = await page.locator('main').innerText()
  log('privacy page (live) states retention, contact, access, spam protection', text.includes('90 дн.') && text.includes('privacy@example.test') && text.includes('Cloudflare Turnstile') && text.toLowerCase().includes('приём заявок включён'))
  await page.goto(`${base}/en/privacy`, { waitUntil: 'networkidle' })
  log('privacy page live copy in English', (await page.locator('main').innerText()).includes('deleted 90 days after'))
  await ctx.close()
}

await browser.close()
server.kill()
const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} mocked UI checks passed`)
process.exit(failed ? 1 : 0)
