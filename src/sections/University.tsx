import { useT } from '../content/LocaleContext'
import { links } from '../config/links'
import { Icon } from '../components/Icon'
import styles from './University.module.css'

export function University() {
  const t = useT()
  const u = t.university
  return (
    <section id="university" className={styles.section} aria-labelledby="university-title">
      <div className={`container ${styles.grid}`}>
        <div>
          <p className={`eyebrow ${styles.eyebrow}`}>{u.eyebrow}</p>
          <h2 id="university-title" className={styles.title}>
            {u.title}
          </h2>
          <p className={styles.body}>{u.body}</p>
          <a className={`link ${styles.link}`} href={links.university} target="_blank" rel="noopener noreferrer">
            {u.link}
            <span className="visually-hidden"> ({t.a11y.externalLink})</span>
            <Icon name="external" size={16} />
          </a>
        </div>
        <address className={styles.address}>
          <span className={styles.addressLabel}>{u.addressLabel}</span>
          <span>{u.address}</span>
          <span className={styles.note}>{u.addressNote}</span>
        </address>
      </div>
    </section>
  )
}
