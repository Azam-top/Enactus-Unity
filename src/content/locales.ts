import type { Dictionary } from './ru.ts'
import { ru } from './ru.ts'
import { kk } from './kk.ts'
import { en } from './en.ts'
import type { Locale } from '../shared/validation.ts'

export const LOCALES = ['kk', 'ru', 'en'] as const satisfies readonly Locale[]
export const DEFAULT_LOCALE: Locale = 'kk'

export const dictionaries: Record<Locale, Dictionary> = { kk, ru, en }

export const isLocale = (value: string | undefined): value is Locale => LOCALES.includes(value as Locale)

/** Fill {placeholders}. Unknown placeholders are left visible so a missing value is noticed, not hidden. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))
}
