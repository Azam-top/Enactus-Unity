import { useLayoutEffect, useRef } from 'react'
import { useT } from '../content/LocaleContext'
import { useMotion } from '../motion/MotionContext'
import { Icon } from '../components/Icon'
import { setupHeroMotion } from '../motion/motion'
import styles from './Hero.module.css'

type Props = { onShareIdea: () => void }

/**
 * Hero: the headline on paper, the pop-up book rising out of it. The golden bird is its own layer
 * (cut from the same illustration) so it can lift off with the scroll while the book stays put.
 */
export function Hero({ onShareIdea }: Props) {
  const t = useT()
  const heroRef = useRef<HTMLElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const birdRef = useRef<HTMLImageElement>(null)
  const { reduced } = useMotion()

  useLayoutEffect(() => {
    if (!heroRef.current || !sceneRef.current || !birdRef.current) return
    return setupHeroMotion(
      { hero: heroRef.current, scene: sceneRef.current, bird: birdRef.current },
      { allowMotion: !reduced },
    )
  }, [reduced])

  return (
    <section className={styles.hero} ref={heroRef} aria-labelledby="hero-title">
      <div className={`container ${styles.grid}`}>
        <div className={styles.text}>
          <p className={styles.label}>{t.hero.label}</p>
          <h1 id="hero-title" className={styles.title}>
            {t.hero.title}
          </h1>
          <p className={styles.support}>{t.hero.support}</p>
          <div className={styles.actions}>
            <a
              href="#participate"
              className="btn btn--primary"
              onClick={(e) => {
                e.preventDefault()
                onShareIdea()
              }}
            >
              {t.hero.primary}
              <Icon name="arrow" size={18} />
            </a>
            <a href="#projects" className="btn btn--ghost">
              {t.hero.secondary}
            </a>
          </div>
        </div>
      </div>

      <figure className={styles.stage}>
        <div ref={sceneRef} className={styles.scene}>
          <picture>
            <source
              media="(max-width: 767px)"
              srcSet="/media/popup-scene-m-640.webp 640w, /media/popup-scene-m-800.webp 800w, /media/popup-scene-m.webp 1100w"
              sizes="100vw"
              width={1100}
              height={740}
            />
            <img
              className={styles.art}
              src="/media/popup-scene-1672.webp"
              srcSet="/media/popup-scene-760.webp 760w, /media/popup-scene-1100.webp 1100w, /media/popup-scene-1672.webp 1672w"
              sizes="(min-width: 1024px) 70vw, 100vw"
              width={1672}
              height={941}
              alt={t.hero.scene.alt}
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <img
            ref={birdRef}
            className={styles.bird}
            src="/media/popup-bird.webp"
            width={213}
            height={208}
            alt=""
            aria-hidden="true"
            decoding="async"
          />
        </div>
        <figcaption className={styles.caption}>{t.hero.scene.caption}</figcaption>
      </figure>
    </section>
  )
}
