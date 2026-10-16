import { useT } from '../../content/LocaleContext'
import type { SubmitState } from './useSubmission'
import styles from './forms.module.css'

/** Honest outcome messages. "unavailable" is the preview state: nothing was sent and nothing pretends it was. */
export function SubmitFeedback({ state }: { state: SubmitState }) {
  const c = useT().participation.common
  return (
    <div aria-live="polite">
      {state.status === 'unavailable' && (
        <p className={styles.notice} role="status">
          <strong>{c.unavailable}</strong>
          {c.unavailableDetail}
        </p>
      )}
      {state.status === 'rateLimited' && (
        <p className={styles.errorNotice} role="alert">
          {c.rateLimited}
        </p>
      )}
      {state.status === 'captcha' && (
        <p className={styles.errorNotice} role="alert">
          {c.captchaFailed}
        </p>
      )}
      {state.status === 'error' && (
        <p className={styles.errorNotice} role="alert">
          {c.networkError}
        </p>
      )}
    </div>
  )
}
