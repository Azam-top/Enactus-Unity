import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }

type NetworkInfo = { connection?: { saveData?: boolean; effectiveType?: string } }

/** Data saver on, or a 2G-class connection: skip the 1.3 MB scroll video and keep the poster (manual play only). */
export const prefersSaveData = (): boolean => {
  const connection = (navigator as Navigator & NetworkInfo).connection
  return connection?.saveData === true || connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g'
}

/**
 * Scroll-linked video with a speed limit. Scroll position sets a *target* time; the picture then chases it
 * at no more than real-time speed (±1x), easing in near the target. A hard flick of the wheel therefore never
 * makes the wings flap faster than the original footage — the bird catches up calmly and stops where scrolling
 * stopped. Seeks never queue: a new one starts only when the previous has finished.
 */
const MAX_RATE = 1 // seconds of video per second of real time, forwards or backwards

function createVideoScrubber(video: HTMLVideoElement) {
  let progress = 0
  let current = 0
  const tick = (_time: number, deltaMs: number) => {
    if (!Number.isFinite(video.duration) || video.readyState < 1) return
    const target = Math.min(Math.max(progress * video.duration, 0), video.duration - 0.001)
    const diff = target - current
    if (Math.abs(diff) < 0.004) current = target
    else {
      const velocity = Math.max(-MAX_RATE, Math.min(MAX_RATE, diff * 3))
      current += velocity * (Math.min(deltaMs, 100) / 1000)
      if ((diff > 0 && current > target) || (diff < 0 && current < target)) current = target
    }
    if (!video.seeking && Math.abs(video.currentTime - current) >= 1 / 48) video.currentTime = current
  }
  video.pause()
  gsap.ticker.add(tick)
  return {
    set(next: number) {
      progress = next
    },
    destroy() {
      gsap.ticker.remove(tick)
    },
  }
}

type HeroTargets = { hero: HTMLElement; scene: HTMLElement; bird: HTMLElement }

/**
 * Hero scene. The book is still; only the golden bird moves, in two moves:
 *  1. once, on load: it glides in from behind the ridge and settles where the illustration put it;
 *  2. with the real scroll position (reversible, never faster than the visitor): it lifts away up and to the right
 *     inside the empty sky, while the book drifts a few pixels slower than the page.
 * Text and CTAs never wait for any of this and never move.
 */
export function setupHeroMotion(targets: HeroTargets, opts: { allowMotion: boolean }): () => void {
  if (!opts.allowMotion) return () => undefined
  const { hero, scene, bird } = targets
  const mm = gsap.matchMedia()

  mm.add({ wide: '(min-width: 1024px)', mid: '(min-width: 768px) and (max-width: 1023px)', phone: '(max-width: 767px)' }, (ctx) => {
    const { wide, mid } = ctx.conditions as Record<string, boolean>
    const reach = wide ? 1 : mid ? 0.7 : 0.45

    gsap.from(bird, {
      x: -90 * reach,
      y: 70 * reach,
      scale: 0.72,
      rotation: 9,
      opacity: 0,
      duration: 1.7,
      delay: 0.35,
      ease: 'power3.out',
      clearProps: 'transform,opacity',
    })

    // The scroll timeline owns the bird's transform once the entrance has finished (clearProps hands it over).
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.8 },
    })
    tl.to(bird, { xPercent: 60 * reach, yPercent: -90 * reach, scale: 0.8, rotation: -7, opacity: 0, duration: 1, ease: 'power1.in' }, 0)
    tl.to(scene, { yPercent: -3, duration: 1 }, 0)
  })

  return () => mm.revert()
}

/**
 * Closing scene: the supplied QANAT video plays with the scroll through this section (down = forward, up = backward,
 * never faster than real time) while its frame settles into place. Scroll position sets the frame, nothing autoplays.
 */
export function setupFinalMotion(
  targets: { section: HTMLElement; frame: HTMLElement; video: HTMLVideoElement | null },
  opts: { allowMotion: boolean; scrubVideo: boolean },
): () => void {
  if (!opts.allowMotion) return () => undefined
  const { section, frame, video } = targets
  const mm = gsap.matchMedia()

  mm.add('(min-width: 0px)', () => {
    const scrubber = opts.scrubVideo && video ? createVideoScrubber(video) : null
    const state = { p: 0 }
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: section, start: 'top 85%', end: 'bottom 70%', scrub: 1 },
    })
    if (scrubber) tl.to(state, { p: 1, duration: 1, onUpdate: () => scrubber.set(state.p) }, 0)
    tl.fromTo(frame, { yPercent: 6, rotation: 1.2 }, { yPercent: 0, rotation: 0, duration: 0.6 }, 0)
    return () => scrubber?.destroy()
  })

  return () => mm.revert()
}

/**
 * Projects: paper-cut ridge layers behind the dark chapter move at slightly different speeds as it passes —
 * depth, like the layers of a pop-up page. Decorative only (aria-hidden), small travel, reversible.
 */
export function setupRidgeParallax(section: HTMLElement, layers: HTMLElement[], allowMotion: boolean): () => void {
  if (!allowMotion || !layers.length) return () => undefined
  const mm = gsap.matchMedia()
  mm.add('(min-width: 768px)', () => {
    layers.forEach((layer, i) => {
      gsap.fromTo(
        layer,
        { y: 40 + i * 28 },
        {
          y: -(40 + i * 28),
          ease: 'none',
          scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
        },
      )
    })
  })
  return () => mm.revert()
}

/**
 * Story: the gold line draws down as the timeline is read, and each milestone's marker fills once passed.
 * All dates, texts and links are plain content that is visible and reachable whether or not this runs.
 */
export function setupTimelineDraw(
  scope: HTMLElement,
  line: HTMLElement,
  items: HTMLElement[],
  passedClass: string,
  allowMotion: boolean,
): () => void {
  if (!allowMotion) {
    items.forEach((el) => el.classList.add(passedClass))
    return () => undefined
  }
  const ctx = gsap.context(() => {
    gsap.fromTo(
      line,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: 'none',
        transformOrigin: 'top',
        scrollTrigger: { trigger: scope, start: 'top 60%', end: 'bottom 60%', scrub: 0.4 },
      },
    )
    items.forEach((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: 'top 62%',
        onEnter: () => el.classList.add(passedClass),
        onLeaveBack: () => el.classList.remove(passedClass),
      }),
    )
  }, scope)
  return () => {
    ctx.revert()
    items.forEach((el) => el.classList.remove(passedClass))
  }
}

/**
 * [data-unfold]: a photograph or illustration is revealed once, as if a folded sheet opened from its bottom edge.
 * Never applied to text. If this does not run, the picture is simply there.
 */
export function setupUnfold(scope: HTMLElement, allowMotion: boolean): () => void {
  if (!allowMotion) return () => undefined
  const ctx = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>('[data-unfold]', scope).forEach((el) => {
      gsap.fromTo(
        el,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.1,
          ease: 'power3.out',
          clearProps: 'clipPath',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        },
      )
    })
  }, scope)
  return () => ctx.revert()
}

/** Re-measure once fonts and images have settled — not on every scroll. */
export function refreshAfterFonts(): void {
  void document.fonts?.ready.then(() => ScrollTrigger.refresh())
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })
}
