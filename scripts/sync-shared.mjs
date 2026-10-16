// Copies src/shared/validation.ts into the Edge Function folder (the CLI bundler is happiest with files that
// live under supabase/functions). `--check` fails when the copy is stale, so the two can never drift apart.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const src = readFileSync('src/shared/validation.ts', 'utf8')
const target = 'supabase/functions/_shared/validation.ts'
const banner = '// GENERATED from src/shared/validation.ts by scripts/sync-shared.mjs — do not edit here.\n'
const expected = banner + src

if (process.argv.includes('--check')) {
  const actual = existsSync(target) ? readFileSync(target, 'utf8') : ''
  if (actual !== expected) {
    console.error('FAIL supabase/functions/_shared/validation.ts is out of date: run `npm run sync:shared`')
    process.exit(1)
  }
  console.log('PASS shared validation copy is in sync')
} else {
  writeFileSync(target, expected)
  console.log('wrote', target)
}
