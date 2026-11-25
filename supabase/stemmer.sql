-- =============================================================================
-- Bartebord: kåring av årets beste og verste bart
--
-- Kjør hele filen i Supabase: SQL Editor → New query → lim inn → Run.
-- Filen kan kjøres på nytt uten at data går tapt.
--
-- Alle data ligger i skjemaet «stemmer», som ikke er tilgjengelig fra
-- nettleseren. Nettsiden snakker bare med databasen gjennom funksjonene
-- i «public» nederst, som sjekker kode, fase og regler på serveren.
--
-- Anonymitet: «ballots» lagrer HVEM som har stemt i hver runde, og «votes»
-- lagrer HVA som ble stemt. Det er ingen kobling mellom de to tabellene.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

create schema if not exists stemmer;
revoke all on schema stemmer from public;
-- Nødvendig for at opplastingsregelen for bilder (nederst) kan kalle
-- stemmer.upload_allowed. Gir ingen tilgang til tabellene.
grant usage on schema stemmer to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tabeller
-- ---------------------------------------------------------------------------

create table if not exists stemmer.settings (
  id int primary key default 1 check (id = 1),
  -- registrering → runde1 → finale → ferdig
  phase text not null default 'registrering'
    check (phase in ('registrering', 'runde1', 'finale', 'ferdig')),
  -- Avstemningen åpner av seg selv når så mange har registrert seg ...
  expected_count int not null default 22,
  -- ... eller på dette tidspunktet, det som kommer først.
  voting_opens_at timestamptz not null default '2026-11-28 18:00:00 Europe/Oslo',
  final_best uuid[] not null default '{}',
  final_worst uuid[] not null default '{}',
  -- Om vinnerne vises på storskjermen og telefonene.
  reveal boolean not null default false,
  admin_password_hash text
);
insert into stemmer.settings default values on conflict (id) do nothing;

create table if not exists stemmer.participants (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text,
  photo_path text,
  registered_at timestamptz
);

create table if not exists stemmer.upload_tokens (
  token uuid primary key default gen_random_uuid(),
  participant_id uuid not null references stemmer.participants on delete cascade,
  created_at timestamptz not null default now()
);

-- Hvem har stemt i hvilken runde (ikke hva).
create table if not exists stemmer.ballots (
  participant_id uuid not null references stemmer.participants on delete cascade,
  round int not null check (round in (1, 2)),
  primary key (participant_id, round)
);

-- Hva som ble stemt (ikke av hvem).
create table if not exists stemmer.votes (
  id uuid primary key default gen_random_uuid(),
  round int not null check (round in (1, 2)),
  best uuid references stemmer.participants on delete cascade,
  worst uuid references stemmer.participants on delete cascade
);

alter table stemmer.settings enable row level security;
alter table stemmer.participants enable row level security;
alter table stemmer.upload_tokens enable row level security;
alter table stemmer.ballots enable row level security;
alter table stemmer.votes enable row level security;
revoke all on all tables in schema stemmer from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Interne hjelpefunksjoner
-- ---------------------------------------------------------------------------

create or replace function stemmer.norm_code(p_code text)
returns text language sql immutable set search_path = '' as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

-- Fasen slik den faktisk er nå: registreringen går over i runde 1 når nok
-- deltakere har registrert seg eller klokken har passert åpningstidspunktet.
create or replace function stemmer.effective_phase()
returns text language sql stable set search_path = '' as $$
  select case
    when s.phase = 'registrering' and (
      now() >= s.voting_opens_at
      or (select count(*) from stemmer.participants where registered_at is not null) >= s.expected_count
    ) then 'runde1'
    else s.phase
  end
  from stemmer.settings s
$$;

create or replace function stemmer.sync_phase()
returns text language plpgsql set search_path = '' as $$
declare
  v_phase text := stemmer.effective_phase();
begin
  update stemmer.settings set phase = v_phase where phase <> v_phase;
  return v_phase;
end $$;

create or replace function stemmer.check_admin(p_password text)
returns void language plpgsql set search_path = '' as $$
declare
  v_hash text;
begin
  select admin_password_hash into v_hash from stemmer.settings;
  if v_hash is null then
    raise exception 'Adminpassordet er ikke satt. Kjør stemmer.set_admin_password i Supabase.';
  end if;
  if p_password is null or extensions.crypt(p_password, v_hash) <> v_hash then
    raise exception 'Feil passord.';
  end if;
end $$;

-- Antall stemmer per kandidat i en runde.
create or replace function stemmer.tally(p_round int)
returns table (id uuid, best_votes bigint, worst_votes bigint)
language sql stable set search_path = '' as $$
  select p.id,
    (select count(*) from stemmer.votes v where v.round = p_round and v.best = p.id),
    (select count(*) from stemmer.votes v where v.round = p_round and v.worst = p.id)
  from stemmer.participants p
  where p.registered_at is not null
$$;

-- Topp N (med alle som står likt på siste plass) blant dem som har fått stemmer.
create or replace function stemmer.top(p_round int, p_kind text, p_n int)
returns uuid[] language sql stable set search_path = '' as $$
  select coalesce(array_agg(id), '{}')
  from (
    select id, rank() over (order by c desc) as rk
    from (
      select id, case p_kind when 'best' then best_votes else worst_votes end as c
      from stemmer.tally(p_round)
    ) t
    where c > 0
  ) r
  where rk <= p_n
$$;

create or replace function stemmer.person(p_id uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('id', id, 'name', name, 'photo', photo_path)
  from stemmer.participants where id = p_id
$$;

create or replace function stemmer.people(p_ids uuid[], p_except uuid default null)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'photo', photo_path)
                            order by lower(name), id), '[]')
  from stemmer.participants
  where id = any(p_ids) and registered_at is not null
    and (p_except is null or id <> p_except)
$$;

create or replace function stemmer.registered_ids()
returns uuid[] language sql stable set search_path = '' as $$
  select coalesce(array_agg(id), '{}') from stemmer.participants where registered_at is not null
$$;

create or replace function stemmer.winners()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'best', stemmer.people(stemmer.top(2, 'best', 1)),
    'worst', stemmer.people(stemmer.top(2, 'worst', 1))
  )
$$;

-- Brukes av opplastingsregelen i Storage: et bilde kan bare lastes opp til
-- et filnavn som er en fersk opplastingsbillett fra register_start.
create or replace function stemmer.upload_allowed(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_name ~ '^[0-9a-f-]{36}\.jpg$'
    and exists (
      select 1 from stemmer.upload_tokens
      where token::text || '.jpg' = p_name
        and created_at > now() - interval '1 hour'
    )
$$;

-- ---------------------------------------------------------------------------
-- Oppsett (kjøres i SQL Editor, ikke tilgjengelig fra nettsiden)
-- ---------------------------------------------------------------------------

-- Lager p_count nye tilfeldige koder. Bokstaver og tall som lett forveksles
-- (0/O, 1/I/L) er utelatt.
create or replace function stemmer.generate_codes(p_count int)
returns setof text language plpgsql set search_path = '' as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_made int := 0;
begin
  while v_made < p_count loop
    select string_agg(substr(v_alphabet, 1 + get_byte(extensions.gen_random_bytes(1), 0) % length(v_alphabet), 1), '')
      into v_code from generate_series(1, 6);
    insert into stemmer.participants (code) values (v_code) on conflict (code) do nothing;
    if found then
      v_made := v_made + 1;
      return next v_code;
    end if;
  end loop;
end $$;

create or replace function stemmer.set_admin_password(p_password text)
returns void language plpgsql set search_path = '' as $$
begin
  if length(coalesce(p_password, '')) < 10 then
    raise exception 'Bruk et passord på minst 10 tegn.';
  end if;
  update stemmer.settings set admin_password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'));
end $$;

-- Nullstiller alt etter en generalprøve. Kodene beholdes, så utskrevne
-- lapper fortsatt gjelder. Fasen settes tilbake til registrering.
create or replace function stemmer.reset()
returns void language plpgsql set search_path = '' as $$
begin
  delete from stemmer.votes where true;
  delete from stemmer.ballots where true;
  delete from stemmer.upload_tokens where true;
  update stemmer.participants set name = null, photo_path = null, registered_at = null where true;
  update stemmer.settings set phase = 'registrering', final_best = '{}', final_worst = '{}', reveal = false;
end $$;

-- ---------------------------------------------------------------------------
-- Funksjoner nettsiden kaller (via supabase.rpc)
-- ---------------------------------------------------------------------------

-- Alt telefonen trenger å vite for å vise riktig skjerm.
create or replace function public.participant_state(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s stemmer.settings;
  p stemmer.participants;
  v_phase text := stemmer.sync_phase();
  v_round int;
  v_result jsonb;
begin
  select * into s from stemmer.settings;
  select * into p from stemmer.participants where code = stemmer.norm_code(p_code);
  if not found then
    return jsonb_build_object('valid', false);
  end if;

  v_round := case v_phase when 'runde1' then 1 when 'finale' then 2 end;

  v_result := jsonb_build_object(
    'valid', true,
    'id', p.id,
    'name', p.name,
    'photo', p.photo_path,
    'registered', p.registered_at is not null,
    'phase', v_phase,
    'voted', v_round is not null and exists (
      select 1 from stemmer.ballots b where b.participant_id = p.id and b.round = v_round),
    'registered_count', (select count(*) from stemmer.participants where registered_at is not null),
    'expected_count', s.expected_count,
    'voting_opens_at', s.voting_opens_at,
    'reveal', s.reveal
  );

  if p.registered_at is not null and v_round = 1 then
    v_result := v_result || jsonb_build_object(
      'best', stemmer.people(stemmer.registered_ids(), p.id),
      'worst', stemmer.people(stemmer.registered_ids(), p.id));
  elsif p.registered_at is not null and v_round = 2 then
    v_result := v_result || jsonb_build_object(
      'best', stemmer.people(s.final_best, p.id),
      'worst', stemmer.people(s.final_worst, p.id));
  end if;

  if v_phase = 'ferdig' and s.reveal then
    v_result := v_result || jsonb_build_object('winners', stemmer.winners());
  end if;

  return v_result;
end $$;

-- Steg 1 av registreringen: gir en billett til å laste opp ett bilde.
create or replace function public.register_start(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_token uuid;
begin
  select id into v_id from stemmer.participants where code = stemmer.norm_code(p_code);
  if not found then
    raise exception 'Ukjent kode.';
  end if;
  if stemmer.sync_phase() = 'ferdig' then
    raise exception 'Avstemningen er avsluttet.';
  end if;
  if (select count(*) from stemmer.upload_tokens where participant_id = v_id) >= 30 then
    raise exception 'For mange bildeforsøk. Snakk med en arrangør.';
  end if;
  insert into stemmer.upload_tokens (participant_id) values (v_id) returning token into v_token;
  return v_token;
end $$;

-- Steg 2 av registreringen: når bildet er lastet opp, lagres navn og bilde.
-- Kan kalles på nytt for å bytte bilde eller navn.
create or replace function public.register(p_code text, p_name text, p_token uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  select id into v_id from stemmer.participants where code = stemmer.norm_code(p_code) for update;
  if not found then
    raise exception 'Ukjent kode.';
  end if;
  if stemmer.sync_phase() = 'ferdig' then
    raise exception 'Avstemningen er avsluttet.';
  end if;
  if length(v_name) < 1 or length(v_name) > 40 then
    raise exception 'Skriv inn et navn på 1 til 40 tegn.';
  end if;
  if not exists (select 1 from stemmer.upload_tokens where token = p_token and participant_id = v_id) then
    raise exception 'Ugyldig bilde. Prøv å ta bildet på nytt.';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'barter' and name = p_token::text || '.jpg') then
    raise exception 'Bildet ble ikke lastet opp. Prøv igjen.';
  end if;

  update stemmer.participants
  set name = v_name,
      photo_path = p_token::text || '.jpg',
      registered_at = coalesce(registered_at, now())
  where id = v_id;

  perform stemmer.sync_phase();
end $$;

create or replace function public.cast_vote(p_code text, p_best uuid, p_worst uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s stemmer.settings;
  p stemmer.participants;
  v_phase text := stemmer.sync_phase();
  v_round int;
  v_best_ok uuid[];
  v_worst_ok uuid[];
begin
  select * into p from stemmer.participants where code = stemmer.norm_code(p_code) for update;
  if not found then
    raise exception 'Ukjent kode.';
  end if;
  if p.registered_at is null then
    raise exception 'Du må registrere barten din før du kan stemme.';
  end if;

  v_round := case v_phase when 'runde1' then 1 when 'finale' then 2 end;
  if v_round is null then
    raise exception 'Avstemningen er ikke åpen nå.';
  end if;
  if exists (select 1 from stemmer.ballots where participant_id = p.id and round = v_round) then
    raise exception 'Du har allerede stemt i denne runden.';
  end if;

  select * into s from stemmer.settings;
  if v_round = 1 then
    v_best_ok := stemmer.registered_ids();
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
  -- Hver stemme må gå til en gyldig kandidat. Bare hvis det ikke finnes noen
  -- å stemme på i en kategori (for eksempel bare deg selv i finalen), kan den stå tom.
  if (p_best is null and cardinality(v_best_ok) > 0) or (p_best is not null and not p_best = any(v_best_ok)) then
    raise exception 'Velg en gyldig kandidat til årets beste bart.';
  end if;
  if (p_worst is null and cardinality(v_worst_ok) > 0) or (p_worst is not null and not p_worst = any(v_worst_ok)) then
    raise exception 'Velg en gyldig kandidat til årets verste bart.';
  end if;

  insert into stemmer.ballots (participant_id, round) values (p.id, v_round);
  insert into stemmer.votes (round, best, worst) values (v_round, p_best, p_worst);
end $$;

-- Til storskjermen. Inneholder ingen stemmetall.
create or replace function public.screen_state()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s stemmer.settings;
  v_phase text := stemmer.sync_phase();
  v_result jsonb;
begin
  select * into s from stemmer.settings;
  v_result := jsonb_build_object(
    'phase', v_phase,
    'registered_count', (select count(*) from stemmer.participants where registered_at is not null),
    'expected_count', s.expected_count,
    'voting_opens_at', s.voting_opens_at,
    'voted_count', (select count(*) from stemmer.ballots
                    where round = case v_phase when 'finale' then 2 else 1 end),
    'reveal', s.reveal,
    'people', stemmer.people(stemmer.registered_ids())
  );
  if v_phase in ('finale', 'ferdig') then
    v_result := v_result || jsonb_build_object(
      'final_best', stemmer.people(s.final_best),
      'final_worst', stemmer.people(s.final_worst));
  end if;
  if v_phase = 'ferdig' and s.reveal then
    v_result := v_result || jsonb_build_object('winners', stemmer.winners());
  end if;
  return v_result;
end $$;

-- Alt adminsiden viser, inkludert stemmetall og koder.
create or replace function public.admin_overview(p_password text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s stemmer.settings;
  v_phase text := stemmer.sync_phase();
begin
  perform stemmer.check_admin(p_password);
  select * into s from stemmer.settings;
  return jsonb_build_object(
    'phase', v_phase,
    'expected_count', s.expected_count,
    'voting_opens_at', s.voting_opens_at,
    'reveal', s.reveal,
    'final_best', to_jsonb(s.final_best),
    'final_worst', to_jsonb(s.final_worst),
    'preview_best', to_jsonb(stemmer.top(1, 'best', 3)),
    'preview_worst', to_jsonb(stemmer.top(1, 'worst', 3)),
    'winners_best', to_jsonb(stemmer.top(2, 'best', 1)),
    'winners_worst', to_jsonb(stemmer.top(2, 'worst', 1)),
    'participants', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'code', p.code,
        'name', p.name,
        'photo', p.photo_path,
        'registered', p.registered_at is not null,
        'registered_at', p.registered_at,
        'voted1', exists (select 1 from stemmer.ballots b where b.participant_id = p.id and b.round = 1),
        'voted2', exists (select 1 from stemmer.ballots b where b.participant_id = p.id and b.round = 2),
        'r1_best', (select count(*) from stemmer.votes v where v.round = 1 and v.best = p.id),
        'r1_worst', (select count(*) from stemmer.votes v where v.round = 1 and v.worst = p.id),
        'r2_best', (select count(*) from stemmer.votes v where v.round = 2 and v.best = p.id),
        'r2_worst', (select count(*) from stemmer.votes v where v.round = 2 and v.worst = p.id)
      ) order by p.registered_at nulls last, p.code), '[]')
      from stemmer.participants p
    )
  );
end $$;

-- Knappene på adminsiden.
create or replace function public.admin_action(p_password text, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_phase text;
  v_best uuid[];
  v_worst uuid[];
begin
  perform stemmer.check_admin(p_password);
  v_phase := stemmer.sync_phase();

  case p_action
    when 'open_voting' then
      if v_phase <> 'registrering' then raise exception 'Avstemningen er allerede åpnet.'; end if;
      update stemmer.settings set phase = 'runde1';

    when 'start_final' then
      if v_phase <> 'runde1' then raise exception 'Finalen kan bare startes fra første runde.'; end if;
      v_best := stemmer.top(1, 'best', 3);
      v_worst := stemmer.top(1, 'worst', 3);
      if cardinality(v_best) = 0 or cardinality(v_worst) = 0 then
        raise exception 'Det må være minst én stemme i hver kategori før finalen kan starte.';
      end if;
      update stemmer.settings set phase = 'finale', final_best = v_best, final_worst = v_worst;

    when 'back_to_round1' then
      if v_phase <> 'finale' then raise exception 'Finalen er ikke startet.'; end if;
      if exists (select 1 from stemmer.ballots where round = 2) then
        raise exception 'Noen har allerede stemt i finalen. Kan ikke gå tilbake.';
      end if;
      update stemmer.settings set phase = 'runde1', final_best = '{}', final_worst = '{}';

    when 'finish' then
      if v_phase <> 'finale' then raise exception 'Finalen er ikke i gang.'; end if;
      update stemmer.settings set phase = 'ferdig', reveal = false;

    when 'reopen_final' then
      if v_phase <> 'ferdig' then raise exception 'Avstemningen er ikke avsluttet.'; end if;
      update stemmer.settings set phase = 'finale', reveal = false;

    when 'reveal' then
      if v_phase <> 'ferdig' then raise exception 'Avslutt finalen før vinnerne vises.'; end if;
      update stemmer.settings set reveal = true;

    when 'hide' then
      update stemmer.settings set reveal = false;

    else
      raise exception 'Ukjent handling: %', p_action;
  end case;
end $$;

-- ---------------------------------------------------------------------------
-- Tilganger: nettsiden (rollene anon/authenticated) får bare kalle
-- funksjonene ovenfor, ikke noe annet.
-- ---------------------------------------------------------------------------

revoke all on all functions in schema stemmer from public, anon, authenticated;
grant execute on function stemmer.upload_allowed(text) to anon, authenticated;

revoke all on function public.participant_state(text) from public;
revoke all on function public.register_start(text) from public;
revoke all on function public.register(text, text, uuid) from public;
revoke all on function public.cast_vote(text, uuid, uuid) from public;
revoke all on function public.screen_state() from public;
revoke all on function public.admin_overview(text) from public;
revoke all on function public.admin_action(text, text) from public;
grant execute on function public.participant_state(text) to anon, authenticated;
grant execute on function public.register_start(text) to anon, authenticated;
grant execute on function public.register(text, text, uuid) to anon, authenticated;
grant execute on function public.cast_vote(text, uuid, uuid) to anon, authenticated;
grant execute on function public.screen_state() to anon, authenticated;
grant execute on function public.admin_overview(text) to anon, authenticated;
grant execute on function public.admin_action(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Bildelagring
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('barter', 'barter', true, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "barter: last opp med billett" on storage.objects;
create policy "barter: last opp med billett" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'barter' and stemmer.upload_allowed(name));

drop policy if exists "barter: les" on storage.objects;
create policy "barter: les" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'barter');
