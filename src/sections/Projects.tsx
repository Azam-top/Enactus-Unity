import { useLayoutEffect, useRef } from 'react'
import { useT } from '../content/LocaleContext'
import { links } from '../config/links'
import { Icon } from '../components/Icon'
import { Disclosure } from '../components/Disclosure'
import { useMotion } from '../motion/MotionContext'
import { setupChapterExpand, setupReveal } from '../motion/motion'
import styles from './Projects.module.css'

type Props = { onDiscuss: (contextTag: string) => void }

export function Projects({ onDiscuss }: Props) {
  const t = useT()
  const p = t.projects
  const sectionRef = useRef<HTMLElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const { reduced } = useMotion()

  useLayoutEffect(() => {
    const section = sectionRef.current
    const layer = layerRef.current
    if (!section || !layer) return
    const cleanups = [setupChapterExpand(section, layer, !reduced), setupReveal(section, !reduced)]
    return () => cleanups.forEach((fn) => fn())
  }, [reduced])

  const external = (href: string, text: string) => (
    <a className={`link ${styles.source}`} href={href} target="_blank" rel="noopener noreferrer">
      {text}
      <span className="visually-hidden"> ({t.a11y.externalLink})</span>
      <Icon name="external" size={16} />
    </a>
  )

  return (
    <section id="projects" className={`on-dark ${styles.section}`} ref={sectionRef} aria-labelledby="projects-title">
      <div className={styles.layer} ref={layerRef} aria-hidden="true" />
      <div className="container">
        <header className={styles.head} data-reveal>
          <p className={`eyebrow ${styles.eyebrow}`}>{p.eyebrow}</p>
          <h2 id="projects-title" className="section-title">
            {p.title}
          </h2>
          <p className={styles.lead}>{p.lead}</p>
        </header>

        <article className={styles.featured} aria-labelledby="case-asyl-zher" data-reveal>
          <div className={styles.featuredMain}>
            <p className={`eyebrow ${styles.tag}`}>{p.featured.tag}</p>
            <h3 id="case-asyl-zher" className={styles.caseName}>
              {p.featured.name}
            </h3>
            <p className={styles.caseBody}>{p.featured.body}</p>

            <div className={styles.disclosureWrap}>
              <Disclosure title={p.featured.disclosure}>
                <div className={styles.disclosureBody}>
                  {p.featured.disclosureBody.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </Disclosure>
            </div>

            <div className={styles.caseActions}>
              <button type="button" className="btn btn--primary" onClick={() => onDiscuss(p.featured.contextTag)}>
                {p.featured.discuss}
                <Icon name="arrow" size={18} />
              </button>
              {external(links.sources.asylZher, p.featured.source)}
            </div>
          </div>

          <aside className={styles.facts} aria-label={p.featured.factsTitle}>
            <dl>
              {p.featured.facts.map((fact) => (
                <div key={fact.term} className={styles.fact}>
                  <dt>{fact.term}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </article>

        <div className={styles.archive} data-reveal>
          <div className={styles.archiveHead}>
            <h3 className={styles.archiveTitle}>{p.archive.title}</h3>
            <p className={styles.archiveNote}>{p.archive.note}</p>
          </div>
          <ul>
            {p.archive.items.map((item) => (
              <li key={item.id}>
                <Disclosure
                  title={
                    <>
                      <span className={styles.archiveBadge}>{p.archive.label}</span>
                      {item.name}
                    </>
                  }
                  meta={item.short}
                >
                  <div className={styles.disclosureBody}>
                    <p>{item.body}</p>
                    {external(links.sources.teamHistory, p.archive.source)}
                  </div>
                </Disclosure>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
