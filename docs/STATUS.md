# Status

## Phase
Phase 4 (polish and handover) delivered 2026-10-11. **Not deployed; no Supabase project created or changed.** Everything is verified locally; going live needs the owner inputs in `docs/LAUNCH-CHECKLIST.md`.

## Redesign (2026-10-16, owner request: "premium", see `docs/DESIGN.md`)
Visual system rebuilt around the owner-supplied pop-up-book illustration: warm paper palette, Literata + Onest, folded corners, ridge-cut chapters, restrained motion, new hero/university/closing compositions, mobile art direction, SEO plumbing (`VITE_SITE_URL`, social card, JSON-LD). **Behaviour change:** the QANAT scroll video moved from the hero to the closing section (the hero now belongs to the illustration and its own bird layer). Copy, facts, forms, backend and privacy rules are untouched. All checks pass (see DESIGN.md); the H.264 file itself could not be decoded in the CI Chromium, the video checks ran on a VP9 stand-in. Still unverified: Safari/iOS, real devices, Kazakh/English native review, publication permission for the illustration and the team photo.

## Decisions in force (defaults, owner may change)
- Stack: React + TS + Vite, CSS Modules, React Router, GSAP/ScrollTrigger. Default locale `/kk`; `/ru`, `/en` available.
- Owner request (Phase 2): the mascot video plays with scrolling and moves with scroll direction → scroll-scrubbed playback (forward down, backward up). Since the redesign it lives in the closing section (bounded folded-corner sheet; the opaque video cannot leave it).
- `qanat-intro.MP4` is the intended video. Re-encoded to 720px all-intra (1.3 MB) so frame seeking is exact.
- Main team photo: IMG_0357 (default; publication permission still unconfirmed).
- Header brand is a text name (official logo unusable on a light header).
- Sending is disabled: forms validate, summarize and explain, but say "Предварительная версия: отправка пока недоступна." They never show success.

## Phase 4 results (measured 2026-10-11, Chrome emulation, not real devices)
| Area | Result |
|---|---|
| Typecheck / build | pass; JS 156 KB gzip (target < 200), CSS 6 KB gzip |
| Browser behaviour suite | 94/94 (3 locales × 320/390/768/1440, forms, drafts, reduced motion, scroll video incl. speed cap, links, anchors) |
| Mocked sending UI | 21/21 |
| Backend on real Postgres (PGlite) | 50/50 |
| Accessibility (axe-core, WCAG 2.1 A/AA + best practice) | 0 violations on home ×3 locales ×2 viewports, open forms with errors, mobile menu, privacy; all standalone controls ≥ 44 px; 200 % zoom reflows; every focus stop visible |
| Lab performance, mobile 390 px | first load transfer 314 KB without video (JS 151, fonts 124, poster 32, CSS 6); video 1.3 MB fetched when idle. Unthrottled LCP ≈ 0.15 s; CPU 4× + 1.6 Mbps/150 ms: LCP 1.6 s, CLS 0, 2 long tasks (≈ 300 ms total), click→paint ≈ 60 ms (a rough proxy, not field INP) |
| CSP | recommended policy runs the whole UI with zero violations (negative control confirmed the test can fail) |
| External links | Instagram 200. `farabi.university` resolves to a private address on the build network (provider block page) and `welcome.kaznu.kz` redirects to itself without cookies — **not verifiable here**; check in a normal browser |

Fixed in Phase 4: language links lacked their visible text in the accessible name; three identical "navigation" landmarks for the language switcher; invalid definition-list structure in the form summary; hero poster fetched only after JS (now preloaded: LCP 2.3 s → 1.6 s under throttling); 2G connections now keep the poster instead of loading the 1.3 MB video; OG metadata, `robots.txt`, CSP test, portable scripts.

## Done in Phase 3
Migration + RLS/privilege lockdown, atomic idempotency, durable rate limits, retention helper, Edge Function (CORS allowlist, body/type/method limits, strict allowlist validation shared with the browser, server-verified Turnstile, generic errors, no sensitive logging), real browser client, Turnstile loaded only at send time, rate-limit/captcha/error/retry UX, live-mode privacy text, owner review workflow and launch checklist in `docs/BACKEND.md`.
Mascot reworked after feedback: video now follows scroll at no more than real-time speed (was up to ~17x on a hard flick), gentler drift.

## Done in Phase 2
Full homepage in section order, three locales, language switcher preserving hash and form values, idea (3 steps) / join / collaboration forms with validation, back/edit, opt-in local draft, copy-text, timeline with sources, university block, final action with QANAT still, footer, privacy preview page, reduced-motion switch.
Checks: `npm run check`, `npm run shots` (see handover message for numbers).

## Known limits / not verified
- Nothing has run against a real Supabase project, real Turnstile, the real gateway or real network/CORS. Local proof = real Postgres (PGlite) + real handler + fake PostgREST/Turnstile (`test:backend`) and a mocked endpoint in the browser (`test:ui-mock`). See `docs/BACKEND.md` for the staging checklist.
- Kazakh text is not reviewed by a native speaker. English is also unreviewed.
- Only Chrome with emulated viewports was tested (no Safari/iOS, no real devices, no Lighthouse; the lab numbers above come from our own harness). Scroll-linked video needs a real Safari/iOS check.
- No hreflang/canonical/OG image (no production domain yet); titles/descriptions are updated client-side only.

## Blockers / open inputs
1. Permission to publish people-photos (faces, badges); confirm IMG_0357 as the main photo.
2. Clean (no watermark) licensed QANAT export + transparent PNG/WebP — enables flight beyond the hero and a bird in Projects.
3. Approved Enactus KazNU logo/vector.
4. For going live: a Supabase project (owner's choice; creating one may cost money) and its link; Cloudflare Turnstile site key + secret; the real site origin(s); a responsible privacy contact; a retention period (and scheduling the purge); the published privacy text; who gets dashboard access to read submissions. Also: domain, native Kazakh review, project operating status.

## Next
Owner supplies the go-live inputs → follow `docs/LAUNCH-CHECKLIST.md` (staging project, BACKEND.md staging checklist, hosting headers, real-device pass). No further phase is planned.
