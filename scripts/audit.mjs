// Phase 4 audit: accessibility (axe-core, WCAG 2.1 A/AA + best practice), target sizes, zoom, focus, hash-load reveals,
// and lab performance (CDP-throttled). Run against the preview build: `npm run build && npm run preview`, then `npm run audit`.
import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const base = process.env.BASE_URL ?? 'http://127.0.0.1:4173'
const axeSource = readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
mkdirSync('screenshots', { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome-stable', headless: true })
const report = { axe: [], targets: [], misc: [], perf: [] }
let failures = 0
const note = (name, ok, detail = '') => { if (!ok) failures++; report.misc.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`) }

async function settle(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < h; y += 400) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(60) }
  await page.waitForTimeout(600)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
}

async function runAxe(page, label) {
  await page.evaluate(axeSource)
  const res = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }))
  const violations = res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(0, 2).join(' | ')) }))
  report.axe.push({ label, violations })
  if (violations.length) failures += violations.length
  console.log(`${violations.length ? 'FAIL' : 'PASS'}  axe: ${label} — ${violations.length} violation(s), ${res.passes.length} rules passed`)
  for (const v of violations) console.log(`        [${v.impact}] ${v.id}: ${v.help}\n          ${v.nodes.join('\n          ')}`)
}

// ---- 1. axe across locales, viewports and states
for (const loc of ['kk', 'ru', 'en']) {
  for (const [name, width, height] of [['mobile-390', 390, 844], ['desktop-1440', 1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width, height } })
    const page = await ctx.newPage()
    await page.goto(`${base}/${loc}`, { waitUntil: 'networkidle' })
    await settle(page)
    await runAxe(page, `${loc} ${name} home`)
    if (loc === 'ru') {
      // open form states
      await page.getByRole('link', { name: 'Поделиться идеей' }).first().click()
      await page.waitForTimeout(700)
      await page.getByRole('button', { name: 'Дальше' }).click() // shows the required error
      await page.waitForTimeout(250)
      await runAxe(page, `${loc} ${name} idea step 1 with error`)
      await page.fill('#idea-problem', 'На кампусе остаётся много бумаги для повторного использования')
      await page.getByRole('button', { name: 'Дальше' }).click()
      await page.getByRole('button', { name: 'Дальше' }).click()
      await page.getByRole('button', { name: 'Отправить идею' }).click()
      await page.waitForTimeout(250)
      await runAxe(page, `${loc} ${name} idea step 3 with errors`)
      await page.getByRole('button', { name: /Хочу участвовать/ }).click()
      await runAxe(page, `${loc} ${name} join form`)
      if (width < 1024) {
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.getByRole('button', { name: 'Открыть меню' }).click()
        await runAxe(page, `${loc} ${name} mobile menu open`)
      }
      await page.goto(`${base}/${loc}/privacy`, { waitUntil: 'networkidle' })
      await runAxe(page, `${loc} ${name} privacy page`)
    }
    await ctx.close()
  }
}

// ---- 2. Target sizes (WCAG 2.5.8 AA minimum 24px; project target 44px) for standalone controls
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await settle(page)
  await page.getByRole('link', { name: 'Поделиться идеей' }).first().click()
  await page.waitForTimeout(600)
  const small = await page.evaluate(() => {
    const out = []
    document.querySelectorAll('a[href], button, input:not([type=hidden]), textarea, summary, [role=button]').forEach((el) => {
      if (el.closest('[hidden]') || el.closest('[inert]') || el.closest('.skip-link') && !el.matches(':focus')) return
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') return
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      const isInline = el.tagName === 'A' && cs.display === 'inline' && el.closest('p, li, span, address')
      if (isInline) return
      if (el.type === 'radio' || el.type === 'checkbox') { const l = el.closest('label'); if (l) { const lr = l.getBoundingClientRect(); if (lr.height >= 44) return } }
      if (r.height < 44 || r.width < 44) out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 28)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
    })
    return out
  })
  report.targets = small
  note('standalone controls are ≥ 44×44 px on a 390px phone', small.length === 0, small.slice(0, 8).join(' | '))
  await ctx.close()
}

// ---- 3. 200% zoom equivalent (reflow): 1440×900 at 200% == 720×450 CSS px; and 320px at 4x scale == 1280 → check 320 wide
for (const loc of ['ru', 'kk']) {
  const ctx = await browser.newContext({ viewport: { width: 720, height: 450 } })
  const page = await ctx.newPage()
  await page.goto(`${base}/${loc}`, { waitUntil: 'networkidle' })
  await settle(page)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const header = await page.evaluate(() => document.querySelector('header').getBoundingClientRect().height)
  note(`${loc}: 200% zoom (720×450 CSS px) reflows without horizontal scroll; sticky header stays small`, overflow <= 0 && header <= 80, `overflow=${overflow} header=${Math.round(header)}px of 450`)
  await ctx.close()
}

// ---- 4. Keyboard: every focus stop shows a visible indicator; order reaches primary actions
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  const stops = []
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const cs = getComputedStyle(el)
      const visible = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || cs.boxShadow !== 'none'
      return { tag: el.tagName.toLowerCase(), name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30), visible, y: Math.round(el.getBoundingClientRect().top) }
    })
    if (info) stops.push(info)
  }
  const invisible = stops.filter((s) => !s.visible)
  note('keyboard: all focus stops show a visible focus indicator', invisible.length === 0, invisible.map((s) => `${s.tag}:${s.name}`).slice(0, 6).join(' | '))
  note('keyboard: reaches header CTA, hero CTAs and the path buttons within the first 60 tabs', ['Поделиться идеей', 'Посмотреть проекты', 'У меня есть идея'].every((n) => stops.some((s) => s.name.includes(n))), `${stops.length} stops`)
  await ctx.close()
}

// ---- 5. Landing deep inside the page: no reveal may stay hidden (opacity 0) after scrolling the whole page
for (const hash of ['#story', '#contact', '#team']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${base}/ru${hash}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await settle(page)
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal],[data-settle]')].filter((el) => Number(getComputedStyle(el).opacity) < 0.99).map((el) => el.id || el.className.toString().slice(0, 30)))
  note(`deep link ${hash}: every revealed block ends fully visible after scrolling the page`, hidden.length === 0, hidden.slice(0, 5).join(', '))
  await ctx.close()
}

// ---- 6. Lab performance (CPU 4x slower, Slow-4G-like network, 390×844). Medians of 3 cold loads, against a gzip server.
const perfBase = 'http://127.0.0.1:4175'
const perfServer = spawn('node', ['scripts/serve-compressed.mjs', 'dist', '4175'], { stdio: 'ignore' })
for (let i = 0; i < 40; i++) { try { if ((await fetch(`${perfBase}/ru`)).ok) break } catch { /* wait */ } await sleep(150) }
async function perfRun(loc, throttled) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  if (throttled) {
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  }
  await page.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0, longTasks: 0, longTaskMs: 0 }
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value }).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__perf.longTasks++; window.__perf.longTaskMs += e.duration } }).observe({ type: 'longtask', buffered: true })
  })
  const bytes = { js: 0, css: 0, font: 0, img: 0, video: 0, other: 0 }
  page.on('response', async (r) => { try { const n = Number((await r.allHeaders())['content-length'] ?? (await r.body()).length); const u = r.url(); if (u.endsWith('.js')) bytes.js += n; else if (u.endsWith('.css')) bytes.css += n; else if (u.includes('.woff2')) bytes.font += n; else if (/\.(webp|png|jpg)/.test(u)) bytes.img += n; else if (u.endsWith('.mp4')) bytes.video += n; else bytes.other += n } catch { /* ignore */ } })
  await page.goto(`${perfBase}/${loc}`, { waitUntil: 'load' })
  await page.waitForTimeout(4000)
  // simulate an interaction to get a rough INP-like number: tap the primary CTA and measure to next paint
  const inp = await page.evaluate(() => new Promise((resolve) => {
    const btn = document.querySelector('a[href="#participate"]')
    const t0 = performance.now()
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - t0)))
  }))
  const perf = await page.evaluate(() => window.__perf)
  await ctx.close()
  return { ...perf, interactionMs: inp, bytes }
}
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
for (const [label, throttled] of [['unthrottled', false], ['CPU 4x + ~1.6 Mbps/150 ms', true]]) {
  for (const loc of ['ru', 'kk']) {
    const runs = []
    for (let i = 0; i < 3; i++) runs.push(await perfRun(loc, throttled))
    const m = { loc, label, lcpMs: Math.round(median(runs.map((r) => r.lcp))), cls: Number(median(runs.map((r) => r.cls)).toFixed(3)), longTasks: median(runs.map((r) => r.longTasks)), longTaskMs: Math.round(median(runs.map((r) => r.longTaskMs))), interactionMs: Math.round(median(runs.map((r) => r.interactionMs))), kb: Object.fromEntries(Object.entries(runs[0].bytes).map(([k, v]) => [k, Math.round(v / 1024)])) }
    report.perf.push(m)
    console.log(`PERF  ${loc} ${label}: LCP ${m.lcpMs} ms, CLS ${m.cls}, long tasks ${m.longTasks} (${m.longTaskMs} ms), click→paint ${m.interactionMs} ms, KB ${JSON.stringify(m.kb)}`)
    if (m.cls >= 0.1) failures++
  }
}

perfServer.kill()
await browser.close()
writeFileSync('screenshots/audit.json', JSON.stringify(report, null, 2))
console.log(failures ? `\n${failures} issue(s) found` : '\nAudit clean')
process.exit(failures ? 1 : 0)
