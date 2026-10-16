import { useLayoutEffect, useRef } from 'react'
import { useT } from '../content/LocaleContext'
import { useMotion } from '../motion/MotionContext'
import { prefersSaveData, setupFinalMotion } from '../motion/motion'
import { links } from '../config/links'
import { Icon } from '../components/Icon'
import { Mascot } from '../components/Mascot'
import styles from './FinalAction.module.css'

type Props = { onShareIdea: () => void; onCollaborate: () => void }

export function FinalAction({ onShareIdea, onCollaborate }: Props) {
  const t = useT()
  const f = t.finalAction
  const { reduced } = useMotion()
  const ref = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useLayoutEffect(() => {
    if (!ref.current || !frameRef.current) return
    return setupFinalMotion(
      { section: ref.current, frame: frameRef.current, video: videoRef.current },
      { allowMotion: !reduced, scrubVideo: !reduced && !prefersSaveData() },
    )
  }, [reduced])

  return (
    <section id="contact" className={styles.section} ref={ref} aria-labelledby="contact-title">
      <div className="container">
        <div className={`fold ${styles.panel}`}>
          <div className={styles.text}>
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

          {/* QANAT: the supplied video, driven by scroll through this section — it "arrives" as the page ends. */}
          <div className={styles.mascot} ref={frameRef}>
            <Mascot videoRef={videoRef} />
          </div>
        </div>
      </div>
    </section>
  )
}
