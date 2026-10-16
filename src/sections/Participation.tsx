import { lazy, Suspense, useEffect, useRef, type ElementType } from 'react'
import { useT } from '../content/LocaleContext'
import { Icon, type IconName } from '../components/Icon'
import { PathArt } from '../components/PathArt'
import { useMotion } from '../motion/MotionContext'
import { useAfterIdle } from '../hooks/useAfterIdle'
import { BentoCard, BentoGrid } from '@/components/ui/bento-grid'
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
const ICON_NAMES: Record<PathId, IconName> = { idea: 'plane', join: 'hands', collab: 'link' }
const ICONS: Record<PathId, ElementType> = {
  idea: ({ className }: { className?: string }) => <Icon name={ICON_NAMES.idea} size={48} className={className} />,
  join: ({ className }: { className?: string }) => <Icon name={ICON_NAMES.join} size={48} className={className} />,
  collab: ({ className }: { className?: string }) => <Icon name={ICON_NAMES.collab} size={48} className={className} />,
}

// The border beam (and the `motion` library behind it) is loaded after first paint, only where motion is allowed.
const BorderBeam = lazy(() => import('@/components/ui/border-beam').then((m) => ({ default: m.BorderBeam })))

export function Participation({ selected, onSelect, focusToken, contextTag, onClearContext }: Props) {
  const t = useT()
  const p = t.participation
  const { reduced } = useMotion()
  const idle = useAfterIdle()
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

        {/* Bento: the idea path is the large tile (the primary action); the other two stack beside it. */}
        <BentoGrid className={styles.paths} role="list">
          {PATHS.map((id) => {
            const path = p.paths[id]
            const isOn = selected === id
            return (
              <BentoCard
                key={id}
                role="listitem"
                name={path.label}
                description={path.hint}
                cta={path.cta}
                Icon={ICONS[id]}
                background={<PathArt id={id} />}
                pressed={isOn}
                controls="participation-panel"
                onSelect={() => onSelect(isOn ? null : id)}
                className={id === 'idea' ? 'lg:col-span-2 lg:row-span-2' : undefined}
              >
                {id === 'idea' && !reduced && idle && (
                  <Suspense fallback={null}>
                    <BorderBeam size={150} duration={9} borderWidth={2} colorFrom="#ffc222" colorTo="#e8ad0c" />
                  </Suspense>
                )}
              </BentoCard>
            )
          })}
        </BentoGrid>

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
