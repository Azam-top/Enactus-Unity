import { useId } from 'react'
import { Link } from 'react-router-dom'
import { useLocale, useT } from '../../content/LocaleContext'
import { features } from '../../config/features'
import {
  CONTACT_METHODS,
  LIMITS,
  type ContactInput,
  type ContactKey,
  type ContactMethod,
  type Errors,
} from '../../shared/validation'
import { Field } from './Field'
import { useErrorText } from './useErrorText'
import styles from './forms.module.css'

type Props = {
  idPrefix: string
  value: ContactInput
  onChange: (patch: Partial<ContactInput>) => void
  errors: Errors<ContactKey>
}

/** Name, one contact method with a matching required field, and the consent checkbox — shared by all three paths. */
export function ContactFields({ idPrefix, value, onChange, errors }: Props) {
  const t = useT()
  const locale = useLocale()
  const errorText = useErrorText()
  const c = t.participation.common
  const methodName = useId()
  const method: ContactMethod = value.method

  return (
    <>
      <Field
        id={`${idPrefix}-name`}
        label={c.nameLabel}
        error={errorText(errors.name, { max: LIMITS.nameMax })}
      >
        {(control) => (
          <input
            {...control}
            className={styles.input}
            type="text"
            autoComplete="name"
            maxLength={LIMITS.nameMax + 20}
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        )}
      </Field>

      <fieldset className={styles.fieldset}>
        <legend>{c.methodLabel}</legend>
        <div className={styles.chips}>
          {CONTACT_METHODS.map((m) => (
            <label key={m} className={styles.radio}>
              <input
                type="radio"
                name={methodName}
                value={m}
                checked={method === m}
                onChange={() => onChange({ method: m })}
              />
              <span>{c.methods[m]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field id={`${idPrefix}-contact`} label={c.contactLabels[method]} required error={errorText(errors.contact)}>
        {(control) => (
          <input
            {...control}
            className={styles.input}
            type={method === 'email' ? 'email' : 'text'}
            inputMode={method === 'email' ? 'email' : 'text'}
            autoComplete={method === 'email' ? 'email' : 'off'}
            autoCapitalize="none"
            spellCheck={false}
            maxLength={LIMITS.contactMax + 20}
            placeholder={c.contactPlaceholders[method]}
            value={value.contact}
            onChange={(e) => onChange({ contact: e.target.value })}
          />
        )}
      </Field>

      {features.showPrivateSubmissionNote && <p className={styles.intro}>{c.privateNote}</p>}

      <div>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={value.consent}
            aria-required="true"
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? `${idPrefix}-consent-error` : undefined}
            onChange={(e) => onChange({ consent: e.target.checked })}
          />
          <span>
            {c.consent}{' '}
            <Link to={`/${locale}/privacy`} target="_blank" rel="noopener noreferrer">
              {c.consentLink}
              <span className="visually-hidden"> ({t.a11y.externalLink})</span>
            </Link>
          </span>
        </label>
        <p id={`${idPrefix}-consent-error`} className={styles.error} aria-live="polite">
          {errorText(errors.consent)}
        </p>
      </div>
    </>
  )
}
