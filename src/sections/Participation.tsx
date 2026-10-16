import { useEffect, useRef } from 'react'
import { useT } from '../content/LocaleContext'
import { Icon, type IconName } from '../components/Icon'
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
const ICONS: Record<PathId, IconName> = { idea: 'plane', join: 'hands', collab: 'link' }

export function Participation({ selected, onSelect, focusToken, contextTag, onClearContext }: Props) {
  const t = useT()
  const p = t.participation
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (focusToken === 0 || !selected) return
    panelRef.current?.querySelector<HTMLElement>(`[data-form="${selected}"] [data-focus-target]`)?.focus({ preventScroll: true })
  }, [focusToken, selected])

  // All three forms stay mounted (inactive ones are hidden), so switching paths or language never loses input.
  return (
    <section id="participate" className={styles.section} aria-labelledby="participate-title">
      <div className="container">
        <div className={styles.head}>
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
              <li key={id}>
                <button
                  type="button"
                  className={styles.path}
                  aria-pressed={isOn}
                  aria-controls="participation-panel"
                  onClick={() => onSelect(isOn ? null : id)}
                >
                  <span className={styles.icon}>
                    <Icon name={ICONS[id]} size={26} />
                  </span>
                  <span className={styles.pathLabel}>{path.label}</span>
                  <span className={styles.pathHint}>{path.hint}</span>
                  <span className={styles.go} aria-hidden="true">
                    <Icon name="arrow" size={20} />
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        <div id="participation-panel" className={styles.panelWrap} hidden={!selected} ref={panelRef}>
          <div className={`fold ${styles.panel}`}>
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
