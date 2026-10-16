# Enactus KazNU website

Student-team site for Enactus KazNU (Al-Farabi Kazakh National University, Almaty): open studio for ideas, three visitor
paths (idea / join / collaborate), evidenced projects, story, three languages (kk default, ru, en).
Spec: `ENACTUS-KAZNU-CLAUDE-CODE-BRIEF.md`. Working notes for Claude Code: `CLAUDE.md`. Progress: `docs/STATUS.md`.

**Not deployed.** Sending ideas is OFF until the owner supplies the go-live inputs (`docs/LAUNCH-CHECKLIST.md`). Until then
the forms validate and explain, and say "Предварительная версия: отправка пока недоступна." — they never pretend to send.

## Requirements
Node 22.18+ (developed on 26; the check scripts run `.ts` files directly), npm, Google Chrome for the browser checks
(`CHROME_PATH=/path/to/chrome` if it is not `/usr/bin/google-chrome-stable`). `ffmpeg` + ImageMagick only if you re-make media. Fonts are self-hosted in `public/fonts` (no font CDN).

## Run
```bash
npm install
npm run dev          # http://127.0.0.1:5173  (/ redirects to /kk; also /ru, /en, /<locale>/privacy)
npm run build        # tsc -b && vite build  -> dist/
npm run preview      # serves dist/ on http://127.0.0.1:4173
```
If npm is slow or drops connections, retry with `npm install --prefer-offline --maxsockets=3`.

## Verify (all local, no network needed except npm install)
| Command | What it proves |
|---|---|
| `npm run check` | types (app, node, edge-function code), shared validation in sync, kk/ru/en have identical keys and placeholders, validation rules, **backend** (migration + RLS + idempotency + rate limits + handler on a real Postgres via PGlite, 50 checks) |
| `npm run shots` | with `npm run preview` running: 94 behaviour checks + screenshots in `screenshots/` (3 locales × 320/390/768/1440, forms, drafts, reduced motion, scroll video, links) |
| `npm run build:mock && npm run test:ui-mock` | sending flow in the browser against a FAKE endpoint (success, 429, captcha, 500, network, timeout, retries). `dist-mock` is never deployed |
| `npm run audit` | needs preview + build: axe-core (WCAG 2.1 A/AA + best practice) on all locales/states, tap targets, 200 % zoom, focus visibility, deep-link reveals, lab performance |
| `npm run test:csp` | the whole UI runs under the recommended Content-Security-Policy with zero violations |

## Environment variables
Browser (build time, all PUBLIC — see `.env.example`): `VITE_SITE_URL` (optional until the domain exists), `VITE_SUBMISSION_ENABLED`, `VITE_SUBMISSION_URL`,
`VITE_TURNSTILE_SITE_KEY`, `VITE_CONSENT_VERSION`, `VITE_PRIVACY_CONTACT`, `VITE_RETENTION_DAYS`.
Sending turns on only when **all** are set and `VITE_SUBMISSION_ENABLED=true`.
Edge Function secrets (never in the repo or the browser; `supabase/functions/.env.example`): `ALLOWED_ORIGINS`,
`TURNSTILE_SECRET_KEY`, `IP_HASH_SALT`, `CONSENT_VERSION`. `SUPABASE_URL` and the secret API key are injected by Supabase.

## Where things are
```
src/content/{ru,kk,en}.ts   all copy (ru.ts defines the shape)      src/config/links.ts   the only external-link registry
src/sections, components    UI                                      src/shared/validation.ts  rules shared with the server
src/motion/                 GSAP scenes + "Меньше анимации"          src/services/         submission client, opt-in draft
supabase/                   migration, Edge Function, config         docs/                 STATUS, BACKEND, LAUNCH-CHECKLIST, ASSET-MANIFEST
public/media/               optimized derivatives only; originals (IMG_*.JPG, qanat-intro.MP4) stay in the repo root untouched
scripts/                    checks, audit, test servers
```

## Content rules that must survive edits
Only source-backed facts (brief §2): no invented people, partners, metrics, contacts, response times or recruitment promises;
historical projects are labelled "Архив"; photos carry no names and are not claimed to be the full roster; the Kling watermark is
never hidden; the Kazakh/English text is an unreviewed draft until a native speaker approves it.
