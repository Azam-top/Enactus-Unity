import type { ReactNode } from 'react'
import styles from './forms.module.css'

export type ControlProps = {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
  'aria-required': true | undefined
}

type Props = {
  id: string
  label: ReactNode
  required?: boolean
  hint?: ReactNode
  error?: string
  counter?: string
  children: (control: ControlProps) => ReactNode
}

/** Label + control + helper + live error, wired with ids so screen readers get the right relationships. */
export function Field({ id, label, required, hint, error, counter, children }: Props) {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint || counter ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ')

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
      })}
      {(hint || counter) && (
        <p id={hintId} className={styles.meta}>
          {hint ? <span>{hint}</span> : null}
          {counter ? <span className={styles.counter}>{counter}</span> : null}
        </p>
      )}
      <p id={errorId} className={styles.error} aria-live="polite">
        {error}
      </p>
    </div>
  )
}
