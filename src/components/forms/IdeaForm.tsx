import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useT } from '../../content/LocaleContext'
import { fmt } from '../../content/locales'
import { features } from '../../config/features'
import { clearDraft, loadDraft, saveDraft } from '../../services/draft'
import {
  hasErrors,
  LIMITS,
  normalizeContact,
  SUPPORT_IDS,
  THEME_IDS,
  validateContact,
  validateIdeaStep1,
  validateIdeaStep2,
  type ContactInput,
  type IdeaInput,
} from '../../shared/validation'
import { Icon } from '../Icon'
import { ChipGroup } from './ChipGroup'
import { ContactFields } from './ContactFields'
import { Field } from './Field'
import { CaptchaField, useCaptcha } from './Turnstile'
import { SubmitFeedback } from './SubmitFeedback'
import { useErrorText } from './useErrorText'
import { useSubmission } from './useSubmission'
import styles from './forms.module.css'

type Step = 1 | 2 | 3

const initial: IdeaInput = {
  problem: '',
  beneficiary: '',
  themes: [],
  solution: '',
  onlyProblem: false,
  support: [],
  name: '',
  method: 'email',
  contact: '',
  consent: false,
}

type Props = { contextTag: string | null; onClearContext: () => void; active: boolean }

export function IdeaForm({ contextTag, onClearContext, active }: Props) {
  const t = useT()
  const c = t.participation.common
  const i = t.participation.idea
  const errorText = useErrorText()
  const formRef = useRef<HTMLFormElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const stepChanged = useRef(false)
  const skipNextSave = useRef(false)

  const [values, setValues] = useState<IdeaInput>(initial)
  const [step, setStep] = useState<Step>(1)
  const [shown, setShown] = useState<Record<Step, boolean>>({ 1: false, 2: false, 3: false })
  const [invalidTick, setInvalidTick] = useState(0)
  const [copy, setCopy] = useState<'' | 'ok' | 'fail'>('')
  const [keepDraft, setKeepDraft] = useState(false)
  const [draftNote, setDraftNote] = useState<'' | 'saved' | 'restored' | 'deleted'>('')
  const [draftUntil, setDraftUntil] = useState<number | null>(null)
  const { state, submit } = useSubmission('idea')
  const captcha = useCaptcha()

  const update = (patch: Partial<IdeaInput>) => {
    setValues((v) => ({ ...v, ...patch }))
    setCopy('')
  }

  // Restore a saved draft once (opt-in feature: only exists if the visitor saved one earlier).
  useEffect(() => {
    const draft = loadDraft()
    if (!draft) return
    skipNextSave.current = true
    setValues((v) => ({ ...v, problem: draft.problem, beneficiary: draft.beneficiary, solution: draft.solution, themes: draft.themes }))
    setKeepDraft(true)
    setDraftNote('restored')
    setDraftUntil(draft.savedAt + features.draftMaxAgeDays * 86_400_000)
  }, [])

  // Autosave only while the visitor has explicitly opted in. Idea text and themes only — never contact details.
  useEffect(() => {
    if (!keepDraft) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    const timer = window.setTimeout(() => {
      const { problem, beneficiary, solution, themes } = values
      if (!problem.trim() && !beneficiary.trim() && !solution.trim() && !themes.length) {
        clearDraft()
        setDraftUntil(null)
        return
      }
      setDraftUntil(saveDraft({ problem, beneficiary, solution, themes }))
      setDraftNote('saved')
    }, 400)
    return () => window.clearTimeout(timer)
  }, [keepDraft, values.problem, values.beneficiary, values.solution, values.themes]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.status === 'success') clearDraft()
  }, [state.status])

  useEffect(() => {
    if (stepChanged.current) headingRef.current?.focus({ preventScroll: true })
  }, [step])

  useEffect(() => {
    if (invalidTick > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [invalidTick])

  const goTo = (next: Step) => {
    stepChanged.current = true
    setStep(next)
  }
  const failStep = (s: Step) => {
    setShown((cur) => ({ ...cur, [s]: true }))
    setInvalidTick((n) => n + 1)
  }

  const e1 = shown[1] ? validateIdeaStep1(values) : {}
  const e2 = shown[2] ? validateIdeaStep2(values) : {}
  const e3 = shown[3] ? validateContact(values) : {}

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (step === 1) {
      if (hasErrors(validateIdeaStep1(values))) return failStep(1)
      goTo(2)
    } else if (step === 2) {
      if (hasErrors(validateIdeaStep2(values))) return failStep(2)
      goTo(3)
    } else {
      if (state.status === 'submitting') return
      if (hasErrors(validateContact(values))) return failStep(3)
      const check = captcha.consume()
      if (!check.ok) return
      void submit(
        {
        problem: values.problem.trim(),
        beneficiary: values.beneficiary.trim(),
        themes: values.themes,
        solution: values.onlyProblem ? '' : values.solution.trim(),
        onlyProblem: values.onlyProblem,
        support: values.support,
        name: values.name.trim(),
        contactMethod: values.method,
        contact: normalizeContact(values.method, values.contact),
        consent: values.consent,
        context: contextTag ?? '',
        },
        check.token,
      ).finally(() => captcha.reset())
    }
  }

  const ideaText = (): string => {
    const lines: string[] = []
    if (contextTag) lines.push(`${c.context}: ${contextTag}`)
    lines.push(values.problem.trim())
    if (values.beneficiary.trim()) lines.push(`${i.step3.summaryBeneficiary}: ${values.beneficiary.trim()}`)
    if (values.themes.length) lines.push(`${i.step3.summaryThemes}: ${values.themes.map((id) => i.themes[id]).join(', ')}`)
    if (values.onlyProblem) lines.push(i.step3.onlyProblemSummary)
    else if (values.solution.trim()) lines.push(`${i.step3.summarySolution}: ${values.solution.trim()}`)
    if (values.support.length) lines.push(`${i.step3.summarySupport}: ${values.support.map((id) => i.support[id]).join(', ')}`)
    return lines.filter(Boolean).join('\n\n')
  }

  const copyIdea = async () => {
    try {
      await navigator.clipboard.writeText(ideaText())
      setCopy('ok')
    } catch {
      setCopy('fail')
    }
  }

  const deleteDraft = () => {
    clearDraft()
    setKeepDraft(false)
    setDraftUntil(null)
    setDraftNote('deleted')
  }

  const copyButton = (
    <button type="button" className="btn btn--ghost" onClick={copyIdea} disabled={!values.problem.trim()}>
      <Icon name={copy === 'ok' ? 'check' : 'copy'} size={18} />
      {i.copy}
    </button>
  )
  const copyStatus = (
    <p className={styles.status} role="status" aria-live="polite">
      {copy === 'ok' ? i.copied : copy === 'fail' ? i.copyFailed : ''}
    </p>
  )

  if (state.status === 'success') {
    return (
      <div className={styles.success}>
        <h3 className={styles.successTitle} tabIndex={-1} data-focus-target>
          {i.successTitle}
        </h3>
        <p className={styles.reference}>
          {fmt(i.successReference, { id: state.referenceId })}
        </p>
      </div>
    )
  }

  const summaryRows: { key: string; label: string; value: string; target: Step }[] = [
    { key: 'problem', label: i.step3.summaryProblem, value: values.problem.trim(), target: 1 },
    ...(values.beneficiary.trim()
      ? [{ key: 'beneficiary', label: i.step3.summaryBeneficiary, value: values.beneficiary.trim(), target: 1 as Step }]
      : []),
    ...(values.themes.length
      ? [{ key: 'themes', label: i.step3.summaryThemes, value: values.themes.map((id) => i.themes[id]).join(', '), target: 1 as Step }]
      : []),
    {
      key: 'solution',
      label: i.step3.summarySolution,
      value: values.onlyProblem ? i.step3.onlyProblemSummary : values.solution.trim() || c.notProvided,
      target: 2,
    },
    ...(values.support.length
      ? [{ key: 'support', label: i.step3.summarySupport, value: values.support.map((id) => i.support[id]).join(', '), target: 2 as Step }]
      : []),
  ]

  const headings: Record<Step, string> = { 1: i.step1.heading, 2: i.step2.heading, 3: i.step3.heading }
  const submitting = state.status === 'submitting'

  return (
    <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
      {step === 1 && <p className={styles.intro}>{i.intro}</p>}
      {contextTag && (
        <p className={styles.contextTag}>
          <span>
            {c.context}: <strong>{contextTag}</strong>
          </span>
          <button type="button" className={styles.contextRemove} onClick={onClearContext} aria-label={c.removeContext}>
            <Icon name="close" size={16} />
          </button>
        </p>
      )}

      <p className={styles.stepLabel} style={{ marginTop: 24 }}>
        {fmt(c.stepOf, { n: step, total: 3 })}
      </p>
      <h3 className={styles.stepTitle} tabIndex={-1} ref={headingRef} data-focus-target>
        {headings[step]}
      </h3>

      {step === 1 && (
        <>
          <Field
            id="idea-problem"
            label={i.step1.problemLabel}
            required
            hint={i.step1.problemHelper}
            counter={fmt(c.charCount, { count: values.problem.length, max: LIMITS.problemMax })}
            error={errorText(e1.problem, { min: LIMITS.problemMin, max: LIMITS.problemMax })}
          >
            {(control) => (
              <textarea
                {...control}
                className={styles.textarea}
                rows={5}
                maxLength={LIMITS.problemMax}
                value={values.problem}
                onChange={(e) => update({ problem: e.target.value })}
              />
            )}
          </Field>

          <Field
            id="idea-beneficiary"
            label={i.step1.beneficiaryLabel}
            error={errorText(e1.beneficiary, { max: LIMITS.beneficiaryMax })}
          >
            {(control) => (
              <input
                {...control}
                className={styles.input}
                type="text"
                maxLength={LIMITS.beneficiaryMax}
                value={values.beneficiary}
                onChange={(e) => update({ beneficiary: e.target.value })}
              />
            )}
          </Field>

          <ChipGroup
            label={i.step1.themesLabel}
            options={THEME_IDS.map((id) => ({ id, label: i.themes[id] }))}
            value={values.themes}
            onChange={(themes) => update({ themes })}
          />

          <div className={styles.draft}>
            <label className={styles.check} style={{ marginTop: 0 }}>
              <input
                type="checkbox"
                checked={keepDraft}
                onChange={(e) => {
                  if (e.target.checked) {
                    setKeepDraft(true)
                    setDraftNote('')
                  } else deleteDraft()
                }}
              />
              <span>
                {i.draft.label}
                <span className={styles.hint}>{i.draft.hint}</span>
              </span>
            </label>
            <p className={styles.status} role="status" aria-live="polite">
              {draftNote === 'restored' && i.draft.restored}
              {draftNote === 'saved' && draftUntil && fmt(i.draft.saved, { date: new Date(draftUntil).toLocaleDateString(t.meta.lang) })}
              {draftNote === 'deleted' && i.draft.deleted}
            </p>
            {keepDraft && draftUntil && (
              <button type="button" className={styles.linkButton} onClick={deleteDraft}>
                {i.draft.delete}
              </button>
            )}
          </div>

          <div className={styles.actions}>
            <button type="submit" className="btn btn--primary">
              {c.next}
              <Icon name="arrow" size={18} />
            </button>
            {copyButton}
          </div>
          {copyStatus}
        </>
      )}

      {step === 2 && (
        <>
          <label className={styles.check}>
            <input type="checkbox" checked={values.onlyProblem} onChange={(e) => update({ onlyProblem: e.target.checked })} />
            <span>
              {i.step2.onlyProblem}
              <span className={styles.hint}>{i.step2.onlyProblemHint}</span>
            </span>
          </label>

          {!values.onlyProblem && (
            <Field
              id="idea-solution"
              label={i.step2.solutionLabel}
              counter={fmt(c.charCount, { count: values.solution.length, max: LIMITS.solutionMax })}
              error={errorText(e2.solution, { max: LIMITS.solutionMax })}
            >
              {(control) => (
                <textarea
                  {...control}
                  className={styles.textarea}
                  rows={5}
                  maxLength={LIMITS.solutionMax}
                  value={values.solution}
                  onChange={(e) => update({ solution: e.target.value })}
                />
              )}
            </Field>
          )}

          <ChipGroup
            label={i.step2.supportLabel}
            options={SUPPORT_IDS.map((id) => ({ id, label: i.support[id] }))}
            value={values.support}
            onChange={(support) => update({ support })}
          />

          <div className={styles.actions}>
            <button type="button" className="btn btn--ghost" onClick={() => goTo(1)}>
              {c.back}
            </button>
            <button type="submit" className="btn btn--primary">
              {c.next}
              <Icon name="arrow" size={18} />
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className={styles.summary}>
            <p className={styles.summaryTitle}>{c.summaryTitle}</p>
            <dl>
              {summaryRows.map((row) => (
                <div key={row.key} className={styles.summaryRow}>
                  <dt>{row.label}</dt>
                  <dd>
                    <span className={styles.summaryValue}>{row.value}</span>
                    <button type="button" className={styles.summaryEdit} onClick={() => goTo(row.target)}>
                      {c.edit}
                      <span className="visually-hidden">: {row.label}</span>
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <ContactFields
            idPrefix="idea"
            value={values as ContactInput}
            onChange={(patch) => update(patch)}
            errors={e3}
          />

          <CaptchaField captcha={captcha} active={active && step === 3} />
          <SubmitFeedback state={state} />

          <div className={styles.actions}>
            <button type="button" className="btn btn--ghost" onClick={() => goTo(2)}>
              {c.back}
            </button>
            <button type="submit" className="btn btn--primary" aria-disabled={submitting} onClick={(e) => submitting && e.preventDefault()}>
              {submitting ? c.submitting : state.status === 'error' ? c.retry : i.submit}
            </button>
            {copyButton}
          </div>
          {copyStatus}
        </>
      )}
    </form>
  )
}
