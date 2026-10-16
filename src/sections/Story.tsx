import { useEffect, useRef } from 'react'
import { useT } from '../content/LocaleContext'
import { useMotion } from '../motion/MotionContext'
import { setupReveal } from '../motion/motion'
import { links } from '../config/links'
import { Icon } from '../components/Icon'
import styles from './Story.module.css'

const sourceHref = (key: string): string =>
  key === 'asylZher' ? links.sources.asylZher : key === 'expo2026' ? links.sources.expo2026 : links.sources.teamHistory

export function Story() {
  const t = useT()
  const { reduced } = useMotion()
  const ref = useRef<HTMLElement>(null)

  useEffect(() => (ref.current ? setupReveal(ref.current, !reduced) : undefined), [reduced])

  return (
    <section id="story" className={styles.section} ref={ref} aria-labelledby="story-title">
      <div className={`container ${styles.grid}`}>
        <header className={styles.head} data-reveal>
          <p className={`eyebrow ${styles.eyebrow}`}>{t.story.eyebrow}</p>
          <h2 id="story-title" className="section-title">
            {t.story.title}
          </h2>
          <p className={styles.lead}>{t.story.lead}</p>
        </header>

        {/* Plain ordered list: every date and link is real text, selectable and keyboard reachable. */}
        <ol className={styles.timeline}>
          {t.story.items.map((item) => (
            <li key={item.id} className={styles.item} data-reveal>
              <p className={styles.date}>{item.date}</p>
              <h3 className={styles.itemTitle}>{item.title}</h3>
              <p className={styles.text}>{item.text}</p>
              <a className={`link ${styles.source}`} href={sourceHref(item.source)} target="_blank" rel="noopener noreferrer">
                {t.story.sourceLabel}
                <span className="visually-hidden"> ({t.a11y.externalLink})</span>
                <Icon name="external" size={16} />
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
