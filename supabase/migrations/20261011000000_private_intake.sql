-- Enactus KazNU — private intake (Phase 3)
--
-- Design:
--   * Visitors never touch these tables. The only writer is the `submit-intake` Edge Function, which calls
--     `submit_intake()` with the project's secret (service_role) key.
--   * RLS is enabled AND forced, and there are deliberately NO policies: anon/authenticated can do nothing.
--     All table privileges are also revoked from anon, authenticated and service_role (defence in depth;
--     Supabase's default privileges would otherwise grant them). The functions run as their owner.
--   * Team review happens in the Supabase dashboard (Table Editor / SQL editor) by project members only.
--     No policy grants access to "every authenticated user".

-- ---------------------------------------------------------------- submissions
create table public.submissions (
  id              uuid primary key default gen_random_uuid(),
  reference_id    text        not null unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  type            text        not null check (type in ('idea', 'join', 'partner')),
  status          text        not null default 'new' check (status in ('new', 'reviewing', 'closed')),
  locale          text        not null check (locale in ('kk', 'ru', 'en')),
  consent_version text        not null check (char_length(consent_version) between 1 and 40),
  consent_at      timestamptz not null default now(),
  idempotency_key uuid        not null unique,
  request_hash    text        not null check (char_length(request_hash) = 64),
  name            text        check (name is null or char_length(name) <= 80),
  contact_method  text        not null check (contact_method in ('email', 'telegram', 'instagram')),
  contact         text        not null check (char_length(contact) between 1 and 254),
  context         text        check (context is null or char_length(context) <= 200),
  -- type-specific fields (idea: problem, beneficiary, themes, solution, onlyProblem, support;
  -- join: skills, message; partner: organization, proposal). Plain text only, never HTML.
  details         jsonb       not null default '{}'::jsonb
                  check (jsonb_typeof(details) = 'object' and pg_column_size(details) <= 12000)
);

comment on table public.submissions is 'Private visitor submissions. No client access; written only by submit_intake().';

create index submissions_status_created_idx on public.submissions (status, created_at desc);

create function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger submissions_touch_updated_at
  before update on public.submissions
  for each row execute function public.touch_updated_at();

-- --------------------------------------------------------------- rate limits
create table public.intake_rate_limits (
  bucket       text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket, window_start)
);

create index intake_rate_limits_window_idx on public.intake_rate_limits (window_start);

-- ----------------------------------------------------------- access control
alter table public.submissions        enable row level security;
alter table public.submissions        force  row level security;
alter table public.intake_rate_limits enable row level security;
alter table public.intake_rate_limits force  row level security;

revoke all on table public.submissions        from public, anon, authenticated, service_role;
revoke all on table public.intake_rate_limits from public, anon, authenticated, service_role;

-- ----------------------------------------------------------------- functions
-- Fixed-window counter shared by every function instance (durable, unlike in-memory limits).
-- Returns true while the bucket is within its limit.
create function public.intake_rate_hit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_hits   integer;
begin
  if p_bucket is null or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit arguments';
  end if;

  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.intake_rate_limits as r (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- cheap housekeeping so the table cannot grow without bound
  if random() < 0.02 then
    delete from public.intake_rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_limit;
end
$$;

-- Atomic idempotent insert.
--   p: { idempotency_key, request_hash, type, locale, consent_version, name, contact_method, contact,
--        context, details, quota_bucket, quota_limit, quota_window_seconds }
-- Returns { status: 'created' | 'replayed' | 'conflict' | 'rate_limited', reference_id? }
--   replayed     : same key and same request_hash -> the original receipt (does not consume quota)
--   conflict     : same key but a different request -> refuse
--   rate_limited : a genuinely new submission over the per-visitor quota
create function public.submit_intake(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key      uuid := (p ->> 'idempotency_key')::uuid;
  v_hash     text := p ->> 'request_hash';
  v_ref      text;
  v_old_hash text;
  v_rows     integer;
  v_attempt  integer := 0;
begin
  select s.reference_id, s.request_hash into v_ref, v_old_hash
  from public.submissions s where s.idempotency_key = v_key;
  if found then
    if v_old_hash = v_hash then
      return jsonb_build_object('status', 'replayed', 'reference_id', v_ref);
    end if;
    return jsonb_build_object('status', 'conflict');
  end if;

  if not public.intake_rate_hit(p ->> 'quota_bucket', (p ->> 'quota_limit')::integer, (p ->> 'quota_window_seconds')::integer) then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_ref := 'EK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    begin
      insert into public.submissions (
        reference_id, type, locale, consent_version, idempotency_key, request_hash,
        name, contact_method, contact, context, details
      ) values (
        v_ref, p ->> 'type', p ->> 'locale', p ->> 'consent_version', v_key, v_hash,
        nullif(btrim(p ->> 'name'), ''), p ->> 'contact_method', p ->> 'contact',
        nullif(btrim(p ->> 'context'), ''), coalesce(p -> 'details', '{}'::jsonb)
      )
      on conflict (idempotency_key) do nothing;
      get diagnostics v_rows = row_count;
      exit;
    exception when unique_violation then
      -- reference_id collision (idempotency_key is handled by ON CONFLICT): try another id
      if v_attempt >= 5 then raise; end if;
    end;
  end loop;

  if v_rows = 0 then
    -- lost a race with an identical concurrent request: behave like a replay
    select s.reference_id, s.request_hash into v_ref, v_old_hash
    from public.submissions s where s.idempotency_key = v_key;
    if v_old_hash = v_hash then
      return jsonb_build_object('status', 'replayed', 'reference_id', v_ref);
    end if;
    return jsonb_build_object('status', 'conflict');
  end if;

  return jsonb_build_object('status', 'created', 'reference_id', v_ref);
end
$$;

-- Retention helper. The retention period is an OWNER decision (see docs/BACKEND.md); nothing runs it by itself.
-- By default only reviewed-and-closed submissions are purged, so unreviewed ideas are never silently deleted.
create function public.purge_submissions(p_older_than_days integer, p_only_closed boolean default true)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if p_older_than_days is null or p_older_than_days < 1 then
    raise exception 'p_older_than_days must be >= 1';
  end if;
  delete from public.submissions
  where created_at < now() - make_interval(days => p_older_than_days)
    and (not p_only_closed or status = 'closed');
  get diagnostics v_deleted = row_count;
  return v_deleted;
end
$$;

revoke all on function public.touch_updated_at()                          from public, anon, authenticated, service_role;
revoke all on function public.intake_rate_hit(text, integer, integer)     from public, anon, authenticated;
revoke all on function public.submit_intake(jsonb)                        from public, anon, authenticated;
revoke all on function public.purge_submissions(integer, boolean)         from public, anon, authenticated, service_role;

grant execute on function public.intake_rate_hit(text, integer, integer)  to service_role;
grant execute on function public.submit_intake(jsonb)                     to service_role;
-- purge_submissions: run by the project owner from the SQL editor / pg_cron as postgres only.
