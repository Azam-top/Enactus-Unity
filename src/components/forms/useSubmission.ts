import { useCallback, useRef, useState } from 'react'
import { useLocale } from '../../content/LocaleContext'
import { features } from '../../config/features'
import {
  getSubmissionClient,
  newIdempotencyKey,
  SubmissionRejectedError,
  SubmissionUnavailableError,
} from '../../services/submission'
import type { SubmissionType } from '../../shared/validation'

export type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'unavailable' }
  | { status: 'rateLimited' }
  | { status: 'captcha' }
  | { status: 'error' }
  | { status: 'success'; referenceId: string }

const TIMEOUT_MS = 15_000

/**
 * One idempotency key per distinct payload: a retry of the same data reuses it (so the server can dedupe),
 * edited data gets a new one. Duplicate clicks are ignored while a request is in flight. A failure, timeout or
 * "unavailable" never clears what the visitor typed — the form state lives in the caller.
 */
export function useSubmission(type: SubmissionType) {
  const locale = useLocale()
  const [state, setState] = useState<SubmitState>({ status: 'idle' })
  const inFlight = useRef(false)
  const key = useRef<{ signature: string; value: string } | null>(null)

  const submit = useCallback(
    async (payload: Record<string, unknown>, captchaToken?: string) => {
      if (inFlight.current) return
      inFlight.current = true
      setState({ status: 'submitting' })

      const signature = JSON.stringify(payload)
      if (key.current?.signature !== signature) key.current = { signature, value: newIdempotencyKey() }

      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
      try {
        const result = await getSubmissionClient().submit(
          { type, locale, consentVersion: features.consentVersion, idempotencyKey: key.current.value, captchaToken, payload },
          controller.signal,
        )
        key.current = null
        setState({ status: 'success', referenceId: result.referenceId })
      } catch (error) {
        if (error instanceof SubmissionUnavailableError) setState({ status: 'unavailable' })
        else if (error instanceof SubmissionRejectedError && error.kind === 'rate_limited') setState({ status: 'rateLimited' })
        else if (error instanceof SubmissionRejectedError && error.kind === 'captcha') setState({ status: 'captcha' })
        else setState({ status: 'error' })
      } finally {
        window.clearTimeout(timer)
        inFlight.current = false
      }
    },
    [locale, type],
  )

  return { state, submit }
}
