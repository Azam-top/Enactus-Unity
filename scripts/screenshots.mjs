// Phase 2 visual + behaviour checks (emulated viewports in system Chrome; not real devices).
import { chromium } from 'playwright-core'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const base = process.env.BASE_URL ?? 'http://127.0.0.1:4173'
const out = 'screenshots'
mkdirSync(out, { recursive: true })

// WebGL is off by default: the Projects ink simulation is GPU work and runs very slowly on a software renderer, which would
// time out full-page screenshots. WEBGL=1 keeps it on. The page must work without WebGL either way (it is tested here).
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome-stable', headless: true, args: process.env.WEBGL === '1' ? [] : ['--disable-3d-apis'] })
// Chromium builds without H.264 (e.g. the open-source one in CI containers) cannot decode the real hero video.
// VIDEO_OVERRIDE=/path/to/same-footage-in-VP9.mp4 serves a stand-in for the video checks; real Chrome does not need it.
const videoOverride = process.env.VIDEO_OVERRIDE
const overrideVideo = async (context) => {
  if (!videoOverride) return
  const bytes = readFileSync(videoOverride)
  // Honour Range requests: without them the browser treats the video as unseekable.
  await context.route('**/qanat-hero.mp4', (route) => {
    const range = /bytes=(\d*)-(\d*)/.exec(route.request().headers().range ?? '')
    const headers = { 'content-type': 'video/mp4', 'accept-ranges': 'bytes' }
    if (!range) return route.fulfill({ status: 200, headers, body: bytes })
    const start = range[1] ? Number(range[1]) : 0
    const end = range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1
    return route.fulfill({ status: 206, headers: { ...headers, 'content-range': `bytes ${start}-${end}/${bytes.length}` }, body: bytes.subarray(start, end + 1) })
  })
}
const results = []
const log = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

const viewports = [
  { name: '1440', width: 1440, height: 900 },
  { name: '768', width: 768, height: 1024 },
  { name: '390', width: 390, height: 844 },
  { name: '320', width: 320, height: 700 },
]
const locales = ['ru', 'kk', 'en']

async function scrollThrough(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < h; y += 350) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(70)
  }
  await page.waitForTimeout(700)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(500)
}

// ---------- 1. Every locale × viewport: no overflow, no clipped text, no console errors, screenshots ----------
for (const loc of locales) {
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await ctx.newPage()
    const errors = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(`${base}/${loc}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    if (loc === 'ru' || vp.name === '390' || vp.name === '1440') await page.screenshot({ path: `${out}/${loc}-${vp.name}-hero.png` })
    await scrollThrough(page)
    await page.screenshot({ path: `${out}/${loc}-${vp.name}-full.png`, fullPage: true })

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    const clipped = await page.evaluate(() => {
      const bad = []
      document.querySelectorAll('h1,h2,h3,p,a,button,label,dt,dd,span,li').forEach((el) => {
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || el.closest('[hidden]') || el.closest('.visually-hidden')) return
        const r = el.getBoundingClientRect()
        if (r.width === 0) return
        // text running past its own box horizontally while the box hides overflow, or past the viewport edge
        if (r.right > window.innerWidth + 1 && !el.closest('video')) bad.push(`${el.tagName}:${(el.textContent || '').trim().slice(0, 30)} right=${Math.round(r.right)}`)
        if (cs.overflow === 'hidden' && el.scrollWidth > el.clientWidth + 1 && cs.display !== 'inline' && !el.closest('[class*="inner"]')) bad.push(`${el.tagName} clipped:${(el.textContent || '').trim().slice(0, 30)}`)
      })
      return bad.slice(0, 5)
    })
    log(`${loc}@${vp.name}: no horizontal overflow`, overflow <= 0, `delta=${overflow}`)
    log(`${loc}@${vp.name}: no clipped/overflowing text`, clipped.length === 0, clipped.join(' | '))
    log(`${loc}@${vp.name}: no console errors`, errors.length === 0, errors.join(' | ').slice(0, 200))
    await ctx.close()
  }
}

// ---------- 2. Kazakh letters actually render with Noto Sans ----------
{
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
  await page.goto(`${base}/kk`, { waitUntil: 'networkidle' })
  const ok = await page.evaluate(async () => {
    await document.fonts.ready
    const res = {}
    for (const w of [400, 500, 700]) res[w] = document.fonts.check(`${w} 18px "Noto Sans Variable"`, 'ӘәҒғҚқҢңӨөҰұҮүҺһІі')
    return res
  })
  log('kk: Noto Sans covers Ә Ғ Қ Ң Ө Ұ Ү Һ І at 400/500/700', Object.values(ok).every(Boolean), JSON.stringify(ok))
  const lang = await page.evaluate(() => document.documentElement.lang)
  log('kk: html lang and title', lang === 'kk' && (await page.title()).includes('Идеяңа'), `lang=${lang} title=${await page.title()}`)
  await page.close()
}

// ---------- 3. Desktop: hero bird lifts with the scroll; QANAT video is scrubbed by the closing section; both reversible ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await overrideVideo(ctx)
  const page = await ctx.newPage()
  await page.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2800) // entrance (0.35s + 1.7s) finished
  const bird = () =>
    page.evaluate(() => {
      const el = document.querySelector('img[src*="popup-bird"]')
      const cs = getComputedStyle(el)
      return { opacity: Number(Number(cs.opacity).toFixed(2)), transform: cs.transform }
    })
  const birdAt = async (y) => { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(1800); return bird() }
  const b0 = await bird()
  log('hero: the illustration, the bird layer and the headline are present', b0.opacity === 1 && (await page.getByRole('heading', { level: 1 }).isVisible()) && (await page.locator('img[src*="popup-scene"]').first().isVisible()), JSON.stringify(b0))
  const b1 = await birdAt(300)
  const b2 = await birdAt(700)
  const b3 = await birdAt(1100)
  log('scroll down: the bird lifts away (transform changes) and fades out', b1.transform !== b0.transform && b3.opacity < b1.opacity && b3.opacity <= 0.2, `opacity ${b0.opacity} → ${b1.opacity} → ${b2.opacity} → ${b3.opacity}`)
  const back = await birdAt(0)
  log('scroll up: the bird returns to where the illustration put it', back.opacity === 1 && Math.abs(Number(back.transform.split(',')[4] ?? 0)) < 2, `opacity=${back.opacity} transform=${back.transform}`)
  await page.screenshot({ path: `${out}/ru-1440-scroll-0.png` })
  await birdAt(350); await page.screenshot({ path: `${out}/ru-1440-scroll-350.png` })

  // The video lives in the closing section and is fetched only when it is close.
  const probe = () =>
    page.evaluate(() => {
      const v = document.querySelector('video')
      return { t: Number(v.currentTime.toFixed(2)), paused: v.paused, dur: v.duration, readyState: v.readyState, preload: v.preload, mode: v.closest('[data-mascot-mode]').dataset.mascotMode }
    })
  const early = await probe()
  log('QANAT video is not fetched with the first screen', early.preload === 'none' && early.readyState === 0, JSON.stringify(early))
  const geo = await page.evaluate(() => {
    const el = document.getElementById('contact')
    const r = el.getBoundingClientRect()
    return { top: r.top + window.scrollY, height: r.height, vh: window.innerHeight, max: document.documentElement.scrollHeight - window.innerHeight }
  })
  // ScrollTrigger range: start "top 85%" → end "bottom 70%".
  const startY = geo.top - geo.vh * 0.85
  const endY = geo.top + geo.height - geo.vh * 0.7
  const at = async (p) => {
    const y = Math.min(geo.max, Math.max(0, startY + (endY - startY) * p))
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(3200)
    return probe()
  }
  await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, startY - 600))
  await page.waitForTimeout(3500) // let the video load
  const s0 = await probe()
  log('closing scene: scrub mode, video loaded when near, paused (no free autoplay)', s0.mode === 'scrub' && s0.readyState >= 3 && s0.paused === true, JSON.stringify(s0))
  const v1 = await at(0.35)
  const v2 = await at(0.7)
  const v3 = await at(1)
  log('scroll down: video time increases with scroll', v1.t > s0.t && v2.t > v1.t && v3.t >= v2.t, `t: ${s0.t} → ${v1.t} → ${v2.t} → ${v3.t}`)
  const w2 = await at(0.7)
  const w1 = await at(0.35)
  const w0 = await at(0)
  log('scroll up: video plays backward (time decreases)', w2.t < v3.t && w1.t < w2.t && w0.t <= 0.15, `t: ${v3.t} → ${w2.t} → ${w1.t} → ${w0.t}`)
  log('scroll up: same position gives the same frame (reversible)', Math.abs(w2.t - v2.t) < 0.3 && Math.abs(w1.t - v1.t) < 0.3, `0.7: ${v2.t}/${w2.t}  0.35: ${v1.t}/${w1.t}`)
  // speed limit: an instant jump across the whole section must NOT make the wings flap faster than real time
  await page.evaluate((y) => window.scrollTo(0, y), endY)
  await page.waitForTimeout(500)
  const r1 = await probe()
  await page.waitForTimeout(1000)
  const r2 = await probe()
  const rate = (r2.t - r1.t) / 1.0
  log('speed limit: a hard scroll jump plays at ≤ real-time speed', rate > 0.4 && rate <= 1.25, `video advanced ${(r2.t - r1.t).toFixed(2)}s in 1.0s (rate ${rate.toFixed(2)}x)`)
  await page.waitForTimeout(4500)
  const r3 = await probe()
  log('speed limit: it still catches up to the scroll position', r3.t > 3.8, `t=${r3.t}`)
  await page.evaluate((y) => window.scrollTo(0, y), startY)
  await page.waitForTimeout(500)
  const q1 = await probe()
  await page.waitForTimeout(1000)
  const q2 = await probe()
  log('speed limit: rewinding is also capped', (q1.t - q2.t) <= 1.25, `rewound ${(q1.t - q2.t).toFixed(2)}s in 1.0s`)
  await ctx.close()
}

// ---------- 4. Reduced motion (OS) and the in-page "Меньше анимации" switch ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const mode = await page.evaluate(() => document.querySelector('[data-mascot-mode]').dataset.mascotMode)
  log('OS reduced motion: manual mode with a play control, no autoplay', mode === 'manual' && (await page.evaluate(() => document.querySelector('video').paused)) && (await page.getByRole('button', { name: /анимацию QANAT/ }).isVisible()), `mode=${mode}`)
  await page.evaluate(() => window.scrollTo(0, 450))
  await page.waitForTimeout(600)
  const op = await page.evaluate(() => { const b = document.querySelector('img[src*="popup-bird"]'); const cs = getComputedStyle(b); return `${cs.opacity}|${cs.transform}` })
  log('OS reduced motion: the bird does not fly (no scroll fade/transform); content visible', op === '1|none' && (await page.getByRole('heading', { level: 1 }).isVisible()), `bird=${op}`)
  const sw = page.getByRole('button', { name: 'Меньше анимации' })
  log('OS reduced motion: switch shows as on and is disabled with a note', (await sw.getAttribute('aria-pressed')) === 'true' && (await sw.isDisabled()))
  await ctx.close()

  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p2 = await ctx2.newPage()
  await p2.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await p2.waitForTimeout(800)
  const before = await p2.evaluate(() => document.querySelector('[data-mascot-mode]').dataset.mascotMode)
  await p2.getByRole('button', { name: 'Меньше анимации' }).click()
  await p2.waitForTimeout(600)
  const after = await p2.evaluate(() => document.querySelector('[data-mascot-mode]').dataset.mascotMode)
  const stored = await p2.evaluate(() => localStorage.getItem('enactus.reduceMotion'))
  log('switch "Меньше анимации": scrub → manual, persisted', before === 'scrub' && after === 'manual' && stored === '1', `${before} → ${after}, stored=${stored}`)
  await p2.reload({ waitUntil: 'networkidle' })
  const reloaded = await p2.evaluate(() => document.querySelector('[data-mascot-mode]').dataset.mascotMode)
  log('switch persists after reload', reloaded === 'manual')
  await ctx2.close()
}

// ---------- 5. Idea form: steps, validation, back/edit, preview state, drafts, languages ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Поделиться идеей' }).first().click()
  await page.waitForTimeout(900)
  log('idea CTA opens form and focuses step heading', (await page.evaluate(() => document.activeElement?.textContent?.trim())) === 'Что хочется изменить?')
  log('step 1 progress text', await page.getByText('Шаг 1 из 3').isVisible())

  await page.getByRole('button', { name: 'Дальше' }).click()
  await page.waitForTimeout(200)
  const err1 = await page.locator('#idea-problem-error').textContent()
  log('step 1: required error shown inline and field focused', err1?.includes('Заполни') && (await page.evaluate(() => document.activeElement?.id)) === 'idea-problem', err1 ?? '')
  await page.fill('#idea-problem', 'коротко')
  await page.getByRole('button', { name: 'Дальше' }).click()
  log('step 1: too-short error with the limit', (await page.locator('#idea-problem-error').textContent())?.includes('10'))

  await page.fill('#idea-problem', 'На кампусе остаётся много бумаги для повторного использования')
  await page.getByRole('button', { name: 'Экология' }).click()
  await page.getByRole('button', { name: 'Дальше' }).click()
  await page.waitForTimeout(250)
  log('step 2 reached; heading focused', (await page.evaluate(() => document.activeElement?.textContent?.trim())) === 'Есть мысль, как это решить?' && (await page.getByText('Шаг 2 из 3').isVisible()))
  await page.getByRole('checkbox', { name: /Пока есть только проблема/ }).check()
  log('step 2: "only the problem" hides the solution field', (await page.locator('#idea-solution').count()) === 0)
  await page.getByRole('button', { name: 'Проверка идеи' }).click()
  await page.getByRole('button', { name: 'Дальше' }).click()
  await page.waitForTimeout(250)

  log('preview mode: the "submission is private" note is NOT shown (no access controls are live)', (await page.getByText('Заявка не публикуется').count()) === 0)
  log('preview mode: no anti-bot script requested', !(await page.evaluate(() => performance.getEntriesByType('resource').some((r) => r.name.includes('challenges.cloudflare.com')))))
  log('step 3: summary shows the problem and the skip', (await page.getByText('Проверь перед отправкой').isVisible()) && (await page.locator('dl dd', { hasText: 'Пока есть только проблема' }).count()) > 0)
  await page.getByRole('button', { name: 'Отправить идею' }).click()
  await page.waitForTimeout(200)
  log('step 3: submit with no contact shows contact and consent errors', (await page.locator('#idea-contact-error').textContent())?.includes('Заполни') && (await page.locator('#idea-consent-error').textContent())?.includes('согласие'))

  // contact method switching validates the SELECTED method
  await page.getByRole('radio', { name: 'Telegram' }).check()
  await page.fill('#idea-contact', 'ab')
  await page.getByRole('button', { name: 'Отправить идею' }).click()
  log('telegram: invalid handle error', (await page.locator('#idea-contact-error').textContent())?.includes('Telegram'))

  // language switch keeps input, hash and step; errors are re-worded
  const urlBefore = new URL(page.url())
  await page.getByRole('link', { name: 'English' }).first().click()
  await page.waitForTimeout(500)
  const urlAfter = new URL(page.url())
  log('language switch: route changes, hash kept', urlAfter.pathname === '/en' && urlAfter.hash === urlBefore.hash, `${urlBefore.pathname}${urlBefore.hash} → ${urlAfter.pathname}${urlAfter.hash}`)
  log('language switch: contact input and step survive', (await page.inputValue('#idea-contact')) === 'ab' && (await page.getByText('Step 3 of 3').isVisible()))
  log('language switch: validation message re-worded', (await page.locator('#idea-contact-error').textContent())?.includes('Telegram username'), (await page.locator('#idea-contact-error').textContent()) ?? '')
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('button', { name: 'Back' }).click()
  log('language switch: step-1 text kept in English UI', (await page.inputValue('#idea-problem')).startsWith('На кампусе'))
  await page.getByRole('link', { name: 'Қазақша' }).first().click()
  await page.waitForTimeout(400)
  log('switch to kk keeps the same text', (await page.inputValue('#idea-problem')).startsWith('На кампусе') && new URL(page.url()).pathname === '/kk')

  // valid submit in preview: truthful, never a success
  await page.getByRole('link', { name: 'Русский' }).first().click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Дальше' }).click()
  await page.getByRole('button', { name: 'Дальше' }).click()
  await page.getByRole('radio', { name: 'Email' }).check()
  await page.fill('#idea-contact', 'student@kaznu.edu.kz')
  await page.fill('#idea-name', 'Тест')
  await page.getByRole('checkbox', { name: /Даю согласие/ }).check()
  await page.getByRole('button', { name: 'Отправить идею' }).click()
  await page.waitForTimeout(600)
  const notice = await page.getByText('Предварительная версия: отправка пока недоступна.').first().isVisible()
  const fakeSuccess = await page.getByText('Идея отправлена').count()
  log('valid submit in preview: says unavailable, no fake success, text kept', notice && fakeSuccess === 0 && (await page.inputValue('#idea-contact')) === 'student@kaznu.edu.kz')
  await page.screenshot({ path: `${out}/ru-1280-idea-step3.png`, fullPage: false })
  await ctx.close()
}

// ---------- 6. Draft opt-in, restore and deletion; contact is never stored ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Поделиться идеей' }).first().click()
  await page.waitForTimeout(600)
  await page.fill('#idea-problem', 'Черновик про бумагу на кампусе')
  await page.waitForTimeout(700)
  log('draft: nothing stored before opt-in', (await page.evaluate(() => localStorage.getItem('enactus.ideaDraft.v1'))) === null)
  await page.getByRole('checkbox', { name: /Сохранить черновик/ }).check()
  await page.fill('#idea-problem', 'Черновик про бумагу на кампусе, дополнено')
  await page.waitForTimeout(900)
  const raw = await page.evaluate(() => localStorage.getItem('enactus.ideaDraft.v1'))
  const parsed = raw ? JSON.parse(raw) : null
  log('draft: saved after opt-in with text/themes only', !!parsed && parsed.problem.includes('дополнено') && !('contact' in parsed) && !('name' in parsed), raw ?? 'none')
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Поделиться идеей' }).first().click()
  await page.waitForTimeout(500)
  log('draft: restored after reload with a notice', (await page.inputValue('#idea-problem')).includes('дополнено') && (await page.getByText('Найден сохранённый черновик').isVisible()))
  await page.getByRole('button', { name: 'Удалить черновик' }).click()
  await page.waitForTimeout(300)
  log('draft: delete clears storage', (await page.evaluate(() => localStorage.getItem('enactus.ideaDraft.v1'))) === null && (await page.getByText('Черновик удалён').isVisible()))
  // expiry
  await page.evaluate(() => localStorage.setItem('enactus.ideaDraft.v1', JSON.stringify({ problem: 'старый', beneficiary: '', solution: '', themes: [], savedAt: Date.now() - 8 * 86400000 })))
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Поделиться идеей' }).first().click()
  await page.waitForTimeout(400)
  log('draft: older than 7 days is discarded', (await page.inputValue('#idea-problem')) === '')
  await ctx.close()
}

// ---------- 7. Join and collaboration paths, copy text ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await ctx.newPage()
  await page.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Хочу участвовать/ }).click()
  await page.getByRole('button', { name: 'Отправить', exact: true }).click()
  log('join: contact + consent errors, no recruitment promise', (await page.locator('#join-contact-error').textContent())?.includes('Заполни') && (await page.getByText(/не заявка на место/).isVisible()))
  await page.getByRole('button', { name: /Хочу сотрудничать/ }).click()
  await page.getByRole('button', { name: 'Отправить предложение' }).click()
  log('collab: organization and proposal required', (await page.locator('#collab-organization-error').textContent())?.includes('Заполни') && (await page.locator('#collab-proposal-error').textContent())?.includes('Заполни'))
  await page.getByRole('button', { name: /У меня есть идея/ }).click()
  await page.fill('#idea-problem', 'Текст для копирования в буфер')
  await page.getByRole('button', { name: 'Скопировать текст идеи' }).click()
  await page.waitForTimeout(300)
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  log('copy idea text works without a backend', clip.includes('Текст для копирования'), clip.slice(0, 40))
  await ctx.close()
}

// ---------- 8. Sections, links, anchors, keyboard ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  const ids = await page.$$eval('main > section', (s) => s.map((x) => x.id))
  log('section order', JSON.stringify(ids) === JSON.stringify(['', 'participate', 'projects', 'team', 'story', 'university', 'contact']), ids.join(','))
  const h1 = await page.$$eval('h1', (h) => h.length)
  log('exactly one h1', h1 === 1)

  const hrefs = await page.$$eval('a[href^="http"]', (as) => as.map((a) => a.href))
  const allowed = new Set(['https://www.instagram.com/kaznu_enact.us/', 'https://farabi.university/', 'https://farabi.university/news/104245', 'https://welcome.kaznu.kz/ru/3/news/one/10792/', 'https://farabi.university/news/105335?lang=en'])
  const stray = hrefs.filter((h) => !allowed.has(h))
  log('all external links are in the registry', stray.length === 0, stray.join(', '))
  const insta = await page.$$eval('a[href*="instagram"]', (as) => as.map((a) => a.href))
  log('every Instagram link is the team account', insta.length >= 2 && insta.every((h) => h === 'https://www.instagram.com/kaznu_enact.us/'), `${insta.length} links`)
  const rel = await page.$$eval('a[target="_blank"]', (as) => as.filter((a) => !(a.rel.includes('noopener') && a.rel.includes('noreferrer'))).length)
  log('target=_blank links have rel noopener noreferrer', rel === 0)
  const anchors = await page.$$eval('a[href^="#"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))])
  const missing = []
  for (const a of anchors) if (!(await page.$(a))) missing.push(a)
  log('internal anchors all have targets', missing.length === 0, anchors.join(' ') + (missing.length ? ' MISSING ' + missing : ''))
  const noAlt = await page.$$eval('img', (is) => is.filter((i) => i.getAttribute('alt') === null).length)
  log('every image has an alt attribute', noAlt === 0)
  const timeline = await page.locator('#story li').count()
  log('timeline has 4 dated entries with source links', timeline === 4 && (await page.locator('#story li a[href^="http"]').count()) === 4)

  // keyboard: skip link then tab order reaches the idea CTA
  await page.keyboard.press('Tab')
  log('skip link is first focusable', (await page.evaluate(() => document.activeElement?.className)).includes('skip-link'))
  await ctx.close()
}

// ---------- 9. Case → form context, nav targets, privacy page ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Обсудить похожую идею' }).click()
  await page.waitForTimeout(800)
  log('case opens idea form with an editable context tag', await page.getByText('Контекст:').isVisible())
  await page.fill('#idea-problem', 'Мой черновик')
  await page.getByRole('button', { name: 'Убрать контекст' }).click()
  log('removing the tag keeps the draft', (await page.inputValue('#idea-problem')) === 'Мой черновик')

  await page.locator('footer').getByRole('link', { name: 'Конфиденциальность' }).click()
  await page.waitForTimeout(500)
  const onPrivacy = new URL(page.url()).pathname === '/ru/privacy' && (await page.getByRole('heading', { level: 1 }).textContent()) === 'Конфиденциальность'
  log('privacy page opens and is honest about the preview', onPrivacy && (await page.getByText(/ещё не включён/).isVisible()))
  await page.screenshot({ path: `${out}/ru-1440-privacy.png` })
  await page.getByRole('link', { name: 'Проекты' }).first().click()
  await page.waitForTimeout(900)
  log('nav from privacy returns to the section', new URL(page.url()).pathname === '/ru' && (await page.evaluate(() => document.getElementById('projects').getBoundingClientRect().top)) < 200)
  await ctx.close()
}

// ---------- 10. Mobile menu, language in the menu, failure fallbacks ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Открыть меню' }).click()
  await page.screenshot({ path: `${out}/ru-390-menu.png` })
  log('mobile menu has sections, language and CTA', (await page.locator('#mobile-menu a').count()) >= 7)
  await page.keyboard.press('Escape')
  log('Escape closes the menu and returns focus', !(await page.locator('#mobile-menu').isVisible()) && (await page.evaluate(() => document.activeElement?.getAttribute('aria-controls'))) === 'mobile-menu')
  await ctx.close()

  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p2 = await ctx2.newPage()
  await p2.route('**/qanat-hero.mp4', (r) => r.abort())
  await p2.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await p2.waitForTimeout(1500)
  await p2.evaluate(() => document.getElementById('contact').scrollIntoView())
  await p2.waitForTimeout(2500)
  const ok = (await p2.getByRole('heading', { name: /Следующий проект/ }).isVisible()) && (await p2.getByRole('link', { name: 'Поделиться идеей' }).last().isVisible())
  log('video failure: closing section, CTAs and poster stay usable while scrolling', ok)
  await ctx2.close()

  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p3 = await ctx3.newPage()
  await p3.addInitScript(() => { Object.defineProperty(navigator, 'connection', { value: { saveData: true } }) })
  await p3.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await p3.evaluate(() => document.getElementById('contact').scrollIntoView())
  await p3.waitForTimeout(2500)
  const info = await p3.evaluate(() => ({ mode: document.querySelector('[data-mascot-mode]').dataset.mascotMode, preload: document.querySelector('video').preload, rs: document.querySelector('video').readyState }))
  log('Save-Data: poster only, video not preloaded', info.mode === 'manual' && info.preload === 'none' && info.rs === 0, JSON.stringify(info))
  await ctx3.close()
}

// ---------- 11. Resize / language changes leave exactly one working scene ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const op = async () => { await page.evaluate(() => window.scrollTo(0, 500)); await page.waitForTimeout(1800); return page.evaluate(() => Number(getComputedStyle(document.querySelector('img[src*="popup-bird"]')).opacity).toFixed(2)) }
  const first = await op()
  await page.setViewportSize({ width: 1100, height: 800 })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole('link', { name: 'English' }).first().click()
  await page.waitForTimeout(800)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(600)
  const second = await op()
  const dupes = await page.locator('video').count()
  log('resize + language switch: one video, same bird scroll response (no duplicate triggers)', dupes === 1 && Math.abs(Number(first) - Number(second)) < 0.2, `opacity@500: ${first} → ${second}`)
  await ctx.close()
}

// ---------- 12. Bento paths, border beam, text reveal, ink (Magic UI + DyeWhorl components) ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(4500) // idle-mounted extras
  const tiles = page.locator('#participate [role="listitem"] button')
  log('bento: three path tiles, each one real button named after its path', (await tiles.count()) === 3 && (await page.getByRole('button', { name: /У меня есть идея/ }).count()) === 1 && (await page.getByRole('button', { name: /Хочу сотрудничать/ }).count()) === 1)
  const beam = await page.evaluate(() => document.querySelectorAll('#participate [role="listitem"] [style*="offset-path"], #participate [role="listitem"] [style*="offsetPath"]').length)
  log('border beam: exactly one, on the idea tile, once the page is idle', beam === 1, `beams=${beam}`)
  // keyboard: focusing a tile shows its call to action (nothing is hover-only) and a visible focus ring
  await page.locator('#participate [role="listitem"] button').first().focus()
  await page.waitForTimeout(500)
  const cta = await page.evaluate(() => {
    const card = document.activeElement.closest('[role="listitem"]')
    const rise = [...card.querySelectorAll('div')].find((d) => d.className.includes('lg:flex'))
    return { opacity: Number(getComputedStyle(rise).opacity), outline: getComputedStyle(document.activeElement).outlineStyle }
  })
  log('bento: keyboard focus reveals the call to action and draws a focus ring', cta.opacity === 1 && cta.outline !== 'none', JSON.stringify(cta))
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)
  log('bento: Enter opens the form panel and marks the tile pressed', (await page.locator('#participate [role="listitem"] button').first().getAttribute('aria-pressed')) === 'true' && (await page.getByText('Шаг 1 из 3').isVisible()))
  await ctx.close()

  // text reveal: the headline is real text from the start and ends fully readable
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p2 = await ctx2.newPage()
  await p2.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await p2.waitForTimeout(3500)
  await p2.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById('contact').scrollIntoView({ block: 'center' }) })
  await p2.waitForTimeout(3600)
  const title = await p2.evaluate(() => { const h = document.getElementById('contact-title'); const s = h.querySelector('span'); return { text: h.textContent, color: s ? getComputedStyle(s).color : 'plain', accessible: h.textContent.trim().length > 20 } })
  log('text reveal: heading text is intact and the sweep has finished', title.accessible && /Следующий проект/.test(title.text), JSON.stringify(title))
  await ctx2.close()

  // reduced motion: no beam, heading plain, ink (if any) is a still frame
  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const p3 = await ctx3.newPage()
  await p3.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await p3.waitForTimeout(4000)
  const rm = await p3.evaluate(() => ({ beams: document.querySelectorAll('#participate [style*="offset-path"]').length, plain: document.querySelector('#contact-title span') === null }))
  log('reduced motion: no border beam and the closing heading is plain text', rm.beams === 0 && rm.plain, JSON.stringify(rm))
  await ctx3.close()

  // phone: bento tiles stack, nothing overflows, no ink canvas is created
  const ctx4 = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p4 = await ctx4.newPage()
  await p4.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await p4.evaluate(() => document.getElementById('projects').scrollIntoView())
  await p4.waitForTimeout(2500)
  const ph = await p4.evaluate(() => ({ canvas: document.querySelectorAll('#projects canvas').length, overflow: document.documentElement.scrollWidth - innerWidth }))
  log('phone: no ink simulation is started and nothing overflows', ph.canvas === 0 && ph.overflow <= 0, JSON.stringify(ph))
  await ctx4.close()
}

// ---------- 13. Ink simulation with WebGL on (own browser): mounts near the chapter, honours Save-Data, never traps scrolling ----------
{
  const gl = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome-stable', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const ctx = await gl.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  const before = await page.evaluate(() => document.querySelectorAll('#projects canvas').length) // still on the hero: nothing mounted yet
  await page.evaluate(() => document.getElementById('projects').scrollIntoView())
  await page.waitForTimeout(4000)
  const info = await page.evaluate(() => { const c = document.querySelector('#projects canvas'); return c ? { w: c.width, h: c.height, touch: getComputedStyle(c.parentElement).touchAction, hidden: c.getAttribute('aria-hidden') } : null })
  log('ink: canvas is created only when the chapter is near, is decorative and never blocks touch scrolling', before === 0 && info && info.w > 100 && info.hidden === 'true' && info.touch === 'pan-y' && errors.length === 0, JSON.stringify({ before, info, errors }))
  await ctx.close()
  const ctx2 = await gl.newContext({ viewport: { width: 1440, height: 900 } })
  const p2 = await ctx2.newPage()
  await p2.addInitScript(() => { Object.defineProperty(navigator, 'connection', { value: { saveData: true } }) })
  await p2.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await p2.evaluate(() => document.getElementById('projects').scrollIntoView())
  await p2.waitForTimeout(3000)
  log('ink: Save-Data → no simulation', (await p2.evaluate(() => document.querySelectorAll('#projects canvas').length)) === 0)
  await ctx2.close()
  await gl.close()
}

await browser.close()
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2))
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
