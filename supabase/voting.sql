-- =============================================================================
-- Bartebord: voting for the year's best and worst mustache
--
-- Run the whole file in Supabase: SQL Editor → New query → paste → Run.
-- The file can be run again without losing data.
--
-- All data lives in the "voting" schema, which is not reachable from the
-- browser. The site only talks to the database through the functions in
-- "public" further down, which check code, phase and rules on the server.
--
-- Anonymity: "ballots" stores WHO has voted in each round, and "votes"
-- stores WHAT was voted. There is no link between the two tables.

-- Error messages raised below are shown to participants and are therefore
-- in Norwegian.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

create schema if not exists voting;
revoke all on schema voting from public;
-- Needed so the photo upload policy (at the bottom) can call
-- voting.upload_allowed. Grants no access to the tables.
grant usage on schema voting to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists voting.settings (
  id int primary key default 1 check (id = 1),
  -- registration → round1 → final → done
  phase text not null default 'registration'
    check (phase in ('registration', 'round1', 'final', 'done')),
  -- Voting opens by itself when this many have registered ...
  expected_count int not null default 22,
  -- ... or at this time, whichever comes first.
  voting_opens_at timestamptz not null default '2026-11-28 18:00:00 Europe/Oslo',
  final_best uuid[] not null default '{}',
  final_worst uuid[] not null default '{}',
  -- Whether the winners are shown on the big screen and the phones.
  reveal boolean not null default false,
  admin_password_hash text
);
insert into voting.settings default values on conflict (id) do nothing;

create table if not exists voting.participants (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text,
  photo_path text,
  registered_at timestamptz
);

create table if not exists voting.upload_tokens (
  token uuid primary key default gen_random_uuid(),
  participant_id uuid not null references voting.participants on delete cascade,
  created_at timestamptz not null default now()
);

-- Who has voted in which round (not what).
create table if not exists voting.ballots (
  participant_id uuid not null references voting.participants on delete cascade,
  round int not null check (round in (1, 2)),
  primary key (participant_id, round)
);

-- What was voted (not by whom).
create table if not exists voting.votes (
  id uuid primary key default gen_random_uuid(),
  round int not null check (round in (1, 2)),
  best uuid references voting.participants on delete cascade,
  worst uuid references voting.participants on delete cascade
);

alter table voting.settings enable row level security;
alter table voting.participants enable row level security;
alter table voting.upload_tokens enable row level security;
alter table voting.ballots enable row level security;
alter table voting.votes enable row level security;
revoke all on all tables in schema voting from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

create or replace function voting.norm_code(p_code text)
returns text language sql immutable set search_path = '' as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

-- The phase as it actually is now: registration turns into round 1 once enough
-- participants have registered or the opening time has passed.
create or replace function voting.effective_phase()
returns text language sql stable set search_path = '' as $$
  select case
    when s.phase = 'registration' and (
      now() >= s.voting_opens_at
      or (select count(*) from voting.participants where registered_at is not null) >= s.expected_count
    ) then 'round1'
    else s.phase
  end
  from voting.settings s
$$;

create or replace function voting.sync_phase()
returns text language plpgsql set search_path = '' as $$
declare
  v_phase text := voting.effective_phase();
begin
  update voting.settings set phase = v_phase where phase <> v_phase;
  return v_phase;
end $$;

create or replace function voting.check_admin(p_password text)
returns void language plpgsql set search_path = '' as $$
declare
  v_hash text;
begin
  select admin_password_hash into v_hash from voting.settings;
  if v_hash is null then
    raise exception 'Adminpassordet er ikke satt. Kjør voting.set_admin_password i Supabase.';
  end if;
  if p_password is null or extensions.crypt(p_password, v_hash) <> v_hash then
    raise exception 'Feil passord.';
  end if;
end $$;

-- Vote counts per candidate in a round.
create or replace function voting.tally(p_round int)
returns table (id uuid, best_votes bigint, worst_votes bigint)
language sql stable set search_path = '' as $$
  select p.id,
    (select count(*) from voting.votes v where v.round = p_round and v.best = p.id),
    (select count(*) from voting.votes v where v.round = p_round and v.worst = p.id)
  from voting.participants p
  where p.registered_at is not null
$$;

-- Top N (including everyone tied for the last place) among those with votes.
create or replace function voting.top(p_round int, p_kind text, p_n int)
returns uuid[] language sql stable set search_path = '' as $$
  select coalesce(array_agg(id), '{}')
  from (
    select id, rank() over (order by c desc) as rk
    from (
      select id, case p_kind when 'best' then best_votes else worst_votes end as c
      from voting.tally(p_round)
    ) t
    where c > 0
  ) r
  where rk <= p_n
$$;

create or replace function voting.person(p_id uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('id', id, 'name', name, 'photo', photo_path)
  from voting.participants where id = p_id
$$;

create or replace function voting.people(p_ids uuid[], p_except uuid default null)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'photo', photo_path)
                            order by lower(name), id), '[]')
  from voting.participants
  where id = any(p_ids) and registered_at is not null
    and (p_except is null or id <> p_except)
$$;

create or replace function voting.registered_ids()
returns uuid[] language sql stable set search_path = '' as $$
  select coalesce(array_agg(id), '{}') from voting.participants where registered_at is not null
$$;

create or replace function voting.winners()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'best', voting.people(voting.top(2, 'best', 1)),
    'worst', voting.people(voting.top(2, 'worst', 1))
  )
$$;

-- Used by the Storage upload policy: a photo can only be uploaded to a
-- file name that is a fresh upload token from register_start.
create or replace function voting.upload_allowed(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_name ~ '^[0-9a-f-]{36}\.jpg$'
    and exists (
      select 1 from voting.upload_tokens
      where token::text || '.jpg' = p_name
        and created_at > now() - interval '1 hour'
    )
$$;

-- ---------------------------------------------------------------------------
-- Setup (run in the SQL Editor, not reachable from the site)
-- ---------------------------------------------------------------------------

-- Creates p_count new random codes. Characters that are easily confused
-- (0/O, 1/I/L) are left out.
create or replace function voting.generate_codes(p_count int)
returns setof text language plpgsql set search_path = '' as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_made int := 0;
begin
  while v_made < p_count loop
    select string_agg(substr(v_alphabet, 1 + get_byte(extensions.gen_random_bytes(1), 0) % length(v_alphabet), 1), '')
      into v_code from generate_series(1, 6);
    insert into voting.participants (code) values (v_code) on conflict (code) do nothing;
    if found then
      v_made := v_made + 1;
      return next v_code;
    end if;
  end loop;
end $$;

create or replace function voting.set_admin_password(p_password text)
returns void language plpgsql set search_path = '' as $$
begin
  if length(coalesce(p_password, '')) < 10 then
    raise exception 'Bruk et passord på minst 10 tegn.';
  end if;
  update voting.settings set admin_password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')) where id = 1;
end $$;

-- Resets everything after a dress rehearsal. Codes are kept, so printed
-- slips still work. The phase goes back to registration.
create or replace function voting.reset()
returns void language plpgsql set search_path = '' as $$
begin
  delete from voting.votes where true;
  delete from voting.ballots where true;
  delete from voting.upload_tokens where true;
  update voting.participants set name = null, photo_path = null, registered_at = null where true;
  update voting.settings set phase = 'registration', final_best = '{}', final_worst = '{}', reveal = false where id = 1;
end $$;

-- ---------------------------------------------------------------------------
-- Functions the site calls (via supabase.rpc)
-- ---------------------------------------------------------------------------

-- Everything a phone needs to show the right screen.
create or replace function public.participant_state(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s voting.settings;
  p voting.participants;
  v_phase text := voting.sync_phase();
  v_round int;
  v_result jsonb;
begin
  select * into s from voting.settings;
  select * into p from voting.participants where code = voting.norm_code(p_code);
  if not found then
    return jsonb_build_object('valid', false);
  end if;

  v_round := case v_phase when 'round1' then 1 when 'final' then 2 end;

  v_result := jsonb_build_object(
    'valid', true,
    'id', p.id,
    'name', p.name,
    'photo', p.photo_path,
    'registered', p.registered_at is not null,
    'phase', v_phase,
    'voted', v_round is not null and exists (
      select 1 from voting.ballots b where b.participant_id = p.id and b.round = v_round),
    'registered_count', (select count(*) from voting.participants where registered_at is not null),
    'expected_count', s.expected_count,
    'voting_opens_at', s.voting_opens_at,
    'reveal', s.reveal
  );

  if p.registered_at is not null and v_round = 1 then
    v_result := v_result || jsonb_build_object(
      'best', voting.people(voting.registered_ids(), p.id),
      'worst', voting.people(voting.registered_ids(), p.id));
  elsif p.registered_at is not null and v_round = 2 then
    v_result := v_result || jsonb_build_object(
      'best', voting.people(s.final_best, p.id),
      'worst', voting.people(s.final_worst, p.id));
  end if;

  if v_phase = 'done' and s.reveal then
    v_result := v_result || jsonb_build_object('winners', voting.winners());
  end if;

  return v_result;
end $$;

-- Registration step 1: returns a token for uploading one photo.
create or replace function public.register_start(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_token uuid;
begin
  select id into v_id from voting.participants where code = voting.norm_code(p_code);
  if not found then
    raise exception 'Ukjent kode.';
  end if;
  if voting.sync_phase() = 'done' then
    raise exception 'Avstemningen er avsluttet.';
  end if;
  if (select count(*) from voting.upload_tokens where participant_id = v_id) >= 30 then
    raise exception 'For mange bildeforsøk. Snakk med en arrangør.';
  end if;
  insert into voting.upload_tokens (participant_id) values (v_id) returning token into v_token;
  return v_token;
end $$;

-- Registration step 2: once the photo is uploaded, store name and photo.
-- Can be called again to change photo or name.
create or replace function public.register(p_code text, p_name text, p_token uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  select id into v_id from voting.participants where code = voting.norm_code(p_code) for update;
  if not found then
    raise exception 'Ukjent kode.';
  end if;
  if voting.sync_phase() = 'done' then
    raise exception 'Avstemningen er avsluttet.';
  end if;
  if length(v_name) < 1 or length(v_name) > 40 then
    raise exception 'Skriv inn et navn på 1 til 40 tegn.';
  end if;
  if not exists (select 1 from voting.upload_tokens where token = p_token and participant_id = v_id) then
    raise exception 'Ugyldig bilde. Prøv å ta bildet på nytt.';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'mustaches' and name = p_token::text || '.jpg') then
    raise exception 'Bildet ble ikke lastet opp. Prøv igjen.';
  end if;

  update voting.participants
  set name = v_name,
      photo_path = p_token::text || '.jpg',
      registered_at = coalesce(registered_at, now())
  where id = v_id;

  perform voting.sync_phase();
end $$;

create or replace function public.cast_vote(p_code text, p_best uuid, p_worst uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s voting.settings;
  p voting.participants;
  v_phase text := voting.sync_phase();
  v_round int;
  v_best_ok uuid[];
  v_worst_ok uuid[];
begin
  select * into p from voting.participants where code = voting.norm_code(p_code) for update;
  if not found then
    raise exception 'Ukjent kode.';
  end if;
  if p.registered_at is null then
    raise exception 'Du må registrere barten din før du kan stemme.';
  end if;

  v_round := case v_phase when 'round1' then 1 when 'final' then 2 end;
  if v_round is null then
    raise exception 'Avstemningen er ikke åpen nå.';
  end if;
  if exists (select 1 from voting.ballots where participant_id = p.id and round = v_round) then
    raise exception 'Du har allerede stemt i denne runden.';
  end if;

  select * into s from voting.settings;
  if v_round = 1 then
    v_best_ok := voting.registered_ids();
    v_worst_ok := v_best_ok;
  else
    v_best_ok := s.final_best;
    v_worst_ok := s.final_worst;
  end if;
  v_best_ok := array_remove(v_best_ok, p.id);
  v_worst_ok := array_remove(v_worst_ok, p.id);

  if p_best = p.id or p_worst = p.id then
    raise exception 'Du kan ikke stemme på deg selv.';
  end if;
  -- Each vote must go to a valid candidate. Only when there is nobody to vote
  -- for in a category (e.g. only yourself in the final) may it be left empty.
  if (p_best is null and cardinality(v_best_ok) > 0) or (p_best is not null and not p_best = any(v_best_ok)) then
    raise exception 'Velg en gyldig kandidat til årets beste bart.';
  end if;
  if (p_worst is null and cardinality(v_worst_ok) > 0) or (p_worst is not null and not p_worst = any(v_worst_ok)) then
    raise exception 'Velg en gyldig kandidat til årets verste bart.';
  end if;

  insert into voting.ballots (participant_id, round) values (p.id, v_round);
  insert into voting.votes (round, best, worst) values (v_round, p_best, p_worst);
end $$;

-- For the big screen. Contains no vote counts.
create or replace function public.screen_state()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s voting.settings;
  v_phase text := voting.sync_phase();
  v_result jsonb;
begin
  select * into s from voting.settings;
  v_result := jsonb_build_object(
    'phase', v_phase,
    'registered_count', (select count(*) from voting.participants where registered_at is not null),
    'expected_count', s.expected_count,
    'voting_opens_at', s.voting_opens_at,
    'voted_count', (select count(*) from voting.ballots
                    where round = case v_phase when 'final' then 2 else 1 end),
    'reveal', s.reveal,
    'people', voting.people(voting.registered_ids())
  );
  if v_phase in ('final', 'done') then
    v_result := v_result || jsonb_build_object(
      'final_best', voting.people(s.final_best),
      'final_worst', voting.people(s.final_worst));
  end if;
  if v_phase = 'done' and s.reveal then
    v_result := v_result || jsonb_build_object('winners', voting.winners());
  end if;
  return v_result;
end $$;

-- Everything the admin page shows, including vote counts and codes.
create or replace function public.admin_overview(p_password text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s voting.settings;
  v_phase text := voting.sync_phase();
begin
  perform voting.check_admin(p_password);
  select * into s from voting.settings;
  return jsonb_build_object(
    'phase', v_phase,
    'expected_count', s.expected_count,
    'voting_opens_at', s.voting_opens_at,
    'reveal', s.reveal,
    'final_best', to_jsonb(s.final_best),
    'final_worst', to_jsonb(s.final_worst),
    'preview_best', to_jsonb(voting.top(1, 'best', 3)),
    'preview_worst', to_jsonb(voting.top(1, 'worst', 3)),
    'winners_best', to_jsonb(voting.top(2, 'best', 1)),
    'winners_worst', to_jsonb(voting.top(2, 'worst', 1)),
    'participants', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'code', p.code,
        'name', p.name,
        'photo', p.photo_path,
        'registered', p.registered_at is not null,
        'registered_at', p.registered_at,
        'voted1', exists (select 1 from voting.ballots b where b.participant_id = p.id and b.round = 1),
        'voted2', exists (select 1 from voting.ballots b where b.participant_id = p.id and b.round = 2),
        'r1_best', (select count(*) from voting.votes v where v.round = 1 and v.best = p.id),
        'r1_worst', (select count(*) from voting.votes v where v.round = 1 and v.worst = p.id),
        'r2_best', (select count(*) from voting.votes v where v.round = 2 and v.best = p.id),
        'r2_worst', (select count(*) from voting.votes v where v.round = 2 and v.worst = p.id)
      ) order by p.registered_at nulls last, p.code), '[]')
      from voting.participants p
    )
  );
end $$;

-- The buttons on the admin page.
create or replace function public.admin_action(p_password text, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_phase text;
  v_best uuid[];
  v_worst uuid[];
begin
  perform voting.check_admin(p_password);
  v_phase := voting.sync_phase();

  case p_action
    when 'open_voting' then
      if v_phase <> 'registration' then raise exception 'Avstemningen er allerede åpnet.'; end if;
      update voting.settings set phase = 'round1' where id = 1;

    when 'start_final' then
      if v_phase <> 'round1' then raise exception 'Finalen kan bare startes fra første runde.'; end if;
      v_best := voting.top(1, 'best', 3);
      v_worst := voting.top(1, 'worst', 3);
      if cardinality(v_best) = 0 or cardinality(v_worst) = 0 then
        raise exception 'Det må være minst én stemme i hver kategori før finalen kan starte.';
      end if;
      update voting.settings set phase = 'final', final_best = v_best, final_worst = v_worst where id = 1;

    when 'back_to_round1' then
      if v_phase <> 'final' then raise exception 'Finalen er ikke startet.'; end if;
      if exists (select 1 from voting.ballots where round = 2) then
        raise exception 'Noen har allerede stemt i finalen. Kan ikke gå tilbake.';
      end if;
      update voting.settings set phase = 'round1', final_best = '{}', final_worst = '{}' where id = 1;

    when 'finish' then
      if v_phase <> 'final' then raise exception 'Finalen er ikke i gang.'; end if;
      update voting.settings set phase = 'done', reveal = false where id = 1;

    when 'reopen_final' then
      if v_phase <> 'done' then raise exception 'Avstemningen er ikke avsluttet.'; end if;
      update voting.settings set phase = 'final', reveal = false where id = 1;

    when 'reveal' then
      if v_phase <> 'done' then raise exception 'Avslutt finalen før vinnerne vises.'; end if;
      update voting.settings set reveal = true where id = 1;

    when 'hide' then
      update voting.settings set reveal = false where id = 1;

    -- Same as voting.reset(): keeps the codes, so printed slips still work.
    when 'reset' then
      perform voting.reset();

    else
      raise exception 'Ukjent handling: %', p_action;
  end case;
end $$;

-- Voting opens by itself once this many have registered (or at voting_opens_at).
create or replace function public.admin_set_expected_count(p_password text, p_count int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform voting.check_admin(p_password);
  if p_count is null or p_count < 1 or p_count > 500 then
    raise exception 'Antall deltakere må være mellom 1 og 500.';
  end if;
  update voting.settings set expected_count = p_count where id = 1;
  perform voting.sync_phase();
end $$;

-- ---------------------------------------------------------------------------
-- Privileges: the site (roles anon/authenticated) may only call the
-- functions above, nothing else.
-- ---------------------------------------------------------------------------

revoke all on all functions in schema voting from public, anon, authenticated;
grant execute on function voting.upload_allowed(text) to anon, authenticated;

revoke all on function public.participant_state(text) from public;
revoke all on function public.register_start(text) from public;
revoke all on function public.register(text, text, uuid) from public;
revoke all on function public.cast_vote(text, uuid, uuid) from public;
revoke all on function public.screen_state() from public;
revoke all on function public.admin_overview(text) from public;
revoke all on function public.admin_action(text, text) from public;
revoke all on function public.admin_set_expected_count(text, int) from public;
grant execute on function public.participant_state(text) to anon, authenticated;
grant execute on function public.register_start(text) to anon, authenticated;
grant execute on function public.register(text, text, uuid) to anon, authenticated;
grant execute on function public.cast_vote(text, uuid, uuid) to anon, authenticated;
grant execute on function public.screen_state() to anon, authenticated;
grant execute on function public.admin_overview(text) to anon, authenticated;
grant execute on function public.admin_action(text, text) to anon, authenticated;
grant execute on function public.admin_set_expected_count(text, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Photo storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mustaches', 'mustaches', true, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "mustaches: upload with token" on storage.objects;
create policy "mustaches: upload with token" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'mustaches' and voting.upload_allowed(name));

drop policy if exists "mustaches: read" on storage.objects;
create policy "mustaches: read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'mustaches');
