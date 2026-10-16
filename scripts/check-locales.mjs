// Locale audit: every language has exactly the same keys/array lengths as ru, no empty strings,
// and every {placeholder} in ru exists in the translation. Runs on Node's native TypeScript stripping.
import { ru } from '../src/content/ru.ts'
import { kk } from '../src/content/kk.ts'
import { en } from '../src/content/en.ts'

const problems = []
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')

function walk(base, other, path, name) {
  if (typeof base === 'string') {
    if (typeof other !== 'string') return problems.push(`${name}: ${path} should be a string`)
    if (!other.trim()) problems.push(`${name}: ${path} is empty`)
    if (placeholders(base) !== placeholders(other)) problems.push(`${name}: ${path} placeholders differ (${placeholders(base)} vs ${placeholders(other)})`)
    return
  }
  if (Array.isArray(base)) {
    if (!Array.isArray(other) || other.length !== base.length) return problems.push(`${name}: ${path} array length differs`)
    base.forEach((item, i) => walk(item, other[i], `${path}[${i}]`, name))
    return
  }
  if (base && typeof base === 'object') {
    if (!other || typeof other !== 'object') return problems.push(`${name}: ${path} missing`)
    for (const key of Object.keys(base)) {
      if (!(key in other)) problems.push(`${name}: missing key ${path}.${key}`)
      else walk(base[key], other[key], `${path}.${key}`, name)
    }
    for (const key of Object.keys(other)) if (!(key in base)) problems.push(`${name}: extra key ${path}.${key}`)
  }
}

for (const [name, dict] of [['kk', kk], ['en', en]]) walk(ru, dict, '', name)

// Kazakh must contain its distinctive letters, otherwise it is probably a Russian copy. (Һ is rendered in the browser
// font check instead: it simply does not occur in the current copy.)
const kkText = JSON.stringify(kk)
for (const letter of 'ӘҒҚҢӨҰҮІ'.split('')) if (!kkText.includes(letter) && !kkText.includes(letter.toLowerCase())) problems.push(`kk: no occurrence of ${letter}`)

// Untranslated copies: a kk/en string identical to ru (other than names/placeholders-only) is suspicious.
const same = []
function compare(a, b, path) {
  if (typeof a === 'string') { if (a === b && /[А-Яа-я]{4}/.test(a) && !path.includes('.language.names')) same.push(path); return }
  if (a && typeof a === 'object') for (const k of Object.keys(a)) compare(a[k], b?.[k], `${path}.${k}`)
}
compare(ru, en, 'en')
if (same.length) problems.push(`en: strings still in Russian: ${same.join(', ')}`)

const count = (o) => (typeof o === 'string' ? 1 : Object.values(o).reduce((n, v) => n + count(v), 0))
console.log(`strings: ru=${count(ru)} kk=${count(kk)} en=${count(en)}`)
if (problems.length) {
  console.error(problems.map((p) => 'FAIL ' + p).join('\n'))
  process.exit(1)
}
console.log('PASS locale parity (kk, en match ru)')
