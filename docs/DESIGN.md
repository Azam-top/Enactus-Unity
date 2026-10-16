# Design direction — "paper-craft pop-up book"

Why this exists: the first build was correct, honest and accessible, but generic — a neutral grey-cream page, a default
sans, a square video panel and fade-up reveals on every block. This document records the direction that replaced it and
how the eight "$10K vs $200" criteria are met. Content rules (brief §2) and privacy rules did not change.

## The point of view
The owner-supplied illustration is the whole idea: an open book from which the university, the mountains and a garden
rise as folded paper, a golden origami bird leaving the page. "Дай идее крылья" is that picture. Everything else is
derived from it so the page reads as one object, not a collage:

| Derived from the illustration | Used for |
|---|---|
| Cream paper backdrop | `--paper #F4EAD7` is sampled from the artwork's own sky, so the picture melts into the page (no rectangle) |
| Folded / cut paper | Folded top-right corner on photographs, panels and the QANAT sheet (`.fold`); ridge-cut top/bottom edge of the dark Projects chapter and the footer |
| Mountain layers | Three paper-cut ridge silhouettes behind Projects that move at different speeds (depth, like a pop-up page) |
| Gold road and bird | The one accent: `--gold #FFC222` (CTA, the timeline line, the nav bar, the hero rule) |
| Book typography | Literata display headings; Onest for text and controls |

## The eight criteria
1. **Point of view** — one concept (above), carried by structure (folds, ridges), not by decoration.
2. **Typography that does work** — Literata (a book face; optical size pinned at 56 for display) + Onest, neither Inter nor
   Roboto. Both carry the full Kazakh alphabet (verified glyph by glyph with fontTools, not assumed). Scale: hero 5.4–8 rem,
   section titles 2.3–4.6 rem (`--title-size`), body 17–18 px/1.6. No all-caps labels, no accent word inside a headline,
   no numbered markers (the three visitor paths are not a sequence — they carry pictograms instead).
3. **Restrained colour** — paper, surface, graphite, gold (+ muted text and one paper shade). The illustration supplies
   the green/blue; the UI never adds a colour of its own. Contrast: text on paper 6.3:1 (muted) / 15:1 (ink); gold is only a fill.
4. **Hierarchy that breathes** — one big thing per section (hero headline + book, "Asyl Zher" at up to 11 rem, the closing
   line). Cards were removed where a hairline list does the job (Projects facts). Section rhythm 80/112/144 px.
5. **Imagery with intent** — the owner's illustration is the hero, cropped differently on phones (tower + garden + bird,
   not the wide picture shrunk) and re-used once as a campus crop beside the university text. The bird is a separate
   cut-out layer. Real photography stays photography (unnamed, folded-corner sheet). Every generated picture is labelled
   "Иллюстрация"; nothing generated is presented as evidence of a project. No stock photography anywhere.
6. **Motion that whispers** — total: the bird glides in once and lifts away with the scroll; the ridges drift at three
   speeds; the timeline line draws as you read; photographs unfold once from the bottom edge; QANAT plays *with* the
   scroll in the closing section. No fade-up on text, no stagger, nothing loops, nothing hijacks scrolling.
   "Меньше анимации" and `prefers-reduced-motion` switch all of it off; content never depends on it.
7. **Mobile designed, not shrunk** — own hero crop (m-640/800/1100 sources), headline → CTA → picture order that fits
   one 390×844 screen, full-sheet menu with display-size links, path cards turn into horizontal rows, ridge parallax off.
8. **The invisible expensive stuff** — see the numbers below; also: self-hosted trimmed fonts (≈77 KB for a Russian first
   load, was 124 KB), responsive `srcset` + preloaded hero image, explicit image dimensions, one gzip JS bundle (153 KB,
   unchanged), QANAT video (1.3 MB) fetched only when the closing section is within ~1.5 screens, semantic landmarks,
   skip link, scrollspy with `aria-current="location"`, visible focus everywhere, 44 px targets, build-time canonical /
   hreflang / sitemap / `og:image` from `VITE_SITE_URL`, a 1200×630 social card, JSON-LD limited to confirmed facts.

## Measured (2026-10-16, emulated Chrome/Chromium, not real devices)
| Check | Result |
|---|---|
| `npm run check` | pass (types, locale parity 256 keys ×3, validation, backend 50/50) |
| `npm run shots` | 97/97 (3 locales × 320/390/768/1440, forms, drafts, reduced motion, bird + scrub video, links) |
| `npm run test:csp`, `test:ui-mock` | pass, 21/21 |
| `npm run audit` | axe WCAG 2.1 A/AA + best-practice: 0 violations on every page/state; targets ≥44 px; 200 % zoom; focus; deep links |
| Lab perf, mobile 390 @ DPR2 | unthrottled LCP ≈ 0.18 s, CLS 0.003; CPU 4× + 1.6 Mbps/150 ms: LCP ≈ 2.1 s (was 1.6 s with a 32 KB poster; the book is a 65 KB hero), long tasks 5 (≈ 0.8 s) |
| First-load transfer, mobile | JS 153 KB gz · CSS 8 · fonts 77 · hero image 65 + bird 7 (≈ 310 KB), no video |

The video checks need a browser that decodes H.264. The CI Chromium used here cannot, so the video part of `shots` ran
against the same footage re-encoded to VP9 (`VIDEO_OVERRIDE`, see CLAUDE.md); the H.264 file itself was not played here.

## How the pieces combine (what to keep doing)
- One image decides the palette, the shapes and the motion; new pages/sections should borrow from it, not from a template.
- Spend boldness in one place per screen: the book (hero), the case name (Projects), the closing line.
- Decoration must be a fold, a ridge or the gold line — i.e. something the illustration already contains.
- Keep illustration and evidence apart: the book is atmosphere; projects, dates and sources stay typographic and cited.
- Any new asset: same cream, same cut-paper look, a transparent cut-out if it should move, and a label if generated.

## Not done (and why)
- A custom cursor, parallax mouse-tilt, page-transition library, smooth-scroll library, dark mode: each adds weight or
  scroll-hijack risk for little gain (brief §4/§6). Dark mode can be added by re-pointing the tokens later.
- New AI-generated imagery (project scenes, portraits): needs the owner's authorisation (paid, external upload) and
  must not depict unverified project details. Crops of the supplied illustration were used instead.
- Real-device and Safari/iOS testing of scroll-linked video and `backdrop-filter`; per-locale prerendering.
