import { useEffect, useRef } from 'react'
import { useT } from '../content/LocaleContext'
import { useMotion } from '../motion/MotionContext'
import { setupReveal } from '../motion/motion'
import { CollabForm } from '../components/forms/CollabForm'
import { IdeaForm } from '../components/forms/IdeaForm'
import { JoinForm } from '../components/forms/JoinForm'
import styles from './Participation.module.css'

export type PathId = 'idea' | 'join' | 'collab'

type Props = {
  selected: PathId | null
  onSelect: (path: PathId | null) => void
  /** Increments each time an external control opens a path, so focus can move to the panel heading. */
  focusToken: number
  contextTag: string | null
  onClearContext: () => void
}

const PATHS: PathId[] = ['idea', 'join', 'collab']

export function Participation({ selected, onSelect, focusToken, contextTag, onClearContext }: Props) {
  const t = useT()
  const p = t.participation
  const { reduced } = useMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return
    return setupReveal(sectionRef.current, !reduced)
  }, [reduced])

  useEffect(() => {
    if (focusToken === 0 || !selected) return
    panelRef.current?.querySelector<HTMLElement>(`[data-form="${selected}"] [data-focus-target]`)?.focus({ preventScroll: true })
  }, [focusToken, selected])

  // All three forms stay mounted (inactive ones are hidden), so switching paths or language never loses input.
  return (
    <section id="participate" className={styles.section} ref={sectionRef} aria-labelledby="participate-title">
      <div className="container">
        <div className={styles.head} data-reveal>
          <h2 id="participate-title" className="section-title">
            {p.title}
          </h2>
          <p className={styles.lead}>{p.lead}</p>
        </div>

        <ol className={styles.paths}>
          {PATHS.map((id) => {
            const path = p.paths[id]
            const isOn = selected === id
            return (
              <li key={id} data-reveal>
                <button
                  type="button"
                  className={styles.path}
                  aria-pressed={isOn}
                  aria-controls="participation-panel"
                  onClick={() => onSelect(isOn ? null : id)}
                >
                  <span className={styles.number}>{path.number}</span>
                  <span className={styles.pathLabel}>{path.label}</span>
                  <span className={styles.pathHint}>{path.hint}</span>
                </button>
              </li>
            )
          })}
        </ol>

        <div id="participation-panel" className={styles.panelWrap} hidden={!selected} ref={panelRef}>
          <div className={styles.panel}>
            <div data-form="idea" hidden={selected !== 'idea'}>
              <IdeaForm contextTag={contextTag} onClearContext={onClearContext} active={selected === 'idea'} />
            </div>
            <div data-form="join" hidden={selected !== 'join'}>
              <JoinForm active={selected === 'join'} />
            </div>
            <div data-form="collab" hidden={selected !== 'collab'}>
              <CollabForm active={selected === 'collab'} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
