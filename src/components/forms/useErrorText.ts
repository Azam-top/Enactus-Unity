import { fmt } from '../../content/locales'
import { useT } from '../../content/LocaleContext'
import type { ErrorCode } from '../../shared/validation'

/** Maps an error code to text in the current locale — so switching language re-words errors, input untouched. */
export function useErrorText() {
  const t = useT()
  return (code: ErrorCode | undefined, limits?: { min?: number; max?: number }): string | undefined =>
    code ? fmt(t.errors[code], { min: limits?.min ?? 0, max: limits?.max ?? 0 }) : undefined
}
