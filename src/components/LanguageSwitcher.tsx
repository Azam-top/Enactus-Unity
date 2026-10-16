import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLocale, useT } from '../content/LocaleContext'
import { LOCALES } from '../content/locales'
import styles from './LanguageSwitcher.module.css'

/**
 * Switches the locale in place: same page, same section hash. The route element stays mounted,
 * so in-progress form input is untouched (validation messages are re-worded from error codes).
 */
export function LanguageSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT()
  const locale = useLocale()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const rest = pathname.split('/').slice(2).join('/')

  return (
    <div className={styles.switcher} role="group" aria-label={t.a11y.languageNav}>
      {LOCALES.map((code) => {
        const to = `/${code}${rest ? `/${rest}` : ''}`
        return (
          <Link
            key={code}
            to={to}
            lang={code}
            hrefLang={code}
            className={styles.link}
            aria-label={`${t.language.short[code]} — ${t.language.names[code]}`}
            aria-current={code === locale ? 'true' : undefined}
            onClick={(event) => {
              event.preventDefault()
              navigate({ pathname: to, hash: window.location.hash }, { replace: true })
              onNavigate?.()
            }}
          >
            {t.language.short[code]}
          </Link>
        )
      })}
    </div>
  )
}
