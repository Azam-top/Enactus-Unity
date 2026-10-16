import { useEffect, useRef } from 'react'
import { useT } from '../content/LocaleContext'
import { useMotion } from '../motion/MotionContext'
import { setupReveal } from '../motion/motion'
import { links } from '../config/links'
import { Icon } from '../components/Icon'
import styles from './FinalAction.module.css'

type Props = { onShareIdea: () => void; onCollaborate: () => void }

export function FinalAction({ onShareIdea, onCollaborate }: Props) {
  const t = useT()
  const f = t.finalAction
  const { reduced } = useMotion()
  const ref = useRef<HTMLElement>(null)

  useEffect(() => (ref.current ? setupReveal(ref.current, !reduced) : undefined), [reduced])

  return (
    <section id="contact" className={styles.section} ref={ref} aria-labelledby="contact-title">
      <div className="container">
        <div className={styles.panel}>
          <div className={styles.text} data-reveal>
            <h2 id="contact-title" className={styles.title}>
              {f.title}
            </h2>
            <div className={styles.actions}>
              <a
                href="#participate"
                className="btn btn--primary"
                onClick={(e) => {
                  e.preventDefault()
                  onShareIdea()
                }}
              >
                {f.primary}
                <Icon name="arrow" size={18} />
              </a>
              <a className="btn btn--ghost" href={links.teamInstagram} target="_blank" rel="noopener noreferrer">
                <Icon name="instagram" size={18} />
                {f.secondary}
                <span className="visually-hidden"> ({t.a11y.externalLink})</span>
              </a>
            </div>
            <a
              href="#participate"
              className={`link ${styles.quiet}`}
              onClick={(e) => {
                e.preventDefault()
                onCollaborate()
              }}
            >
              {f.quiet}
            </a>
          </div>

          {/* QANAT "arrives": the last frame of the supplied video, a short settle, no claim of a real landing. */}
          <div className={styles.still} data-settle aria-hidden="true">
            <img src="/media/qanat-landing.webp" width={384} height={384} loading="lazy" decoding="async" alt="" />
          </div>
        </div>
      </div>
    </section>
  )
}
