import { useId, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import styles from './Disclosure.module.css'

type Props = {
  title: ReactNode
  meta?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}

/** Accessible disclosure: button + region, closed content is inert (not focusable). */
export function Disclosure({ title, meta, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  const panelId = `${id}-panel`

  return (
    <div className={styles.root} data-open={open}>
      <button
        type="button"
        className={styles.button}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.title}>{title}</span>
        {meta ? <span className={styles.meta}>{meta}</span> : null}
        <span className={styles.chevron}>
          <Icon name="chevron" size={20} />
        </span>
      </button>
      <div id={panelId} className={styles.panel} role="region" inert={!open}>
        <div className={styles.inner}>{children}</div>
      </div>
    </div>
  )
}
