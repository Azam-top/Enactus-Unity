// Proves the recommended Content-Security-Policy (docs/LAUNCH-CHECKLIST.md) does not break the site:
// the whole UI is exercised under the policy and any CSP violation or console error fails the run.
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const SUPABASE_ORIGIN = 'https://example-ref.supabase.co'
export const CSP = process.env.CSP_OVERRIDE ?? [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  `connect-src 'self' ${SUPABASE_ORIGIN}`,
  "img-src 'self' data:",
  "media-src 'self'",
  "font-src 'self'",
  "style-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ')

const server = spawn('node', ['scripts/serve-compressed.mjs', 'dist', '4176'], { stdio: 'ignore', env: { ...process.env, CSP } })
for (let i = 0; i < 40; i++) { try { if ((await fetch('http://127.0.0.1:4176/ru')).ok) break } catch { /* wait */ } await sleep(150) }

// WebGL is off by default: the Projects ink simulation is GPU work and runs very slowly on a software renderer, which would
// time out full-page screenshots. WEBGL=1 keeps it on. The page must work without WebGL either way (it is tested here).
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome-stable', headless: true, args: process.env.WEBGL === '1' ? [] : ['--disable-3d-apis'] })
const problems = []
try {
for (const [width, height] of [[1440, 900], [390, 844]]) {
  const page = await (await browser.newContext({ viewport: { width, height } })).newPage()
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`pageerror: ${e}`))
  await page.addInitScript(() => { document.addEventListener('securitypolicyviolation', (e) => { (window.__csp ??= []).push(`${e.violatedDirective} ${e.blockedURI}`) }) })
  for (const loc of ['kk', 'ru', 'en']) {
    await page.goto(`http://127.0.0.1:4176/${loc}`, { waitUntil: 'networkidle' })
    for (let y = 0; y < 6000; y += 500) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(50) }
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.getByRole('link', { name: /Share an idea|Поделиться идеей|Идеямен бөлісу/ }).first().click()
    await page.waitForTimeout(500)
    await page.locator('#idea-problem').fill('Проверка политики безопасности контента на кампусе')
    await page.getByRole('button', { name: /Next|Дальше|Әрі қарай/ }).first().click()
    await page.getByRole('button', { name: /Disclosure|Что подтверждено|Не расталған|What is confirmed/ }).first().click().catch(() => undefined)
    if (width < 1024) { await page.evaluate(() => window.scrollTo(0, 0)); await page.getByRole('button', { name: /menu|меню|мәзір/i }).first().click() }
    problems.push(...(await page.evaluate(() => window.__csp ?? [])).map((v) => `CSP violation: ${v}`))
  }
  await page.goto('http://127.0.0.1:4176/ru/privacy', { waitUntil: 'networkidle' })
  problems.push(...(await page.evaluate(() => window.__csp ?? [])).map((v) => `CSP violation: ${v}`))
}
} catch (error) {
  problems.push(`run aborted: ${String(error).split('\n')[0]}`)
} finally {
  await browser.close()
  server.kill()
}
const unique = [...new Set(problems)]
console.log(unique.length ? 'FAIL  ' + unique.join('\n      ') : 'PASS  site runs under the recommended CSP with no violations or console errors (kk/ru/en, desktop + mobile, form, menu, privacy)')
process.exit(unique.length ? 1 : 0)
