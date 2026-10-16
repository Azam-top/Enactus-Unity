import { useId } from 'react'
import styles from './forms.module.css'

type Option<T extends string> = { id: T; label: string }

type Props<T extends string> = {
  label: string
  options: readonly Option<T>[]
  value: readonly T[]
  onChange: (next: T[]) => void
}

/** Multi-select chips; each chip is a toggle button exposing aria-pressed. */
export function ChipGroup<T extends string>({ label, options, value, onChange }: Props<T>) {
  const labelId = useId()
  const toggle = (id: T) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])

  return (
    <div className={styles.field} role="group" aria-labelledby={labelId}>
      <span id={labelId} className={styles.label}>
        {label}
      </span>
      <div className={styles.chips}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={styles.chip}
            aria-pressed={value.includes(option.id)}
            onClick={() => toggle(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
