# Asset manifest

Originals are never modified. Derivatives live in `public/media/`.

## Supplied by the owner (repo root)
| File | Facts | Role | Status / cautions |
|---|---|---|---|
| `qanat-intro.MP4` | 960×960, 24 fps, 5.04 s, 4.6 MB, H.264, **contains a stereo audio track**, visible "KlingAI" watermark bottom-right, AIGC metadata (producer: kling). Opaque cream studio background (edge colour varies rgb 221–249). Last pose differs from first; not a loop. | QANAT hero scene (A) | Used. Poster = frame 0. Watermark left visible. Owner to supply a clean licensed export when available. |
| `IMG_0352.JPG` | 1280×853 | Wide event/community shot (multiple teams' flags, 30th anniversary stage) | Not used yet. Low resolution. Do not caption as KazNU-only. |
| `IMG_0353.JPG` | 1280×960 | Group with FARABI flag, empty hall | Not used yet. Low resolution; fallback. |
| `IMG_0354.JPG` | 4160×3120 | Group with FARABI flag, purple lighting | Not used yet. Supporting only. |
| `IMG_0355.JPG` | 4160×3120 | 7 people in front of a **2025** forum backdrop with sponsor logos; legible name badges | Not used yet. Not 2026 EXPO. Crop sponsor logos/badges or skip. |
| `IMG_0356.JPG` | 4160×3120 | Large group, black Enactus banner, FARABI and Kazakhstan flags | Not used yet. Team-photo candidate. |
| `IMG_0357.JPG` | 4160×3120 | Large group with banner "enactus · Al-Farabi Kazakh National University" | **Used in Team (Phase 2)**, caption says date unknown / not the full roster. Publication permission to be confirmed. |
| `IMG_0358.JPG` | 4160×3120 | Audience in hall, other universities' signs visible | Not used yet. Event/community context. |
| `IMG_0359.JPG` | 4160×3120 | Close portrait of two seated women | Do not use without their consent. |

All people-photos need the owner's confirmation that publication is acceptable (open question).

## Derivatives
| File | Source | Specs | Usage |
|---|---|---|---|
| `public/media/qanat-hero.mp4` | `qanat-intro.MP4` | 720×720, H.264 High, CRF 27, **every frame a keyframe** (exact scroll seeking), audio and metadata stripped, faststart, ~1.3 MB | Hero video, scroll-scrubbed; fetched when the page is idle |
| `public/media/qanat-poster.webp` | frame 0 of `qanat-intro.MP4` | 768×768 WebP q82, ~32 KB | Hero poster / first paint / manual mode |
| `public/media/qanat-landing.webp` | last frame of `qanat-intro.MP4` | 384×384 WebP q80, ~10 KB | Final-action QANAT still ("arrival") |
| `public/media/team-photo-1600.webp`, `team-photo-800.webp` | `IMG_0357.JPG` | 1600×1200 (~85 KB) and 800×600 (~37 KB) WebP q78 | Team section, responsive `srcset`, lazy |

Missing (listed in the brief, not supplied): `golden_origami_bird_in_flight.png`, `2026-10-10 18:58:20.mp4`, any transparent QANAT cutout or approved team logo.
Official logo reference (not stored): https://enactus.org/wp-content/uploads/2025/05/EnactusLogo-1.png — checked on 2026-10-11: 150×65 px, white wordmark on transparent, unusable on the light header.

## Notes added in Phase 4
- The hero poster is preloaded from `index.html` (`<link rel=preload as=image>`); rename it only together with that tag.
- `public/robots.txt` allows everything and has no sitemap line yet (needs the production domain).
- No `og:image` yet: it needs approved artwork at an absolute URL (see `docs/LAUNCH-CHECKLIST.md`).
- The Kling watermark and AIGC origin of `qanat-intro.MP4` are unchanged; replace the derivatives when a clean licensed export arrives.
