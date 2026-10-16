import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useT } from '../../content/LocaleContext'
import { fmt } from '../../content/locales'
import { hasErrors, LIMITS, normalizeContact, validateCollab, type CollabInput } from '../../shared/validation'
import { ContactFields } from './ContactFields'
import { Field } from './Field'
import { CaptchaField, useCaptcha } from './Turnstile'
import { SubmitFeedback } from './SubmitFeedback'
import { useErrorText } from './useErrorText'
import { useSubmission } from './useSubmission'
import styles from './forms.module.css'

const initial: CollabInput = { organization: '', proposal: '', name: '', method: 'email', contact: '', consent: false }

export function CollabForm({ active }: { active: boolean }) {
  const t = useT()
  const c = t.participation.common
  const k = t.participation.collab
  const errorText = useErrorText()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<CollabInput>(initial)
  const [showErrors, setShowErrors] = useState(false)
  const [invalidTick, setInvalidTick] = useState(0)
  const { state, submit } = useSubmission('partner')
  const captcha = useCaptcha()
  const errors = showErrors ? validateCollab(values) : {}
  const update = (patch: Partial<CollabInput>) => setValues((v) => ({ ...v, ...patch }))

  useEffect(() => {
    if (invalidTick > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [invalidTick])

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (state.status === 'submitting') return
    if (hasErrors(validateCollab(values))) {
      setShowErrors(true)
      setInvalidTick((n) => n + 1)
      return
    }
    const check = captcha.consume()
    if (!check.ok) return
    void submit(
      {
        organization: values.organization.trim(),
        proposal: values.proposal.trim(),
        name: values.name.trim(),
        contactMethod: values.method,
        contact: normalizeContact(values.method, values.contact),
        consent: values.consent,
      },
      check.token,
    ).finally(() => captcha.reset())
  }

  if (state.status === 'success') {
    return (
      <div className={styles.success}>
        <h3 className={styles.successTitle} tabIndex={-1} data-focus-target>
          {k.successTitle}
        </h3>
        <p className={styles.reference}>{fmt(t.participation.idea.successReference, { id: state.referenceId })}</p>
      </div>
    )
  }

  const submitting = state.status === 'submitting'
  return (
    <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
      <h3 className={styles.stepTitle} tabIndex={-1} data-focus-target>
        {k.heading}
      </h3>
      <p className={styles.intro} style={{ marginTop: 12 }}>
        {k.intro}
      </p>

      <Field
        id="collab-organization"
        label={k.organizationLabel}
        required
        error={errorText(errors.organization, { max: LIMITS.organizationMax })}
      >
        {(control) => (
          <input
            {...control}
            className={styles.input}
            type="text"
            autoComplete="organization"
            maxLength={LIMITS.organizationMax}
            value={values.organization}
            onChange={(e) => update({ organization: e.target.value })}
          />
        )}
      </Field>

      <Field
        id="collab-proposal"
        label={k.proposalLabel}
        required
        counter={fmt(c.charCount, { count: values.proposal.length, max: LIMITS.proposalMax })}
        error={errorText(errors.proposal, { min: LIMITS.proposalMin, max: LIMITS.proposalMax })}
      >
        {(control) => (
          <textarea
            {...control}
            className={styles.textarea}
            rows={5}
            maxLength={LIMITS.proposalMax}
            value={values.proposal}
            onChange={(e) => update({ proposal: e.target.value })}
          />
        )}
      </Field>

      <ContactFields idPrefix="collab" value={values} onChange={update} errors={errors} />
      <CaptchaField captcha={captcha} active={active} />
      <SubmitFeedback state={state} />

      <div className={styles.actions}>
        <button type="submit" className="btn btn--primary" aria-disabled={submitting} onClick={(e) => submitting && e.preventDefault()}>
          {submitting ? c.submitting : state.status === 'error' ? c.retry : k.submit}
        </button>
      </div>
    </form>
  )
}
