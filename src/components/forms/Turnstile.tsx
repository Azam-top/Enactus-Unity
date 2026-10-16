import { useEffect, useRef, useState } from 'react'
import { features } from '../../config/features'
import { useT } from '../../content/LocaleContext'
import styles from './forms.module.css'

// Cloudflare Turnstile. The script is requested only when a form is actually about to be sent (never on page load)
// and only when sending is enabled. The token is verified server-side by the Edge Function; it is single-use.
type TurnstileApi = {
  render(el: HTMLElement, options: Record<string, unknown>): string
  reset(id: string): void
  remove(id: string): void
}
declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<void> | null = null
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('turnstile failed to load'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

/** Holds the one-time token. `consume()` is called on submit; `reset()` after every attempt (tokens are single-use). */
export function useCaptcha() {
  const [token, setTokenState] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [missing, setMissing] = useState(false)
  const required = features.submissionEnabled

  return {
    required,
    token,
    resetKey,
    missing,
    setToken(next: string | null) {
      setTokenState(next)
      if (next) setMissing(false)
    },
    reset() {
      setTokenState(null)
      setResetKey((n) => n + 1)
    },
    /** True when sending may proceed; otherwise flags the missing check. */
    consume(): { ok: true; token?: string } | { ok: false } {
      if (!required) return { ok: true }
      if (!token) {
        setMissing(true)
        return { ok: false }
      }
      return { ok: true, token }
    },
  }
}

type FieldProps = { captcha: ReturnType<typeof useCaptcha>; active: boolean }

export function CaptchaField({ captcha, active }: FieldProps) {
  const t = useT()
  const hostRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const [failed, setFailed] = useState(false)
  const { setToken, resetKey } = captcha

  useEffect(() => {
    if (!captcha.required || !active) return
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !hostRef.current || !window.turnstile || widgetId.current) return
        widgetId.current = window.turnstile.render(hostRef.current, {
          sitekey: features.turnstileSiteKey,
          language: 'auto',
          theme: 'light',
          callback: (token: string) => setToken(token),
          'expired-callback': () => setToken(null),
          'error-callback': () => setToken(null),
        })
      })
      .catch(() => setFailed(true))
    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, captcha.required])

  useEffect(() => {
    if (resetKey > 0 && widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current)
  }, [resetKey])

  if (!captcha.required || !active) return null
  return (
    <div className={styles.captcha}>
      <div ref={hostRef} />
      {(captcha.missing || failed) && (
        <p className={styles.error} role="alert">
          {failed ? t.participation.common.captchaFailed : t.participation.common.captchaRequired}
        </p>
      )}
    </div>
  )
}
