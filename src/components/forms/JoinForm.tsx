import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useT } from '../../content/LocaleContext'
import { fmt } from '../../content/locales'
import {
  hasErrors,
  LIMITS,
  normalizeContact,
  SKILL_IDS,
  validateJoin,
  type JoinInput,
} from '../../shared/validation'
import { ChipGroup } from './ChipGroup'
import { ContactFields } from './ContactFields'
import { Field } from './Field'
import { CaptchaField, useCaptcha } from './Turnstile'
import { SubmitFeedback } from './SubmitFeedback'
import { useErrorText } from './useErrorText'
import { useSubmission } from './useSubmission'
import styles from './forms.module.css'

const initial: JoinInput = { skills: [], message: '', name: '', method: 'email', contact: '', consent: false }

export function JoinForm({ active }: { active: boolean }) {
  const t = useT()
  const c = t.participation.common
  const j = t.participation.join
  const errorText = useErrorText()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<JoinInput>(initial)
  const [showErrors, setShowErrors] = useState(false)
  const [invalidTick, setInvalidTick] = useState(0)
  const { state, submit } = useSubmission('join')
  const captcha = useCaptcha()
  const errors = showErrors ? validateJoin(values) : {}
  const update = (patch: Partial<JoinInput>) => setValues((v) => ({ ...v, ...patch }))

  useEffect(() => {
    if (invalidTick > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [invalidTick])

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (state.status === 'submitting') return
    if (hasErrors(validateJoin(values))) {
      setShowErrors(true)
      setInvalidTick((n) => n + 1)
      return
    }
    const check = captcha.consume()
    if (!check.ok) return
    void submit(
      {
        skills: values.skills,
        message: values.message.trim(),
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
          {j.successTitle}
        </h3>
        <p className={styles.reference}>{fmt(t.participation.idea.successReference, { id: state.referenceId })}</p>
      </div>
    )
  }

  const submitting = state.status === 'submitting'
  return (
    <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
      <h3 className={styles.stepTitle} tabIndex={-1} data-focus-target>
        {j.heading}
      </h3>
      <p className={styles.intro} style={{ marginTop: 12 }}>
        {j.intro}
      </p>

      <ChipGroup
        label={j.skillsLabel}
        options={SKILL_IDS.map((id) => ({ id, label: j.skills[id] }))}
        value={values.skills}
        onChange={(skills) => update({ skills })}
      />

      <Field
        id="join-message"
        label={j.messageLabel}
        counter={fmt(c.charCount, { count: values.message.length, max: LIMITS.messageMax })}
        error={errorText(errors.message, { max: LIMITS.messageMax })}
      >
        {(control) => (
          <textarea
            {...control}
            className={styles.textarea}
            rows={4}
            maxLength={LIMITS.messageMax}
            value={values.message}
            onChange={(e) => update({ message: e.target.value })}
          />
        )}
      </Field>

      <ContactFields idPrefix="join" value={values} onChange={update} errors={errors} />
      <CaptchaField captcha={captcha} active={active} />
      <SubmitFeedback state={state} />

      <div className={styles.actions}>
        <button type="submit" className="btn btn--primary" aria-disabled={submitting} onClick={(e) => submitting && e.preventDefault()}>
          {submitting ? c.submitting : state.status === 'error' ? c.retry : j.submit}
        </button>
      </div>
    </form>
  )
}
