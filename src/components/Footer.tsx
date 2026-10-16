import { Link } from 'react-router-dom'
import { useLocale, useT } from '../content/LocaleContext'
import { useMotion } from '../motion/MotionContext'
import { links } from '../config/links'
import { Icon } from './Icon'
import { LanguageSwitcher } from './LanguageSwitcher'
import styles from './Footer.module.css'

const SECTIONS = ['projects', 'team', 'story'] as const

export function Footer({ onHome }: { onHome: boolean }) {
  const t = useT()
  const locale = useLocale()
  const { reduced, systemReduced, toggleUserReduced } = useMotion()

  return (
    <footer className={`on-dark ${styles.footer}`}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.brandCol}>
          <p className={styles.brand}>
            <span className={styles.brandName}>{t.brand.name}</span> {t.brand.suffix}
          </p>
          <p className={styles.tagline}>{t.footer.tagline}</p>
          <a className={styles.social} href={links.teamInstagram} target="_blank" rel="noopener noreferrer">
            <Icon name="instagram" size={20} />
            {t.footer.instagram}
            <span className="visually-hidden"> ({t.a11y.externalLink})</span>
          </a>
        </div>

        <nav className={styles.col} aria-label={t.a11y.footerNav}>
          <p className={styles.colTitle}>{t.footer.navTitle}</p>
          <ul>
            {SECTIONS.map((id) => (
              <li key={id}>
                {onHome ? (
                  <a href={`#${id}`}>{t.nav[id]}</a>
                ) : (
                  <Link to={{ pathname: `/${locale}`, hash: `#${id}` }}>{t.nav[id]}</Link>
                )}
              </li>
            ))}
            <li>
              <a href={links.university} target="_blank" rel="noopener noreferrer">
                {t.footer.university}
                <span className="visually-hidden"> ({t.a11y.externalLink})</span>
              </a>
            </li>
            <li>
              <Link to={`/${locale}/privacy`}>{t.footer.privacy}</Link>
            </li>
          </ul>
        </nav>

        <div className={styles.col}>
          <p className={styles.colTitle}>{t.footer.languageTitle}</p>
          <div className={styles.lang}>
            <LanguageSwitcher />
          </div>
          <button
            type="button"
            className={styles.motion}
            aria-pressed={reduced}
            disabled={systemReduced}
            onClick={toggleUserReduced}
          >
            <span className={styles.box} aria-hidden="true">
              {reduced && <Icon name="check" size={14} />}
            </span>
            {t.motion.reduce}
          </button>
          {systemReduced && <p className={styles.systemNote}>{t.motion.systemReduced}</p>}
        </div>
      </div>
    </footer>
  )
}
