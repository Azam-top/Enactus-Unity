import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useLocale, useT } from '../content/LocaleContext'
import { fmt } from '../content/locales'
import { features } from '../config/features'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import styles from './Privacy.module.css'

/** Preview privacy text. It only states what is true today; the full policy waits for confirmed team details. */
export function Privacy() {
  const t = useT()
  const locale = useLocale()
  const p = t.privacy
  // Live text is shown only when sending is actually enabled (it needs the owner's contact and retention period).
  const live = features.submissionEnabled
  const status = live ? p.live.status : p.status
  const sections = live ? p.live.sections : p.sections
  const values = { contact: features.privacyContact, days: features.retentionDays }

  useEffect(() => {
    document.title = t.meta.privacyTitle
    window.scrollTo({ top: 0 })
  }, [t])

  return (
    <>
      <a className="skip-link" href="#main">
        {t.a11y.skipToContent}
      </a>
      <Header />
      <main id="main" className={styles.main}>
        <div className={`container ${styles.inner}`}>
          <Link to={`/${locale}`} className={`link ${styles.back}`}>
            ← {p.back}
          </Link>
          <p className={`eyebrow ${styles.status}`}>{status}</p>
          <h1 className={styles.title}>{p.title}</h1>
          {sections.map((section) => (
            <section key={section.heading} className={styles.section}>
              <h2>{section.heading}</h2>
              <p>{fmt(section.body, values)}</p>
            </section>
          ))}
        </div>
      </main>
      <Footer onHome={false} />
    </>
  )
}
