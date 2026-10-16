// Feature flags and deployment config. Everything here comes from build-time env (see .env.example) —
// no secret ever belongs in a VITE_ variable: the Turnstile *site* key, the function URL and the privacy
// contact are public by design; the Turnstile secret, IP salt and Supabase secret key live in the function.
const env = import.meta.env as Record<string, string | undefined>
const read = (name: string): string => (env[name] ?? '').trim()

const submissionUrl = read('VITE_SUBMISSION_URL')
const turnstileSiteKey = read('VITE_TURNSTILE_SITE_KEY')
const consentVersion = read('VITE_CONSENT_VERSION')
const privacyContact = read('VITE_PRIVACY_CONTACT')
const retentionDays = Number(read('VITE_RETENTION_DAYS'))

/**
 * Sending is on only when the owner has supplied EVERYTHING the launch checklist needs: the function URL,
 * the anti-bot site key, the published consent version, a responsible contact and a retention period.
 * Missing any of them keeps the honest "preview" behaviour — the site never pretends to collect anything.
 */
const submissionEnabled =
  read('VITE_SUBMISSION_ENABLED') === 'true' &&
  Boolean(submissionUrl && turnstileSiteKey && consentVersion && privacyContact) &&
  Number.isFinite(retentionDays) &&
  retentionDays >= 1

/** Production origin (no trailing slash). Empty until the owner supplies the domain: no canonical/hreflang is then emitted. */
const siteUrl = read('VITE_SITE_URL').replace(/\/+$/, '')

export const features = {
  siteUrl,
  submissionEnabled,
  submissionUrl,
  turnstileSiteKey,
  /** "Заявка не публикуется…" is shown only when the access controls it describes are deployed. */
  showPrivateSubmissionNote: submissionEnabled,
  consentVersion: consentVersion || 'unpublished-preview',
  privacyContact,
  retentionDays: Number.isFinite(retentionDays) ? retentionDays : 0,
  draftMaxAgeDays: 7,
} as const
