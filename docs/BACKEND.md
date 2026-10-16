# Private intake — backend handbook

Status: **implemented and verified locally; NOT deployed.** No Supabase project was created or changed. The existing
project in this account ("Unify") belongs to something else and was left untouched.

## What exists
```
supabase/
  config.toml                         verify_jwt = false for submit-intake (anonymous visitors; checks live in code)
  migrations/20261011000000_private_intake.sql
  functions/_shared/intake.ts         request handler (origin, limits, rate limits, validation, anti-bot, idempotent insert)
  functions/_shared/deps.ts           env -> config, PostgREST RPC, Turnstile verification
  functions/_shared/validation.ts     GENERATED copy of src/shared/validation.ts (npm run sync:shared)
  functions/submit-intake/index.ts    Deno.serve glue
src/services/submission.ts            browser client (success only on a server-confirmed receipt)
src/components/forms/Turnstile.tsx    anti-bot widget, loaded only at the moment of sending
```

## How a submission travels
1. Visitor completes the form → the browser POSTs JSON to the Edge Function (no account, no cookies, no Supabase key).
2. Function: allowed `Origin` → body ≤ 16 KB → **durable** rate limits (per visitor and global, counted in Postgres, so
   they hold across function instances) → strict allowlist + the same validation rules as the browser → Turnstile
   verified **server-side** (fails closed) → `submit_intake()`.
3. `submit_intake()` (Postgres, atomic): same idempotency key + same data → original receipt; same key + different data → 409;
   new submission → per-visitor quota → insert with a random opaque reference `EK-XXXXXXXXXX`.
4. The browser shows success **only** after a `201/200` with a well-formed receipt. Any failure keeps the typed text.

Responses: `201` created · `200` replay of the same key · `400` invalid (field codes only) · `403` origin / captcha ·
`409` key reused with other data · `413` body too big · `415` · `429` (+`Retry-After`) · `503` not configured / captcha verifier down ·
`500` generic. Raw submissions, contacts and secrets are never logged; visitors are only ever identified by a salted hash.

## Access control (what protects the data)
* `submissions` and `intake_rate_limits`: RLS **enabled and forced**, **no policies**, all table privileges revoked from
  `anon`, `authenticated`, `service_role` and `public`. Only the SECURITY DEFINER functions touch them.
* `submit_intake`, `intake_rate_hit`: executable by `service_role` only (anon/authenticated cannot call them over the REST API).
* The secret key exists only as a function secret. The browser bundle contains no Supabase key at all.
* **Review access = Supabase project members.** Do not add policies for `authenticated`; that would open the table to every
  signed-in account. Add or remove reviewers in the Supabase dashboard (organization/project members).

## Owner review workflow (v1, no custom admin UI)
Dashboard → *Table Editor* → `submissions` (or SQL editor). Statuses: `new` → `reviewing` → `closed`.
```sql
-- what is waiting
select reference_id, created_at, type, locale, contact_method, contact, name, context, details
from public.submissions where status = 'new' order by created_at;

-- take one
update public.submissions set status = 'reviewing' where reference_id = 'EK-XXXXXXXXXX';
-- finish one
update public.submissions set status = 'closed' where reference_id = 'EK-XXXXXXXXXX';
```
Nothing is sent automatically (no email/Telegram side effects); reviewers must open the dashboard.
Notifications are later scope and need a separate decision.

## Retention (owner decision required)
`public.purge_submissions(days, only_closed := true)` deletes old submissions; by default only **closed** ones so unreviewed
ideas are never lost silently. Nothing schedules it: after choosing the period, run it from the SQL editor or schedule it
with `pg_cron` (enable the extension in the dashboard). The privacy page states the period from `VITE_RETENTION_DAYS`, so
**do not enable sending until the purge is scheduled**.

## Going live (needs the owner — nothing here has been run)
Needs: a Supabase project chosen/created by the owner (creating one may cost money), a Cloudflare Turnstile widget
(site key + secret), the real site origin(s), a responsible privacy contact, a retention period, and the published privacy text.
```bash
supabase login
supabase link --project-ref <ref>
supabase db push                                           # applies the migration
cp supabase/functions/.env.example supabase/functions/.env # fill in the four secrets
supabase secrets set --env-file supabase/functions/.env
supabase functions deploy submit-intake                    # config.toml already sets verify_jwt = false
```
Then build the site with the `VITE_*` values from `.env.example` (set `VITE_SUBMISSION_ENABLED=true` last), and run the
**staging checklist** below against it using synthetic data only.

## Staging checklist (not yet done — requires a deployed project)
- [ ] `curl` the function from a disallowed origin → 403; from the site origin → 201 with a receipt; row visible in the dashboard.
- [ ] Repeat the same request with the same `idempotencyKey` → 200, same receipt, still one row.
- [ ] With the **publishable/anon** key via REST (`/rest/v1/submissions`) → no rows, insert refused; `/rest/v1/rpc/submit_intake` refused.
- [ ] Hammer past the limits → 429 + `Retry-After`; confirm counters persist across cold starts.
- [ ] A bad Turnstile token → 403; Turnstile outage simulated → 503 and the site shows its retry message.
- [ ] Confirm which client-IP header Supabase's edge sets and that a visitor cannot forge it (`deps`/`intake.ts` read `cf-connecting-ip`, then the first `x-forwarded-for`); adjust if needed, otherwise per-visitor limits can be dodged.
- [ ] Function logs contain no contact details or text.
- [ ] `supabase db advisors` / dashboard security advisor shows no exposed table or function warnings.
- [ ] Retention job scheduled; privacy contact answers; reviewers added; Instagram/domain links correct.

## Known trade-offs
* The global limiter (400 requests/hour, `requestsGlobal`) is a circuit breaker: a distributed flood could also lock out real visitors until the window ends. Tune the limits in `supabase/functions/_shared/deps.ts` (`DEFAULTS`).
* Per-visitor limits use a salted IP hash; visitors behind one shared network (a university campus) share a quota (5 new submissions/hour). Raise it if campus use makes it bite.
* An idempotent retry still needs a fresh Turnstile token (tokens are single-use), which the form requests automatically.
* No honeypot field was added on purpose (password managers fill hidden fields, and it is not real abuse protection).

## What was verified locally, and what was not
Verified (`npm run test:backend`, 50 checks): the migration on a real Postgres (PGlite), RLS/privilege denial for
`anon`/`authenticated`/`service_role`, receipts, atomic idempotency incl. parallel identical requests, quota and window
rollover, retention helper, and the **real handler and wiring** end to end (CORS, size/type/method limits, strict validation,
captcha pass/fail/outage, rate limits, error shapes, log hygiene) against a fake PostgREST/Turnstile.
Verified in the browser with a mocked endpoint (`npm run test:ui-mock`): the client behaviour for success, rate limit, captcha, errors, retries.
**Not verified:** `Deno.serve` itself, the real Supabase gateway and PostgREST, live Turnstile, real network/CORS behaviour,
true multi-connection concurrency, Supabase's own default privileges (PGlite has no Supabase roles setup — roles were recreated).
