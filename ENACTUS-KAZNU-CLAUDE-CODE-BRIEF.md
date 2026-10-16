# ENACTUS KAZNU — MASTER BRIEF FOR TERMINAL CLAUDE CODE
Version: 11 October 2026. Owner: Azamjon.
Read this as a self-contained project specification. You do not need access to an earlier ChatGPT conversation.

## 0. Current assignment and authority

You are the lead frontend engineer, creative director and motion designer for this project. Work in the current local repository through terminal Claude Code.

CURRENT TASK: PHASE 0 — INSPECTION AND PLAN ONLY.
Do not implement the website, install dependencies, edit application files, generate new assets, migrate a database or deploy anything yet. Read the repository and supplied assets, assess feasibility, produce the plan described in section 11, then wait for my explicit phase authorization. Read-only inspection is authorized. Use normal Claude Code permissions; do not bypass them.

Once I authorize a phase, complete that phase's local implementation and checks without asking about every routine edit. Stop at its stated review point. Deployment, paid services, sending messages and production database changes require separate authorization.

Communicate with me in Russian. Use English identifiers in code. Website languages are Kazakh, Russian and English.

Priority: working visitor experience and truthful content; then typography/composition and mascot integration; then extra effects. Keep the established warm neutral, graphite and golden-yellow direction. QANAT is an addition, not a reason to redesign the identity.

Do not assume this folder is empty. Inspect AGENTS.md/CLAUDE.md, package.json, lockfiles, routing, styles, existing animation tools and git status first. Preserve existing work. Reuse a functioning stack. If there is no application, propose the fresh-project default in section 8, but do not scaffold it in Phase 0.

## 1. Product purpose

Build the website of Enactus KazNU, a student entrepreneurship team at Al-Farabi Kazakh National University in Almaty, Kazakhstan.

Creative concept: an open studio where a student's observation can become a useful project.
Working Russian line: "Дай идее крылья."
This is proposed website copy, not an official Enactus slogan.

Three visitor paths:
1. I have an idea or a problem worth solving.
2. I want to contribute my skills or join.
3. I represent an organization and want to collaborate.

Primary conversion: privately submit an idea through a short form without creating an account.
Secondary actions: explore evidenced projects, express interest in joining, propose collaboration, open the team's real Instagram.

Do not build an AI chatbot, public idea feed, voting system, login wall, payment flow, custom administration dashboard or social network in v1. A helpful website does not need those to launch.

An idea can be an observation, not a polished business plan. Avoid language that makes inexperienced students feel unqualified. Never imply guaranteed selection, funding, mentorship or a fixed response time that the team has not confirmed.

## 2. Facts, sources and editorial limits

The following source-backed summaries were researched for this brief. Use concise original copy, preserving dates and qualifications. Some university pages intermittently fail to open; do not replace them with invented facts. Recheck only an unresolved fact needed for the current phase.

| Subject | Allowed claim | Source |
|---|---|---|
| Enactus | An international network supporting student entrepreneurial action with social and environmental purpose. | [Enactus](https://enactus.org/) |
| Team identity and Instagram | Enactus KazNU is listed among KazNU student organizations. The listed account is @kaznu_enact.us. | [University organization directory](https://farabi.university/students/organization?lang=ru) |
| Team origin | Formed on 15 September 2015. | [KazNU historical article](https://welcome.kaznu.kz/ru/3/news/one/10792/) |
| 2016 milestone | National EXPO semifinalist; among seven leading teams out of 42 universities. Representatives joined a delegation to the 2016 World Cup in Toronto for exchange and participation. This is not a claim of winning the World Cup. | Same historical article |
| Historical projects | GS-7: accounting outsourcing connected to opportunities for people with disabilities. EnLove: decorative soap production and student product-promotion experience. Treat both as historical examples; present operating status is unknown. | Same historical article |
| Asyl Zher | An environmental project presented by Enactus KazNU at Greenhouses and Flowers, Atakent, on 1–3 April 2026. Do not invent impact metrics, sales or technical performance. | [University report, 5 April 2026](https://farabi.university/news/104245) |
| 2026 National EXPO | The university reported a top-three result at the 28–29 April 2026 competition. Do not convert "top three" into an exact placing or national championship. | [University report, 1 May 2026](https://farabi.university/news/105335?lang=en) |
| University | Al-Farabi Kazakh National University, Almaty; founded on 15 January 1934. | [University history article](https://farabi.university/news/81467?lang=en) |
| Campus address | 71 Al-Farabi Avenue, Almaty, Kazakhstan. This is the university address, not a verified Enactus office. | [University contact page](https://farabi.university/trust-management/contacts?lang=ru) |

Single source of truth for links:
- teamInstagram: https://www.instagram.com/kaznu_enact.us/
- university: https://farabi.university/
- enactusGlobal: https://enactus.org/

Every Instagram icon and Instagram text link must use teamInstagram. Do not link the global account, a guessed username or a nonfunctional placeholder.
External links should be normal anchors; use an accessible label and rel="noopener noreferrer" when opening a new tab.

Brand assets:
- Official logo reference on the official domain: https://enactus.org/wp-content/uploads/2025/05/EnactusLogo-1.png
- Prefer an approved high-resolution team logo/official vector if supplied. The official web PNG is a reference/fallback; inspect its colors, intrinsic resolution and background compatibility before use.
- Keep logo proportions, wording and approved colors intact. Do not redraw the official mark with AI, stretch it, invent a KazNU lockup, or treat QANAT as the official logo.
- If the available mark is illegible on the light header, use a restrained compatible dark logo area or a clean temporary text name until an approved suitable version is supplied. Do not fabricate an official variant.
- Store usable assets locally after implementation is authorized; record their origin.

Unknowns: current leadership, roster, active recruitment dates, partner roster, project operating status, impact totals, contact email/phone and exact team office.
Do not fill those gaps with fictional people, fake testimonials, counters or sponsor logos. Do not infer a partnership from a sponsor banner in an event photo.
Keep missing facts in internal project notes. Public pages should omit unsupported details gracefully.
Do not automatically add 2LPaper or personal project/survey information as an official Enactus project without owner confirmation.

Use dated "Milestones" rather than a fabricated live news feed. Historical projects must visibly carry an archive/year label. The Asyl Zher card may say "Presented in April 2026"; do not label it currently recruiting without confirmation.

## 3. Assets and their real capabilities

Look in reference-assets/ and existing asset directories. The suggested names below are roles, not evidence that the files exist. Report an inventory mapping actual filenames to roles.

Use available image-reading tools to inspect stills. Do not assume terminal Claude can watch an MP4 directly. In Phase 0, inspect video metadata if a suitable tool is available and distinguish this brief's supplied visual assessment from your own inspection. After Phase 1 authorization, extract a few diagnostic frames with ffmpeg if needed and available; do not install system packages silently. Never claim to have watched an unreadable file.

Known assets from preparation:
- golden_origami_bird_in_flight.png: square 1254×1254 RGB reference, golden paper bird with amber eyes and graphite beak, warm studio background. It has no transparency.
- "2026-10-10 18:58:20.mp4": approximately 5.04 seconds, 512×512, about 2 MB, H.264, 30 fps, opaque light studio background. A Kling watermark is visible. The first and last poses differ; assume no seamless loop.
- IMG_0352.JPG through IMG_0359.JPG: user-supplied event photographs. Inspect each available file; their numbers do not establish chronology or identity.
- An optional approved transparent cutout, matching hero poster and takeoff/landing assets may be supplied later.

Visual inspection notes:
- IMG_0352.JPG shows a broad Enactus event with multiple teams/flags. Do not caption every visible person as a KazNU team member.
- IMG_0355.JPG is a useful group portrait at an Enactus event; the backdrop includes 2025. Do not label it as the 2026 EXPO or identify people from faces/badges.
- IMG_0359.JPG shows participants seated at an event; suitable for a supporting community image if approved.
- Use original photography as photography, not as evidence of identities or awards.

Preserve original files. After authorization, make optimized derivatives and a concise asset manifest with role, source, dimensions, usage and caption confidence. Do not upload these assets to an external processing service without authorization. Do not remove, obscure or crop a watermark to conceal it. If a clean export is needed, request the owner's properly licensed export.

Capability matrix:
- Existing MP4: real recorded wing movement during ordinary playback inside its matching scene.
- Existing opaque image: static image or softly revealed image panel on a compatible background.
- Approved transparent PNG/WebP: convincing 2D translation, scale and rotation linked to scroll; the wings remain a fixed pose.
- Transparent animated sequence/video: actual pre-rendered pose changes; needs production and browser testing.
- Rigged GLB/3D asset: real character pose control; needs modeling, rigging, animation and extra runtime work.

Do not claim that an MP4 becomes an interactive 3D character or gains an alpha channel through CSS. Do not promise a true landing or a reversible wing-opening sequence from one still image.

## 4. Visual system

Maintain an editorial, confident student entrepreneurship identity. The bird supplies personality; typography, real photography and useful content supply credibility.

Design tokens:
- paper: #F0EFEC — dominant light background.
- surface: #FAF9F6 — forms and restrained elevated areas.
- graphite: #070D0D — main text, project chapter, footer.
- graphiteSoft: #131A19 — secondary dark surface.
- gold: #FFC222 — primary CTA, small highlights, progress accents.
- goldHover: #E8AD0C — hover fill.
- mutedOnLight: #59615F.
- mutedOnDark: #BCC3BF.
- lineOnLight: rgba(7,13,13,0.14).
- lineOnDark: rgba(240,239,236,0.18).

These are project interface colors, not a claim that every value is in an official brand manual.
Gold buttons use graphite text. Do not put small white text on gold or use pale gold as body text on paper. Check contrast for real states.

Typography:
- Noto Sans, locally served WOFF2 where feasible, with Cyrillic and Kazakh character coverage.
- Start with weights 400, 500 and 700; reuse a suitable existing type system if established.
- Desktop hero: clamp(3.1rem, 6.2vw, 6rem), weight 700, line-height 1.02–1.08, tracking approximately -0.04em.
- Mobile hero: clamp(2.4rem, 10vw, 3.4rem), line-height about 1.08.
- Section titles: 40–64px desktop; 30–38px mobile.
- Body: 18px desktop, 16px mobile; line-height 1.55–1.65; about 60–68 characters per line.
- Labels: 12–14px, modest uppercase only for short labels.
- Adapt line breaks per language. Test Ә Ғ Қ Ң Ө Ұ Ү Һ І. Avoid letter-by-letter animation.

Layout:
- Max content width 1280px.
- Desktop: 12 columns, 24px gaps, 48–64px side padding.
- Tablet: 32px side padding. Mobile: 20px, one column.
- Section spacing: 112–144px desktop, 64–80px mobile.
- Controls: 48px minimum preferred target height; 10–12px radius.
- Media: 18–24px radius, with occasional full-width editorial images.
- Use quiet 1px rules and generous whitespace. Avoid turning every paragraph into a rounded card.

Restrained glass:
Only the compact navigation/language area may use paper at about 88% opacity, backdrop-filter blur(12px), a 1px subtle border and a small shadow. Provide an opaque fallback.
Do not install dashersw/liquid-glass-js in v1. Its source uses html2canvas page snapshots and WebGL, adding complexity around moving content. This is a project tradeoff, not a claim that the library cannot work anywhere.
No full-page glass panels, neon gradients, particle clouds, custom cursor, endless marquee or mandatory loading intro.

## 5. Homepage structure and exact actions

Retain this order. Local details can adapt to an existing approved layout; explain any material deviation before implementing it.

| Section | Composition and content | Functional behavior |
|---|---|---|
| Header | Compact brand left; Projects, Team, Story; language control; gold "Поделиться идеей" right. About 76px tall desktop, 64px mobile. | Brand goes to the locale homepage top. Navigation targets real section IDs. Primary CTA opens the idea path at #participate. Mobile menu supports Escape and returns focus. |
| Hero | Paper background; text about 7 columns left, QANAT visual about 5 right. Proposed headline: "Дай идее крылья." Support: "Enactus KazNU — студенческая команда КазНУ имени аль-Фараби. Объединяем идеи, предпринимательство и действия с пользой для общества." | Primary: "Поделиться идеей". Secondary: "Посмотреть проекты" → #projects. A small "Алматы · КазНУ" label, no invented statistics. Main content appears immediately. |
| Participation, #participate | Heading "С чего начнём?" Three numbered paths: "У меня есть идея", "Хочу участвовать", "Хочу сотрудничать". Light inline panel opens beneath the selected path. | Hero/header/final idea buttons select the idea path and focus the panel heading. Join and collaboration select their own short forms. No modal covering the entire site. |
| Projects, #projects | Graphite chapter, paper text, restrained gold labels. Large featured Asyl Zher case; quieter archive rows for GS-7 and EnLove. Use real relevant photos only. | Expand verified details in accessible disclosures. Show "Публикация КазНУ" source links. A case-specific "Обсудить похожую идею" can open the idea form with a visible, editable context tag. |
| Team, #team | Return to paper. One strong group photo plus a short community statement. Supporting photographs only where they add information. | "Хочу участвовать" opens the contribution form. Do not make fictional profile cards or claim the photo is the current full roster. |
| Story, #story | Editorial timeline with 2015, 2016 and the evidenced 2026 milestones. Thin gold line, modest date labels. | Dates and source links remain selectable and readable; no drag-only timeline. |
| University, #university | Compact university context: name, Almaty, founded in 1934, relation to the student team. About one short paragraph. | University link goes to https://farabi.university/. Campus address is clearly labeled as university address. Do not use the admissions phone as the team's phone. |
| Final action, #contact | Generous paper/surface composition. Proposed line: "Следующий проект может начаться с твоей идеи." Small QANAT appearance in free space. | Primary returns to idea intake; secondary opens team Instagram. A quieter collaboration link selects that path. |
| Footer | Graphite, compact brand, real navigation, language links, team Instagram and privacy link. | Every displayed icon has a real destination and accessible name. Omit unsupported contact channels. |

Do not reorder the site just to extend the mascot's journey.
Participation forms are inline expansions within the existing participation chapter, not a new unrelated page section.

Languages:
- Final website supports kk, ru and en; Kazakh is the default entry locale.
- Russian is the initial visual review language for Phase 1.
- Use /kk/, /ru/ and /en/ if creating a new router; / routes to /kk/. Reuse established locale URLs if a project already has them.
- All visible text, errors, buttons, metadata and accessible labels come from locale dictionaries.
- In Phase 1 show only working language choices; complete all languages in Phase 2.
- Language switching preserves the current section and in-progress form values, updating validation messages without erasing input.
- Do not call generated Kazakh translations professionally reviewed. Flag a native-speaker review in handover.

## 6. QANAT choreography and page transitions

QANAT is the same original golden folded-paper character across all appearances. Preserve facial features, beak, eye color, proportions, wing geometry and lighting direction. Use supplied visuals; do not generate substitute characters.

One reusable Mascot component handles source choice, poster, motion preference and visual sizing. Separate wrappers own entry animation and scroll translation so transforms do not fight.

### A. Hero introduction — current assets

- Desktop visual frame: about 340px square, maximum 380px for the 512px video. Do not stretch it into a full-screen cinematic background.
- Mobile: 220–260px, placed after the headline and actions in document order.
- Keep the complete bird visible using contain, with reserved 1:1 space.
- Use a compatible warm studio surround. Inspect actual frame edges; the original background is not one perfect flat color.
- If seamless compositing is not convincing, use an intentional softly bounded media panel. Do not move a visible opaque rectangle across unrelated sections.
- Intro: opacity 0→1, y 16→0px, scale .98→1, approximately 700ms, power2.out. Text never waits for video decoding.
- Desktop, normal-motion preference: attempt one muted inline play when substantially visible. On ending, keep the final frame. No forced loop or automatic ping-pong.
- Poster comes from a suitable actual video frame so the start is not a mismatched image-to-video jump.
- Autoplay rejection or decoding failure: retain poster and offer a small accessible play/replay control.
- Pause while offscreen or the document is hidden. Do not restart on every tiny intersection change.
- No sound. Provide pause/replay while video is active. Decorative image/video is aria-hidden; media controls are separately accessible.

### B. Scroll transition — actual scroll progress

There are two honest implementations; select based on the inspected assets.

BASELINE WITH CURRENT OPAQUE VIDEO:
- Keep the visual inside its hero media region.
- As the hero scrolls out, translate the visual wrapper upward by at most 36px, scale 1→.92 and fade 1→0.
- Use actual normalized scroll progress, not a one-time "scroll happened" playback event.
- Reverse the wrapper transformation when scrolling back. The MP4's wing motion is ordinary playback and is not reversed.
- This is an elegant scene exit, not a claim of free flight.

ENHANCEMENT ONLY WITH AN APPROVED TRANSPARENT CUTOUT:
- Use one alpha image for the scroll-linked flight layer; no background box.
- Prefer the same pose as a prepared transition frame. If a pose-matched handoff is unavailable, fade the video out before revealing the cutout. Do not overlap mismatched bird silhouettes.
- Movement stays in the reserved visual side of the hero, never over text, navigation or CTA.
- Timeline starts when hero top meets viewport top and ends when hero bottom meets viewport top; adjust the range for real content height.
- Suggested normalized waypoints, where W/H are the measured visual stage dimensions:
  p=0.00: x=0, y=0, scale=1, rotation=0deg, opacity=1.
  p=0.25: x=.06W, y=-.06H, scale=.95, rotation=-3deg, opacity=1.
  p=0.65: x=.18W, y=-.28H, scale=.72, rotation=-7deg, opacity=.9.
  p=0.85: x=.24W, y=-.42H, scale=.50, rotation=-10deg, opacity=0.
  p=1.00: remain hidden.
- These are starting values; constrain them to actual bounds. Do not clip wings before the planned fade.
- GSAP ScrollTrigger with scrub around .35 and linear timeline progress; reverse naturally. Use a curved MotionPath only if it improves this short path enough to justify the extra plugin.
- A static cutout cannot independently flap/open its wings. Report that distinction.

No all-page fixed bird following the visitor. No long pinned hero. No scroll hijacking, forced snapping or wheel interception.

### C. Projects

A short optional reappearance belongs in the reserved upper-right margin of the Projects title, never on the case image or text.
- Only use a valid transparent asset on the graphite background.
- Width 88–112px desktop; reveal y 10→0px with opacity over 450ms.
- No perpetual hovering loop; the brief entrance is enough.
- If only opaque assets exist, omit this appearance instead of placing a cream square on black.
- Hide this decorative appearance on small screens.

### D. Final action

- Width 150–190px desktop, 96–120px mobile if it fits.
- Place beside the closing headline/CTA group with its own layout space.
- Use a compatible original still or alpha asset.
- A 450ms y 10→0px settle may suggest arrival; do not describe it as an anatomically animated landing.
- A real landing sequence is a later asset-production task.

### Page-wide rhythm

- Preserve the light hero → dark project chapter → light community/action rhythm.
- At the Projects entrance, the dark background may expand visually from an inset panel into a full-width chapter. Animate a separate background layer from scaleX .94→1 and radius 24→0 over roughly 160–240px of scroll. Keep content layout stable and contrast intact.
- Do not change the entire document background on every section or let text disappear during theme changes.
- General section reveal: y 16–20→0px, opacity 0→1, 450–650ms, at most 70ms stagger across three items.
- Buttons: 160–180ms color/shadow transition and at most 2px arrow movement. No magnetic cursor.
- Menus/disclosures: approximately 180–240ms. Focus behavior works regardless of animation.
- Timeline content, forms and primary actions never wait for a cinematic sequence.
- No major continuous background animation while someone is filling in a form.

Responsive/reduced motion:
- Below 768px: normal single-column scrolling, poster-first mascot, tap-to-play video, no cross-section flight or decorative project bird.
- 768–1023px: compact composition and reduced movement, constrained by real content.
- From 1024px: full approved hero treatment if assets and performance allow.
- prefers-reduced-motion: no autoplay, flight, parallax, pinning or background expansion; use static compositions and immediate/very short opacity changes.
- Include a quiet "Меньше анимации" control that can reduce motion further and persists the preference. Do not override an OS reduce preference automatically.
- Use scoped cleanup, gsap.matchMedia or existing equivalent; handle resizing and locale changes without duplicate triggers.
- Refresh scroll measurements after fonts/images settle, not on every scroll event.
- Core text and controls remain visible if animation initialization fails.

## 7. Participation experience

### Idea path: three steps, no account

Opening copy: "Не нужен готовый бизнес-план. Расскажи, какую проблему ты заметил."
Keep the first interaction easy; ask for contact only at the end.

Step 1 — "Что хочется изменить?"
- Problem textarea, required, 10–1200 characters.
- Optional short "Кому это поможет?" field, max 200 characters.
- Optional theme chips: Экология, Образование, Доступность, Кампус, Другое.
- Example helper: "Например: на кампусе остаётся много пригодной для повторного использования бумаги." This is an example, not an impact claim.

Step 2 — "Есть мысль, как это решить?"
- Optional solution textarea, max 1800 characters.
- Support requested: Команда, Экспертиза, Проверка идеи, Пока не знаю.
- Explicit "Пока есть только проблема" path skips solution details.
- No mandatory pitch deck, attachment, budget, SDG selection or business terminology.

Step 3 — "Как с тобой связаться?"
- Name optional, max 80 characters.
- Select one contact method: Email, Telegram or Instagram.
- Show one corresponding required field. Validate according to the selected method.
- Visible short summary with Edit controls.
- Required unchecked consent for processing the submission/contact details, linked to the real privacy text.
- State: "Заявка не публикуется на сайте. Контакт нужен, чтобы команда могла ответить." Show this only when access controls implement it.
- Submit label: "Отправить идею".

Behavior:
- Back preserves values. Errors are inline and announced accessibly.
- Button feedback prevents duplicate clicks without trapping focus.
- Show success only after the server confirms persistence. Return an opaque reference ID.
- Success copy: "Идея отправлена. Сохрани номер заявки: …". No invented response deadline.
- A network error retains values and offers retry; a timeout must not erase the draft.
- One idempotency key per submission attempt prevents double records on retry.
- Optional explicit "Сохранить черновик на этом устройстве" stores idea text/category only for up to seven days. Never persist contact details by default. Offer deletion and clear the saved draft after success.
- Local draft saving is not submission to the team.
- Optional "Скопировать текст идеи" works even before the backend is configured.
- No AI scoring or external AI transmission of the visitor's idea.

Other paths:
- Contribute: short interest form with optional skill chips, a brief message, one contact method and consent; no promise that recruitment is currently open.
- Collaborate: organization/name, brief proposal, one contact method and consent.
- Reuse form primitives and backend envelope; validate each path's fields separately.
- Case-to-form links may set context, but do not overwrite an existing draft.

Operational reality:
A real team member must have a way to review submissions. For v1, use an owner-controlled database dashboard restricted to authorized team operators, with status values new, reviewing and closed. A custom admin UI and notifications are later scope. Do not send an email or Telegram message as a hidden side effect.

## 8. Implementation architecture

First prefer the existing project's stable choices.
If the repository has no application, the proposed minimal default is:
- React + TypeScript + Vite.
- Plain CSS/CSS Modules with the tokens above. Reuse Tailwind if already present.
- React Router for locale URLs and privacy pages if there is no router.
- GSAP + ScrollTrigger for the specified scroll scenes; CSS for ordinary interaction.
- A small consistent SVG icon set. No emoji UI.
- Native React state for forms; one validation schema shared with the server if compatible.
- Supabase Postgres + an Edge Function for private submissions in Phase 3.
Do not add Three.js, React Three Fiber, Rive, Lottie, Lenis, a CMS, a state framework and another motion library merely because they are popular. A real 3D system is future scope pending real 3D assets.

Suggested responsibilities, adapted to the existing repository:
- content/: source-backed facts and localized content.
- config/: real external links and feature flags.
- components/: Header, LocaleSwitcher, Mascot, ProjectCase, ParticipationForm.
- sections/: Hero, Participation, Projects, Team, Story, University, FinalAction.
- motion/: scoped scene logic.
- services/: submission client, with a clearly separate preview adapter.
- public/media/: optimized, approved derivatives only.
- server/supabase-equivalent location: migrations and submission function.
Do not create a monolithic App component or abstract a reusable system for every paragraph.

Private backend contract:
- Use an anonymous visitor-facing POST endpoint; no visitor account is required.
- Accept only allowlisted fields for idea/join/partner, locale, consent version and idempotency key.
- Set strict body and field-length limits. Validate on the server as well as the client.
- Store plain text, not executable HTML.
- Enable RLS. Anonymous/public clients must not read, update, delete or directly insert submission rows.
- Route inserts through the controlled server function. A service-role key stays in server secrets and never in VITE_ variables or shipped JavaScript.
- Configure the Edge Function's authentication mode for anonymous intake explicitly using current Supabase guidance. Do not accidentally require visitors to sign in.
- Protect the public endpoint with server-verified anti-bot protection and a durable rate limit. CORS and a hidden field alone are not abuse protection.
- Allow expected origins, handle OPTIONS, and return useful 400/429/5xx states without exposing internal errors.
- Use atomic idempotency, not merely disabled frontend buttons.
- Do not log raw submissions, contact details or secrets to analytics.
- Store created_at, type, status, locale and consent version along with the applicable submitted fields.
- Team review access must be restricted; do not grant every authenticated account access.

When credentials/owner details are missing:
- Build the local UI and server code after the relevant authorization.
- Supply .env.example containing names and placeholder values only.
- Keep sending disabled in the preview with truthful copy: "Предварительная версия: отправка пока недоступна."
- Never simulate a real successful submission or silently save only to the browser.
- Separate automated mocked UI tests from a real backend verification.
- Ask only for the exact missing setup at the point it blocks activation.
- Before production collection, the owner must supply the responsible team contact, access owner and retention/deletion policy for accurate privacy copy. Do not invent a legal entity, an NDA or a legal-compliance certification.
- Prepare migrations/deployment instructions locally; do not apply production changes or publish without explicit authorization.

## 9. Performance, accessibility and SEO

Targets, to measure rather than claim:
- LCP around 2.5 seconds or better, CLS below .1, INP around 200ms or better under stated representative conditions.
- Initial compressed JS target below 200 KB, reporting unavoidable existing-stack overhead separately.
- Initial non-video transfer target about 1 MB or less.
- Hero poster target below 150–200 KB; video around 2 MB or less if quality allows.
- Make the poster/text render before optional video download; do not autoplay-load below-fold video.
- Optimize user photos to appropriately sized WebP/AVIF with fallbacks where needed; set dimensions and responsive sizes; lazy-load below the fold.
- Do not use the 512px video as a high-resolution background or claim that upscaling restores detail.
- Never hide a loader over the page until all assets finish.
- Respect Save-Data when available, but do not depend on its availability.
- Use transform/opacity for most motion, pause offscreen work, and avoid broad will-change declarations.
- No third-party Instagram iframe or automatic social-feed requests in v1.

Accessibility:
- Semantic landmarks, one logical H1, heading hierarchy, skip link.
- Keyboard-operable controls, visible focus, 200% zoom, readable contrast.
- Real labels; required fields and errors connected correctly.
- Accessible progress text "Шаг 1 из 3"; focus the new step heading without scrolling the user unexpectedly.
- Disclosures expose expanded state. Hidden content is not focusable.
- Meaningful photo alt text without guessing people's names. Decorative mascot alt="" / aria-hidden.
- No information that exists only on hover, in animation or through color.
- Native scrolling remains available; no keyboard/gesture trap.

SEO:
- Localized page title/description and html lang.
- Canonical/hreflang links only after the real production domain is supplied.
- Do not invent a public URL or deploy to obtain one.
- Prepare Open Graph metadata using approved assets.
- Robots/sitemap and SPA rewrite or prerender strategy matched to the actual host during the deployment phase. Do not claim multilingual indexing is guaranteed by client-side title updates.
- Unknown contact details and unsupported organization claims must not appear in structured data.

## 10. Verification that proves the site works

Use tools actually available. In terminal Claude Code, a graphical browser is not automatically available. Prefer existing browser tooling; otherwise propose Playwright screenshot/testing setup when implementation is authorized.
Do not say "tested on iPhone" when only an emulated viewport was checked.

At relevant phase boundaries:
- Run the project's actual typecheck, build and lint commands if configured. Report command/exit result. Fix errors rather than suppressing them.
- Inspect rendered screenshots at 1440×900, 768×1024 and 390×844; also check 320px width for overflow.
- Compare hero hierarchy, complete bird silhouette, CTA visibility, photo crops, dark/light boundaries and form readability.
- Scroll forward/backward and resize: no duplicate birds, jumpy transforms or persistent hidden content.
- Check reduced motion, video autoplay rejection and missing/failed media.
- Verify keyboard navigation, mobile menu, form back/edit, error handling and language preservation.
- Exercise one real staging submission with synthetic data after backend authorization; confirm the row exists and the receipt matches.
- Verify that the public/anonymous credential cannot read submissions or bypass the controlled endpoint with a direct insert.
- Test invalid input, retry/idempotency, anti-bot rejection and 429 handling.
- Verify every visible link against the link registry and every internal anchor against an actual target.
- Audit all three locales for missing keys and clipped Kazakh/Cyrillic text.

Do not create tests that merely duplicate CSS values or snapshot every heading. Focus tests on the submission path, access control, language/form state and motion fallbacks.
Provide actual screenshots/check results, not unsupported Lighthouse scores. Fix material defects and stop; do not burn tokens on repeated identical checks.

## 11. Execution phases and review points

PHASE 0 — NOW, READ ONLY
Return a concise Russian report containing:
1. Existing stack and repository state, or confirmation that no app exists.
2. Asset inventory and what was actually inspected.
3. Mascot scene A/B/C/D placement, including current-asset baseline versus additional-asset enhancement.
4. Responsive/motion architecture and how it coexists with page transitions.
5. Proposed changed/new files and the smallest dependency additions.
6. Phase plan, completion criteria and unresolved production inputs.
7. At most three genuinely blocking questions, if any; sensible defaults for the rest.
Then stop. Do not output a huge imaginary codebase or repeat this brief.

PHASE 1 — VISUAL FOUNDATION, ONLY AFTER AUTHORIZATION
Create or adapt the app foundation, tokens and Russian review view. Implement Header, Hero with actual available mascot assets, Participation choices and one representative dark Projects case.
Make displayed controls work within this scope; hide unfinished navigation targets.
Produce desktop/mobile screenshots, run build/typecheck, and present a local preview URL.
Use the current-asset fallback if the transparent bird is missing.
Stop for visual review before duplicating this style across the entire site.

PHASE 2 — COMPLETE FRONTEND, AFTER AUTHORIZATION
Implement the full section order, all three locales, timeline, real source/social links, idea/join/partner interactions, draft behavior and responsive/reduced-motion cases.
Keep backend-disabled preview states truthful.
Incorporate a transparent mascot only if a suitable approved asset is actually available.
Check the whole page visually and functionally; stop with the remaining backend inputs.

PHASE 3 — PRIVATE INTAKE, AFTER AUTHORIZATION
Implement and verify server validation, storage, RLS, idempotency, anti-bot/rate limiting, consent and real error/success behavior.
Prepare the owner's review workflow and accurate privacy copy.
Use a local/staging backend where authorized; report separately what still needs credentials or production deployment.
Do not claim the submission service is live before verification.

PHASE 4 — POLISH AND HANDOVER, AFTER AUTHORIZATION
Fix the evidenced remaining mobile, accessibility, animation, performance, content and link issues.
Provide setup/run/build instructions, asset/source notes, environment-variable names, measured verification results and a concise launch checklist.
No automatic public deployment.

After every implementation phase, keep concise:
- what changed,
- how to preview it,
- checks performed and results,
- what remains blocked,
- the next phase awaiting review.

## 12. Context and token discipline

On the first implementation authorization, create or update a short CLAUDE.md:
- repository commands and conventions,
- references to this master brief and asset manifest,
- nonnegotiable content/privacy/motion constraints,
- current phase.
Do not paste this entire brief into CLAUDE.md. Target about 60–100 lines.

Maintain a short docs/STATUS.md with approved decisions, completed work, blockers and the next step. Update it at phase boundaries, not after every small edit.
Read relevant sections of this brief on demand after initial planning. Do not repeatedly re-read all photos, dependencies, lockfiles and documentation.
No parallel agent team by default. Use one coherent implementation thread.
Do not build several design alternatives or rewrite the architecture without a concrete problem.
Do not switch models or configure billing automatically.
Use targeted file searches and concise command output. Spend verification effort on real risks.

## 13. Authoritative technical references

Consult the relevant current page only when necessary; this list is not a command to re-research everything.
- [Claude Code best practices: inspect, plan, implement and verify](https://code.claude.com/docs/en/best-practices)
- [Claude Code model and effort configuration](https://code.claude.com/docs/en/model-config)
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- [GSAP responsive/reduced-motion setup](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/)
- [MDN autoplay behavior](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Edge Function security](https://supabase.com/docs/guides/functions/auth)
- [Liquid Glass source considered for this design](https://github.com/dashersw/liquid-glass-js/blob/main/container.js)

FINAL DIRECTION
Create a distinctive, useful Enactus KazNU experience where QANAT belongs to the composition, real students and projects remain central, and someone with an unfinished idea can take the first step easily.
Your first response is Phase 0 only. Wait for explicit implementation authorization.

