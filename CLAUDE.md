# Enactus KazNU website

Master brief: `ENACTUS-KAZNU-CLAUDE-CODE-BRIEF.md` (read sections on demand, do not paste it here).
Asset roles and origins: `docs/ASSET-MANIFEST.md`. Progress and blockers: `docs/STATUS.md`.
Current phase: **Phase 4 (handover) delivered. Nothing is deployed.** Deploying, creating a Supabase project or switching sending on needs the owner (`docs/LAUNCH-CHECKLIST.md`, `docs/BACKEND.md`). `README.md` has setup/run/verify.

## Commands
- `npm run dev` — http://127.0.0.1:5173 · `npm run build` (`tsc -b && vite build`) · `npm run preview` — `dist/` on http://127.0.0.1:4173
- `npm run check` — typecheck (app, node, `supabase/functions/_shared`) + shared-validation sync + locale parity + validation rules + `test:backend` (migration + handler on PGlite, 50 checks)
- `npm run build:mock` then `npm run test:ui-mock` — sending flow in the browser against a FAKE endpoint (separate `dist-mock`, never deploy it)
- `npm run audit` (axe + targets + zoom + focus + lab perf, uses a gzip test server) · `npm run test:csp` (recommended CSP, zero violations)
- `npm run sync:shared` — regenerate `supabase/functions/_shared/validation.ts` from `src/shared/validation.ts` after editing the latter
- `npm run shots` — Playwright (`playwright-core` + system Chrome) behaviour checks and screenshots into `screenshots/`; needs the preview running; emulated viewports only, not real devices. A Chromium without H.264 (CI containers) needs `VIDEO_OVERRIDE=/path/to/footage-in-VP9.mp4` for the video checks

## Stack and layout
React 19 + TypeScript + Vite, CSS Modules + tokens in `src/styles/global.css`, React Router, GSAP + ScrollTrigger. No other runtime libraries.
- Routes: `/` → `/kk`; `/kk` `/ru` `/en` (+ `/:locale/privacy`). One `Home` instance survives locale changes, so form state and the URL hash are kept.
- `src/content/{ru,kk,en}.ts` — all visible copy; `ru.ts` defines the `Dictionary` shape. Errors are codes, text comes from the dictionary. `useT()`, `useLocale()`, `fmt()`.
- `src/config/links.ts` — the only place for external links (every Instagram link = `teamInstagram`). `src/config/features.ts` — sending is ON only if every `VITE_*` value in `.env.example` is set (see below); otherwise the site stays in honest preview mode.
- `src/shared/validation.ts` — pure rules + envelope types, written so the future server function can reuse them.
- `src/services/` — `submission.ts` (preview adapter OR the real HTTP client; success only on a server-confirmed receipt), `draft.ts` (opt-in, 7 days, idea text/themes only).
- `supabase/` — migration (RLS forced, no policies, privileges revoked), Edge Function `submit-intake` (`verify_jwt = false`, protections in code), `docs/BACKEND.md` is the handbook.
- `src/components/forms/` primitives + `IdeaForm` (3 steps), `JoinForm`, `CollabForm`. All three forms stay mounted (inactive ones `hidden`).
- `src/motion/` — `motion.ts` (all GSAP scenes, `matchMedia`, cleanup), `MotionContext` (OS reduce OR the footer "Меньше анимации" switch).
- `public/media/` optimized derivatives only; originals stay in the repo root.

## Non-negotiable constraints
Content: source-backed facts only (brief §2) — no invented people, partners, metrics, contacts, response times, recruitment/selection/funding promises. GS-7/EnLove are labelled "Архив". Photos are never captioned with names; the team photo is not claimed to be the full roster; sponsors in photos imply no partnership. Kazakh copy is a draft awaiting native review.
Privacy/backend: never simulate a successful submission (mocked UI tests use a separate build); sending needs URL + Turnstile site key + consent version + privacy contact + retention days; the Turnstile secret, IP salt and Supabase secret key exist only as function secrets; contact details are never stored locally; no analytics/third-party widgets; "Заявка не публикуется…" stays hidden until access controls exist (Phase 3). Service-role keys never in `VITE_*`.
Motion/media: the hero is the owner-supplied pop-up-book illustration (`hero-popup-book.webp`); its golden bird is a separate cut-out layer (`public/media/popup-bird.webp`) that glides in once and lifts away with the scroll; it is labelled "Иллюстрация" and never captioned as a photo or as project evidence. QANAT is the supplied video only, shown in the closing section and scrubbed by that section's scroll (fetched only when near) (opaque background → bounded panel; no cross-section flight; no bird in Projects until a transparent asset exists). The Kling watermark is never hidden or cropped. Hero: scroll position sets a target and the video chases it at no more than real-time speed (`MAX_RATE` in `motion.ts`), with a small drift of the panel (reversible, no pinning/hijacking); reduced motion, Save-Data and failure give poster + manual play. Core content stays visible if animation fails.
Design (premium redesign, `docs/DESIGN.md`): paper-craft pop-up-book language. Tokens paper #F4EAD7 (matches the illustration backdrop), surface #FAF5EA, paper-deep #E4D6B9, graphite #0D1311, gold #FFC222 (graphite text on gold; gold is never text on paper), muted #5B5243. Type: Literata (display, pinned to opsz 56) + Onest (text/UI), self-hosted in `public/fonts` (Kazakh-complete; never swap in a face without Ә Ғ Қ Ң Ө Ұ Ү Һ І). Sentence-case labels only, no decorative eyebrows, no numbered markers unless the content is a sequence.

## Conventions
English identifiers, user-facing copy via dictionaries, Russian replies to the owner. Fix errors rather than suppress them. Commit/push/deploy only on request.
