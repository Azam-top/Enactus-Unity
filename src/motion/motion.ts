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

type HeroTargets = { hero: HTMLElement; intro: HTMLElement; scene: HTMLElement; video: HTMLVideoElement | null }

/**
 * Hero scene. Entrance runs once; then the real scroll position drives both the bird's motion
 * (≥768px: a slow, small drift up and right inside its own column, then fades out) and, when allowed, the
 * video frames — down plays forward, up plays backward, never faster than real time. Everything is reversible and nothing hijacks scrolling.
 */
export function setupHeroMotion(targets: HeroTargets, opts: { allowMotion: boolean; scrubVideo: boolean }): () => void {
  if (!opts.allowMotion) return () => undefined
  const { hero, intro, scene, video } = targets
  const mm = gsap.matchMedia()

  mm.add({ wide: '(min-width: 1024px)', mid: '(min-width: 768px) and (max-width: 1023px)', phone: '(max-width: 767px)' }, (ctx) => {
    const { wide, mid } = ctx.conditions as Record<string, boolean>

    gsap.from(intro, { opacity: 0, y: 16, scale: 0.98, duration: 0.7, ease: 'power2.out', clearProps: 'transform,opacity' })

    const scrubber = opts.scrubVideo && video ? createVideoScrubber(video) : null
    const state = { p: 0 }

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 },
    })

    if (scrubber) tl.to(state, { p: 1, duration: 0.9, onUpdate: () => scrubber.set(state.p) }, 0)

    if (wide || mid) {
      const k = wide
        ? [
            { xPercent: 2, yPercent: -3, scale: 0.99, rotation: -1, opacity: 1 },
            { xPercent: 5, yPercent: -10, scale: 0.92, rotation: -2.5, opacity: 0.95 },
            { xPercent: 8, yPercent: -18, scale: 0.8, rotation: -4, opacity: 0 },
          ]
        : [
            { xPercent: 1, yPercent: -2, scale: 0.99, rotation: -0.5, opacity: 1 },
            { xPercent: 3, yPercent: -7, scale: 0.94, rotation: -2, opacity: 0.95 },
            { xPercent: 5, yPercent: -12, scale: 0.86, rotation: -3, opacity: 0 },
          ]
      tl.to(scene, { ...k[0], duration: 0.25 }, 0)
        .to(scene, { ...k[1], duration: 0.4 }, 0.25)
        .to(scene, { ...k[2], duration: 0.25 }, 0.65)
    }

    return () => scrubber?.destroy()
  })

  return () => mm.revert()
}

/** Projects: the dark chapter grows from an inset panel into a full-width band over ~220px of scroll. */
export function setupChapterExpand(section: HTMLElement, layer: HTMLElement, allowMotion: boolean): () => void {
  if (!allowMotion) return () => undefined
  const mm = gsap.matchMedia()

  mm.add('(min-width: 768px)', () => {
    gsap.fromTo(
      layer,
      { scaleX: 0.94, borderRadius: 24 },
      {
        scaleX: 1,
        borderRadius: 0,
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'top bottom-=220', scrub: 0.2 },
      },
    )
  })

  return () => mm.revert()
}

/**
 * Quiet reveal for [data-reveal] (rise 18px) and [data-settle] (a 10px "arrival" settle).
 * Content is never hidden when motion is reduced.
 */
export function setupReveal(scope: HTMLElement, allowMotion: boolean): () => void {
  if (!allowMotion) return () => undefined
  const ctx = gsap.context(() => {
    const batch = (selector: string, y: number, duration: number) => {
      const items = gsap.utils.toArray<HTMLElement>(selector, scope)
      if (!items.length) return
      gsap.set(items, { opacity: 0, y })
      ScrollTrigger.batch(items, {
        start: 'top 90%',
        once: true,
        onEnter: (els) =>
          gsap.to(els, { opacity: 1, y: 0, duration, ease: 'power2.out', stagger: 0.07, clearProps: 'transform,opacity' }),
      })
    }
    batch('[data-reveal]', 18, 0.55)
    batch('[data-settle]', 10, 0.45)
  }, scope)
  return () => ctx.revert()
}

/** Re-measure once fonts and images have settled — not on every scroll. */
export function refreshAfterFonts(): void {
  void document.fonts?.ready.then(() => ScrollTrigger.refresh())
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })
}
