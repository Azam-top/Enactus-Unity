import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import type { Dictionary } from './ru'
import { dictionaries } from './locales'
import type { Locale } from '../shared/validation'

type LocaleValue = { locale: Locale; t: Dictionary }

const OG_LOCALE: Record<Locale, string> = { kk: 'kk_KZ', ru: 'ru_RU', en: 'en_US' }

const LocaleContext = createContext<LocaleValue | null>(null)

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<LocaleValue>(() => ({ locale, t: dictionaries[locale] }), [locale])

  // Keep <html lang>, title and description in step with the locale (client-side only; see brief §9 on indexing).
  useEffect(() => {
    document.documentElement.lang = value.t.meta.lang
    document.title = value.t.meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', value.t.meta.description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', value.t.meta.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', value.t.meta.description)
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', OG_LOCALE[value.locale])
  }, [value])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

function useLocaleValue(): LocaleValue {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('LocaleProvider is missing')
  return value
}

export const useT = (): Dictionary => useLocaleValue().t
export const useLocale = (): Locale => useLocaleValue().locale
