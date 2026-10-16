// Shared validation. Pure TS with no DOM or React imports so the future server function can reuse it.
// Errors are codes, never text: the UI maps them to the current locale, so switching language keeps input intact.

export const CONTACT_METHODS = ['email', 'telegram', 'instagram'] as const
export type ContactMethod = (typeof CONTACT_METHODS)[number]

export const THEME_IDS = ['ecology', 'education', 'accessibility', 'campus', 'other'] as const
export type ThemeId = (typeof THEME_IDS)[number]

export const SUPPORT_IDS = ['team', 'expertise', 'validation', 'unknown'] as const
export type SupportId = (typeof SUPPORT_IDS)[number]

export const SKILL_IDS = ['design', 'development', 'marketing', 'research', 'events', 'other'] as const
export type SkillId = (typeof SKILL_IDS)[number]

export const LIMITS = {
  problemMin: 10,
  problemMax: 1200,
  beneficiaryMax: 200,
  solutionMax: 1800,
  nameMax: 80,
  messageMax: 1000,
  organizationMax: 120,
  proposalMin: 10,
  proposalMax: 1500,
  contactMax: 254,
} as const

export type ErrorCode =
  | 'required'
  | 'tooShort'
  | 'tooLong'
  | 'invalidEmail'
  | 'invalidTelegram'
  | 'invalidInstagram'
  | 'consentRequired'

export type Errors<K extends string> = Partial<Record<K, ErrorCode>>

export type ContactInput = {
  name: string
  method: ContactMethod
  contact: string
  consent: boolean
}

export type IdeaInput = ContactInput & {
  problem: string
  beneficiary: string
  themes: ThemeId[]
  solution: string
  onlyProblem: boolean
  support: SupportId[]
}

export type JoinInput = ContactInput & { skills: SkillId[]; message: string }
export type CollabInput = ContactInput & { organization: string; proposal: string }

export type IdeaStep1Key = 'problem' | 'beneficiary'
export type IdeaStep2Key = 'solution'
export type ContactKey = 'name' | 'contact' | 'consent'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const TELEGRAM_RE = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/
const INSTAGRAM_RE = /^@?[A-Za-z0-9._]{1,30}$/

export function normalizeContact(method: ContactMethod, raw: string): string {
  const value = raw.trim()
  return method === 'email' ? value : value.replace(/^@/, '')
}

function checkMax(value: string, max: number): ErrorCode | undefined {
  return value.length > max ? 'tooLong' : undefined
}

export function validateIdeaStep1(v: Pick<IdeaInput, 'problem' | 'beneficiary'>): Errors<IdeaStep1Key> {
  const errors: Errors<IdeaStep1Key> = {}
  const problem = v.problem.trim()
  if (!problem) errors.problem = 'required'
  else if (problem.length < LIMITS.problemMin) errors.problem = 'tooShort'
  else if (problem.length > LIMITS.problemMax) errors.problem = 'tooLong'
  const tooLong = checkMax(v.beneficiary.trim(), LIMITS.beneficiaryMax)
  if (tooLong) errors.beneficiary = tooLong
  return errors
}

export function validateIdeaStep2(v: Pick<IdeaInput, 'solution' | 'onlyProblem'>): Errors<IdeaStep2Key> {
  if (v.onlyProblem) return {}
  const tooLong = checkMax(v.solution.trim(), LIMITS.solutionMax)
  return tooLong ? { solution: tooLong } : {}
}

export function validateContact(v: ContactInput): Errors<ContactKey> {
  const errors: Errors<ContactKey> = {}
  const nameTooLong = checkMax(v.name.trim(), LIMITS.nameMax)
  if (nameTooLong) errors.name = nameTooLong

  const contact = normalizeContact(v.method, v.contact)
  if (!contact) errors.contact = 'required'
  else if (v.method === 'email') {
    if (contact.length > LIMITS.contactMax || !EMAIL_RE.test(contact)) errors.contact = 'invalidEmail'
  } else if (v.method === 'telegram') {
    if (!TELEGRAM_RE.test(contact)) errors.contact = 'invalidTelegram'
  } else if (!INSTAGRAM_RE.test(contact)) {
    errors.contact = 'invalidInstagram'
  }

  if (!v.consent) errors.consent = 'consentRequired'
  return errors
}

export function validateJoin(v: JoinInput): Errors<'message' | ContactKey> {
  const errors: Errors<'message' | ContactKey> = { ...validateContact(v) }
  const tooLong = checkMax(v.message.trim(), LIMITS.messageMax)
  if (tooLong) errors.message = tooLong
  return errors
}

export function validateCollab(v: CollabInput): Errors<'organization' | 'proposal' | ContactKey> {
  const errors: Errors<'organization' | 'proposal' | ContactKey> = { ...validateContact(v) }
  const org = v.organization.trim()
  if (!org) errors.organization = 'required'
  else if (org.length > LIMITS.organizationMax) errors.organization = 'tooLong'
  const proposal = v.proposal.trim()
  if (!proposal) errors.proposal = 'required'
  else if (proposal.length < LIMITS.proposalMin) errors.proposal = 'tooShort'
  else if (proposal.length > LIMITS.proposalMax) errors.proposal = 'tooLong'
  return errors
}

export const hasErrors = (errors: object): boolean => Object.keys(errors).length > 0

// Envelope the Phase 3 endpoint will accept. Allowlisted fields only; plain text, never HTML.
export type SubmissionType = 'idea' | 'join' | 'partner'
export type Locale = 'kk' | 'ru' | 'en'

export type SubmissionEnvelope = {
  type: SubmissionType
  locale: Locale
  consentVersion: string
  idempotencyKey: string
  /** One-time anti-bot token, verified server-side. */
  captchaToken?: string
  payload: Record<string, unknown>
}
