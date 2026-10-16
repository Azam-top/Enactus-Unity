# Launch checklist

Nothing below has been done; each box needs the owner or a deployed environment. Order matters.

## 1. Owner inputs (blocking)
- [ ] Permission to publish the people-photo (`IMG_0357`, faces + badges); confirm it as the team photo, or supply another.
- [ ] Approved Enactus KazNU logo/vector (the enactus.org PNG is a 150×65 white wordmark, unusable on the light header).
- [ ] Clean (watermark-free) licensed QANAT export + a transparent PNG/WebP (enables the Projects bird and flight beyond the hero). Until then the Kling watermark stays visible.
- [ ] Native-speaker review of the Kazakh text (and a review of the English).
- [ ] Confirm project statuses (GS-7, EnLove, Asyl Zher) and whether recruitment is open — only then may copy say so.
- [ ] Production domain; responsible privacy contact; retention period; who may read submissions; published privacy text.
- [ ] Decide the Supabase project (creating one may cost money) and a Cloudflare Turnstile widget (site key + secret).

## 2. Backend (see `docs/BACKEND.md`)
- [ ] `supabase db push`, set the four function secrets, `supabase functions deploy submit-intake`.
- [ ] Run the **staging checklist** in BACKEND.md with synthetic data, incl. "which client-IP header is trustworthy".
- [ ] Schedule `purge_submissions(days)` (pg_cron) matching `VITE_RETENTION_DAYS`; add reviewers in the dashboard.

## 3. Build and hosting
- [ ] Build with the `VITE_*` values; flip `VITE_SUBMISSION_ENABLED=true` **last**. `npm run check && npm run build && npm run audit`.
- [ ] HTTPS, gzip/brotli, `Accept-Ranges` for `/media/*.mp4` (the scroll video seeks by range requests).
- [ ] SPA fallback: serve `index.html` for `/kk`, `/ru`, `/en`, `/<locale>/privacy` and any unknown path. Make `/` → `/kk` a server redirect if the host allows.
- [ ] Cache: `/assets/*` immutable for a year; `index.html` and `/media/*` revalidated (media names are not hashed).
- [ ] Security headers (CSP below is the one tested by `npm run test:csp`; replace the Supabase origin):
```
Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://<project-ref>.supabase.co; img-src 'self' data:; media-src 'self'; font-src 'self'; style-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```
  (If Turnstile's own pages need more, re-run `npm run test:csp` plus a real send on staging after any change.)

## 4. SEO (needs the real domain)
- [ ] Add `<link rel="canonical">`, `hreflang` for kk/ru/en + `x-default`, `og:url`, and `og:image` (absolute URL, ≥1200×630, **approved** artwork).
- [ ] `sitemap.xml` with the three locale URLs; add its line to `public/robots.txt`.
- [ ] Titles/descriptions are updated client-side only: multilingual indexing is not guaranteed. If search traffic matters, prerender the three locale pages at build time.
- [ ] Do not add structured data with unknown facts (no phone/e-mail/office/members).

## 5. Smoke test on the live site
- [ ] Each of `/kk /ru /en` and `/<locale>/privacy` loads directly (refresh on a deep link, e.g. `/ru#story`).
- [ ] Idea, join and collaboration each send a synthetic submission → receipt shown → row visible in the dashboard → retry with the same data does not duplicate.
- [ ] Every external link opens (university and Enactus sites could not be reached from the build network; the registry in `src/config/links.ts` follows the brief's sources).
- [ ] Instagram link goes to https://www.instagram.com/kaznu_enact.us/.
- [ ] Mobile real-device pass on iOS Safari and Android Chrome (scroll-linked video, menu, forms) — only emulation was done.

## Rollback
Rebuild with `VITE_SUBMISSION_ENABLED=false` (site returns to honest preview mode; no data is collected) and, if needed, delete the
function (`supabase functions delete submit-intake`). Stored submissions stay in the database until purged.
