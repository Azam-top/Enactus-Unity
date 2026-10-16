import { features } from '../config/features'
import type { SubmissionEnvelope } from '../shared/validation'

export class SubmissionUnavailableError extends Error {
  constructor() {
    super('Submission is not available in the preview build')
    this.name = 'SubmissionUnavailableError'
  }
}

export type RejectionKind = 'rate_limited' | 'captcha' | 'invalid' | 'conflict' | 'server' | 'network'

export class SubmissionRejectedError extends Error {
  kind: RejectionKind
  constructor(kind: RejectionKind) {
    super(`Submission rejected: ${kind}`)
    this.name = 'SubmissionRejectedError'
    this.kind = kind
  }
}

export type SubmissionResult = { referenceId: string }

export interface SubmissionClient {
  submit(envelope: SubmissionEnvelope, signal?: AbortSignal): Promise<SubmissionResult>
}

/** Preview adapter: never fakes a success. Used until the owner enables the real endpoint. */
const previewClient: SubmissionClient = {
  submit() {
    return Promise.reject(new SubmissionUnavailableError())
  },
}

const RECEIPT = /^EK-[0-9A-F]{10}$/

/** Real client: success is reported ONLY when the server confirms persistence with a well-formed receipt. */
const httpClient: SubmissionClient = {
  async submit(envelope, signal) {
    let response: Response
    try {
      response = await fetch(features.submissionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
        signal,
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
      })
    } catch {
      throw new SubmissionRejectedError('network') // offline, DNS, CORS or our own timeout abort
    }

    const data = (await response.json().catch(() => null)) as { referenceId?: unknown; error?: unknown } | null
    if ((response.status === 201 || response.status === 200) && typeof data?.referenceId === 'string' && RECEIPT.test(data.referenceId)) {
      return { referenceId: data.referenceId }
    }
    if (response.status === 429) throw new SubmissionRejectedError('rate_limited')
    if (response.status === 403 && data?.error === 'captcha_failed') throw new SubmissionRejectedError('captcha')
    if (response.status === 400) throw new SubmissionRejectedError('invalid')
    if (response.status === 409) throw new SubmissionRejectedError('conflict')
    throw new SubmissionRejectedError('server')
  },
}

export function getSubmissionClient(): SubmissionClient {
  return features.submissionEnabled ? httpClient : previewClient
}

export const newIdempotencyKey = (): string => crypto.randomUUID()
