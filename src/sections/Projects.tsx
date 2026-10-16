import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useT } from '../content/LocaleContext'
import { links } from '../config/links'
import { Icon } from '../components/Icon'
import { Disclosure } from '../components/Disclosure'
import { useMotion } from '../motion/MotionContext'
import { useAfterIdle } from '../hooks/useAfterIdle'
import { prefersSaveData, setupRidgeParallax } from '../motion/motion'
import styles from './Projects.module.css'

// A fluid solver on the GPU: loaded as its own chunk, and only on screens that can afford it (see `ink` below).
const DyeWhorl = lazy(() => import('@/components/ui/dye-whorl'))

type Props = { onDiscuss: (contextTag: string) => void }

// Paper-cut ridge silhouettes (the Alatau layers of the illustration). Decorative, three depths.
const RIDGES = [
  'M0 300V150L90 96L170 140L260 60L350 126L450 40L540 112L650 70L740 150L850 52L960 120L1060 78L1160 140L1260 90L1350 130L1440 100V300Z',
  'M0 300V190L110 140L210 176L330 108L430 170L560 120L660 184L790 112L900 176L1020 130L1130 190L1250 134L1340 170L1440 140V300Z',
  'M0 300V232L120 196L240 224L380 170L500 218L640 184L760 228L900 178L1030 226L1160 192L1290 226L1440 196V300Z',
]

export function Projects({ onDiscuss }: Props) {
  const t = useT()
  const p = t.projects
  const sectionRef = useRef<HTMLElement>(null)
  const ridgeRefs = useRef<(HTMLDivElement | null)[]>([])
  const { reduced } = useMotion()
  const [ink, setInk] = useState(false)
  const idle = useAfterIdle()

  // Ink in the dark chapter: ≥768px, no Save-Data, WebGL2 present (the component itself bails out without it).
  // Mounted once, after the page is idle and the chapter is within ~half a screen of the viewport; it then sleeps whenever off screen.
  useEffect(() => {
    const section = sectionRef.current
    if (!section || ink || !idle) return
    if (!window.matchMedia('(min-width: 768px)').matches || prefersSaveData() || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInk(true)
          io.disconnect()
        }
      },
      { rootMargin: '450px 0px' },
    )
    io.observe(section)
    return () => io.disconnect()
  }, [ink, idle])

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const layers = ridgeRefs.current.filter((el): el is HTMLDivElement => el !== null)
    return setupRidgeParallax(section, layers, !reduced)
  }, [reduced])

  const external = (href: string, text: string) => (
    <a className={`link ${styles.source}`} href={href} target="_blank" rel="noopener noreferrer">
      {text}
      <span className="visually-hidden"> ({t.a11y.externalLink})</span>
      <Icon name="external" size={16} />
    </a>
  )

  return (
    <section id="projects" className={`on-dark ${styles.section}`} ref={sectionRef} aria-labelledby="projects-title" data-dye-surface="">
      <div className={styles.backdrop} aria-hidden="true">
        {ink && (
          <div className={styles.ink}>
            <Suspense fallback={null}>
              <DyeWhorl paused={reduced} className="h-full w-full" />
            </Suspense>
          </div>
        )}
        {RIDGES.map((d, i) => (
          <div key={i} className={styles.ridge} ref={(el) => void (ridgeRefs.current[i] = el)} data-depth={i}>
            <svg viewBox="0 0 1440 300" preserveAspectRatio="none" focusable="false">
              <path d={d} />
            </svg>
          </div>
        ))}
      </div>

      <div className={`container ${styles.content}`}>
        <header className={styles.head}>
          <h2 id="projects-title" className="section-title">
            {p.title}
          </h2>
          <p className={styles.lead}>{p.lead}</p>
        </header>

        <article className={styles.featured} aria-labelledby="case-asyl-zher">
          <p className={`tag ${styles.tag}`}>{p.featured.tag}</p>
          <h3 id="case-asyl-zher" className={styles.caseName}>
            {p.featured.name}
          </h3>

          <div className={styles.caseGrid}>
            <div className={styles.caseMain}>
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
          </div>
        </article>

        <div className={styles.archive}>
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
