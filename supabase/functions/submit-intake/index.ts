// Edge Function: POST /functions/v1/submit-intake
// Anonymous visitors call this directly (verify_jwt = false in supabase/config.toml), so ALL protection lives here:
// origin allowlist, body limit, durable rate limits, server-verified Turnstile, strict validation, atomic idempotency.
// Secrets (never in the client): TURNSTILE_SECRET_KEY, IP_HASH_SALT, ALLOWED_ORIGINS, CONSENT_VERSION.
// SUPABASE_URL and the secret key are injected by Supabase.
import { createLiveDeps } from '../_shared/deps.ts'
import { handleIntake } from '../_shared/intake.ts'

declare const Deno: { env: { toObject(): Record<string, string> }; serve(handler: (req: Request) => Response | Promise<Response>): void }

const deps = createLiveDeps(Deno.env.toObject(), fetch, (event, info) => console.log(JSON.stringify({ event, ...info })))

Deno.serve((req) => handleIntake(req, deps))
