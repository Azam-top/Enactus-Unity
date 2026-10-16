import { useLayoutEffect, useRef } from 'react'
import { useT } from '../content/LocaleContext'
import { Mascot } from '../components/Mascot'
import { useMotion } from '../motion/MotionContext'
import { Icon } from '../components/Icon'
import { prefersSaveData, setupHeroMotion } from '../motion/motion'
import styles from './Hero.module.css'

type Props = { onShareIdea: () => void }

export function Hero({ onShareIdea }: Props) {
  const t = useT()
  const heroRef = useRef<HTMLElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { reduced } = useMotion()

  useLayoutEffect(() => {
    if (!heroRef.current || !introRef.current || !sceneRef.current) return
    return setupHeroMotion(
      { hero: heroRef.current, intro: introRef.current, scene: sceneRef.current, video: videoRef.current },
      { allowMotion: !reduced, scrubVideo: !reduced && !prefersSaveData() },
    )
  }, [reduced])

  return (
    <section className={styles.hero} ref={heroRef} aria-labelledby="hero-title">
      <div className={`container ${styles.grid}`}>
        <div className={styles.text}>
          <p className={`eyebrow ${styles.label}`}>{t.hero.label}</p>
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

        <div className={styles.visual}>
          {/* Two wrappers on purpose: entrance and scroll translation must not fight over transforms. */}
          <div ref={introRef} className={styles.layer}>
            <div ref={sceneRef} className={styles.layer}>
              <Mascot videoRef={videoRef} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
