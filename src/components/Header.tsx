import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLocale, useT } from '../content/LocaleContext'
import { Icon } from './Icon'
import { LanguageSwitcher } from './LanguageSwitcher'
import styles from './Header.module.css'

type Props = {
  /** Present on the homepage: opens the idea path in place. Elsewhere the CTA links back to the homepage. */
  onShareIdea?: () => void
}

const SECTIONS = ['projects', 'team', 'story'] as const

export function Header({ onShareIdea }: Props) {
  const t = useT()
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const onHome = Boolean(onShareIdea)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const sectionLink = (id: string, className: string, label: ReactNode) =>
    onHome ? (
      <a href={`#${id}`} className={className} onClick={() => setOpen(false)}>
        {label}
      </a>
    ) : (
      <Link to={{ pathname: `/${locale}`, hash: `#${id}` }} className={className} onClick={() => setOpen(false)}>
        {label}
      </Link>
    )

  const shareIdea = (className: string) =>
    onHome ? (
      <a
        href="#participate"
        className={className}
        onClick={(e) => {
          e.preventDefault()
          setOpen(false)
          onShareIdea?.()
        }}
      >
        {t.nav.shareIdea}
      </a>
    ) : (
      <Link to={{ pathname: `/${locale}`, hash: '#participate' }} className={className}>
        {t.nav.shareIdea}
      </Link>
    )

  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <Link to={`/${locale}`} className={styles.brand} aria-label={t.a11y.brandHome} onClick={() => window.scrollTo({ top: 0 })}>
          <span className={styles.brandName}>{t.brand.name}</span> <span className={styles.brandSuffix}>{t.brand.suffix}</span>
        </Link>

        <nav className={styles.nav} aria-label={t.a11y.mainNav}>
          {SECTIONS.map((id) => (
            <span key={id}>{sectionLink(id, styles.navLink, t.nav[id])}</span>
          ))}
        </nav>

        <div className={styles.actions}>
          <div className={styles.langDesktop}>
            <LanguageSwitcher />
          </div>
          {shareIdea(`btn btn--primary ${styles.cta}`)}
          <button
            ref={toggleRef}
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.a11y.closeMenu : t.a11y.openMenu}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      <div id="mobile-menu" className={styles.menu} hidden={!open}>
        <div className="container">
          {SECTIONS.map((id) => (
            <span key={id}>{sectionLink(id, styles.menuLink, t.nav[id])}</span>
          ))}
          <div className={styles.menuLang}>
            <span className={styles.menuLangLabel}>{t.language.label}</span>
            <LanguageSwitcher onNavigate={() => setOpen(false)} />
          </div>
          {shareIdea(`btn btn--primary ${styles.menuCta}`)}
        </div>
      </div>
    </header>
  )
}
