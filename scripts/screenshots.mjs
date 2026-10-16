// Phase 2 visual + behaviour checks (emulated viewports in system Chrome; not real devices).
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'

const base = process.env.BASE_URL ?? 'http://127.0.0.1:4173'
const out = 'screenshots'
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome-stable', headless: true })
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

// ---------- 3. Desktop: scroll-linked video + movement, reversible ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${base}/ru`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3500) // let idle video preload finish
  const probe = () =>
    page.evaluate(() => {
      const v = document.querySelector('video')
      const scene = v.closest('div[class*="frame"]').parentElement
      const cs = getComputedStyle(scene)
      return { t: Number(v.currentTime.toFixed(2)), paused: v.paused, dur: v.duration, readyState: v.readyState, opacity: Number(Number(cs.opacity).toFixed(2)), transform: cs.transform, mode: v.closest('[data-mascot-mode]').dataset.mascotMode }
    })
  const at = async (y) => { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(2800); return probe() }
  const s0 = await probe()
  log('hero: scrub mode, video loaded, paused (no free autoplay)', s0.mode === 'scrub' && s0.readyState >= 3 && s0.paused === true, JSON.stringify({ mode: s0.mode, rs: s0.readyState, paused: s0.paused, dur: s0.dur }))
  const a = await at(250)
  const b = await at(500)
  const c = await at(800)
  log('scroll down: video time increases with scroll', a.t > s0.t && b.t > a.t && c.t > b.t, `t: ${s0.t} → ${a.t} → ${b.t} → ${c.t}`)
  log('scroll down: bird moves (transform changes) and fades', b.transform !== s0.transform && c.opacity < s0.opacity, `opacity ${s0.opacity} → ${b.opacity} → ${c.opacity}`)
  const b2 = await at(500)
  const a2 = await at(250)
  const z = await at(0)
  log('scroll up: video plays backward (time decreases)', b2.t < c.t && a2.t < b2.t && z.t <= 0.1, `t: ${c.t} → ${b2.t} → ${a2.t} → ${z.t}`)
  log('scroll up: position returns to the start', z.opacity === s0.opacity && Math.abs(b2.t - b.t) < 0.25, `opacity back=${z.opacity}; t at 500 down=${b.t} up=${b2.t}`)
  await page.screenshot({ path: `${out}/ru-1440-scroll-0.png` })
  await at(350); await page.screenshot({ path: `${out}/ru-1440-scroll-350.png` })
  // speed limit: an instant jump to the bottom of the hero must NOT make the wings flap faster than real time
  await at(0)
  await page.evaluate(() => window.scrollTo(0, 850))
  await page.waitForTimeout(500)
  const r1 = await probe()
  await page.waitForTimeout(1000)
  const r2 = await probe()
  const rate = (r2.t - r1.t) / 1.0
  log('speed limit: a hard scroll jump plays at ≤ real-time speed', rate > 0.4 && rate <= 1.25, `video advanced ${(r2.t - r1.t).toFixed(2)}s in 1.0s (rate ${rate.toFixed(2)}x)`)
  await page.waitForTimeout(4500)
  const r3 = await probe()
  log('speed limit: it still catches up to the scroll position', r3.t > 3.8, `t=${r3.t}`)
  await page.evaluate(() => window.scrollTo(0, 0))
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
  const op = await page.evaluate(() => getComputedStyle(document.querySelector('video').closest('div[class*="frame"]').parentElement).opacity)
  log('OS reduced motion: no scroll fade/transform; content visible', op === '1' && (await page.getByRole('heading', { level: 1 }).isVisible()), `opacity=${op}`)
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
  await p2.waitForTimeout(3500)
  await p2.evaluate(() => window.scrollTo(0, 300))
  await p2.waitForTimeout(600)
  const ok = (await p2.getByRole('heading', { level: 1 }).isVisible()) && (await p2.getByRole('link', { name: 'Поделиться идеей' }).first().isVisible())
  log('video failure: page, CTAs and poster stay usable while scrolling', ok)
  await ctx2.close()

  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p3 = await ctx3.newPage()
  await p3.addInitScript(() => { Object.defineProperty(navigator, 'connection', { value: { saveData: true } }) })
  await p3.goto(`${base}/ru`, { waitUntil: 'networkidle' })
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
  const op = async () => { await page.evaluate(() => window.scrollTo(0, 500)); await page.waitForTimeout(1000); return page.evaluate(() => Number(getComputedStyle(document.querySelector('video').closest('div[class*="frame"]').parentElement).opacity).toFixed(2)) }
  const first = await op()
  await page.setViewportSize({ width: 1100, height: 800 })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole('link', { name: 'English' }).first().click()
  await page.waitForTimeout(800)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(600)
  const second = await op()
  const dupes = await page.locator('video').count()
  log('resize + language switch: one video, same scroll response (no duplicate triggers)', dupes === 1 && Math.abs(Number(first) - Number(second)) < 0.2, `opacity@500: ${first} → ${second}`)
  await ctx.close()
}

await browser.close()
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2))
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
