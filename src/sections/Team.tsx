import { useEffect, useRef } from 'react'
import { useT } from '../content/LocaleContext'
import { useMotion } from '../motion/MotionContext'
import { setupUnfold } from '../motion/motion'
import { Icon } from '../components/Icon'
import styles from './Team.module.css'

type Props = { onJoin: () => void }

export function Team({ onJoin }: Props) {
  const t = useT()
  const { reduced } = useMotion()
  const ref = useRef<HTMLElement>(null)

  useEffect(() => (ref.current ? setupUnfold(ref.current, !reduced) : undefined), [reduced])

  return (
    <section id="team" className={styles.section} ref={ref} aria-labelledby="team-title">
      <div className={`container ${styles.grid}`}>
        <div className={styles.text}>
          <h2 id="team-title" className={styles.title}>
            {t.team.title}
          </h2>
          <p className={styles.body}>{t.team.body}</p>
          <a
            href="#participate"
            className="btn btn--primary"
            onClick={(e) => {
              e.preventDefault()
              onJoin()
            }}
          >
            {t.team.cta}
            <Icon name="arrow" size={18} />
          </a>
        </div>

        <figure className={styles.figure}>
          <div className={styles.sheet}>
            <div className={`fold ${styles.frame}`}>
              <div data-unfold>
              <img
                className={styles.photo}
                src="/media/team-photo-1600.webp"
                srcSet="/media/team-photo-800.webp 800w, /media/team-photo-1600.webp 1600w"
                sizes="(min-width: 1024px) 640px, calc(100vw - 40px)"
                width={1600}
                height={1200}
                loading="lazy"
                decoding="async"
                alt={t.team.alt}
              />
              </div>
            </div>
          </div>
          <figcaption className={styles.caption}>{t.team.caption}</figcaption>
        </figure>
      </div>
    </section>
  )
}
