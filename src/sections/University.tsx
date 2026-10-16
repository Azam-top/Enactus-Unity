import { useEffect, useRef } from 'react'
import { useT } from '../content/LocaleContext'
import { useMotion } from '../motion/MotionContext'
import { setupUnfold } from '../motion/motion'
import { links } from '../config/links'
import { Icon } from '../components/Icon'
import styles from './University.module.css'

export function University() {
  const t = useT()
  const u = t.university
  const { reduced } = useMotion()
  const ref = useRef<HTMLElement>(null)

  useEffect(() => (ref.current ? setupUnfold(ref.current, !reduced) : undefined), [reduced])

  return (
    <section id="university" className={styles.section} ref={ref} aria-labelledby="university-title">
      <div className={`container ${styles.grid}`}>
        <figure className={styles.figure}>
          <div className={styles.sheet}>
            <div className={`fold ${styles.frame}`}>
              <div data-unfold>
              <img
                className={styles.image}
                src="/media/campus-tower.webp"
                srcSet="/media/campus-tower-600.webp 600w, /media/campus-tower.webp 940w"
                sizes="(min-width: 1024px) 560px, calc(100vw - 40px)"
                width={940}
                height={705}
                loading="lazy"
                decoding="async"
                alt={u.imageAlt}
              />
              </div>
            </div>
          </div>
          <figcaption className={styles.caption}>{u.imageCaption}</figcaption>
        </figure>

        <div className={styles.text}>
          <h2 id="university-title" className={styles.title}>
            {u.title}
          </h2>
          <p className={styles.body}>{u.body}</p>
          <a className={`link ${styles.link}`} href={links.university} target="_blank" rel="noopener noreferrer">
            {u.link}
            <span className="visually-hidden"> ({t.a11y.externalLink})</span>
            <Icon name="external" size={16} />
          </a>
          <address className={styles.address}>
            <span className={styles.addressLabel}>{u.addressLabel}</span>
            <span className={styles.addressLine}>{u.address}</span>
            <span className={styles.note}>{u.addressNote}</span>
          </address>
        </div>
      </div>
    </section>
  )
}
