import { useEffect, useRef } from 'react'
import { useT } from '../content/LocaleContext'
import { useMotion } from '../motion/MotionContext'
import { setupTimelineDraw } from '../motion/motion'
import { links } from '../config/links'
import { Icon } from '../components/Icon'
import styles from './Story.module.css'

const sourceHref = (key: string): string =>
  key === 'asylZher' ? links.sources.asylZher : key === 'expo2026' ? links.sources.expo2026 : links.sources.teamHistory

export function Story() {
  const t = useT()
  const { reduced } = useMotion()
  const ref = useRef<HTMLElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const line = lineRef.current
    if (!wrap || !line) return
    const items = Array.from(wrap.querySelectorAll<HTMLElement>('li'))
    return setupTimelineDraw(wrap, line, items, styles.passed, !reduced)
  }, [reduced])

  return (
    <section id="story" className={styles.section} ref={ref} aria-labelledby="story-title">
      <div className={`container ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="story-title" className="section-title">
            {t.story.title}
          </h2>
          <p className={styles.lead}>{t.story.lead}</p>
        </header>

        {/* Plain ordered list: every date and link is real text, selectable and keyboard reachable. */}
        <div className={styles.timeline} ref={wrapRef}>
          <span className={styles.rail} aria-hidden="true">
            <span className={styles.line} ref={lineRef} />
          </span>
          <ol className={styles.list}>
          {t.story.items.map((item) => (
            <li key={item.id} className={styles.item}>
              <span className={styles.marker} aria-hidden="true" />
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
      </div>
    </section>
  )
}
