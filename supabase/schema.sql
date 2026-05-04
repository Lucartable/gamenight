-- =========================================================================
-- GameNight - Schéma Supabase pour "Tu préfères ?"
-- À exécuter dans l'éditeur SQL de Supabase (une seule fois).
-- =========================================================================

-- Pour repartir de zéro, décommente ces lignes :
-- drop table if exists public.votes cascade;
-- drop table if exists public.asked_questions cascade;
-- drop table if exists public.players cascade;
-- drop table if exists public.rooms cascade;

-- ----- ROOMS ---------------------------------------------------------------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_client_id text not null,
  status text not null default 'lobby'
    check (status in ('lobby','voting','reveal','debate','ended')),
  current_question_id integer,
  question_started_at timestamptz,
  debate_started_at timestamptz,
  debate_mode boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----- PLAYERS -------------------------------------------------------------
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  client_id text not null,
  name text not null,
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, client_id)
);

create index if not exists players_room_id_idx on public.players(room_id);

-- ----- VOTES ---------------------------------------------------------------
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  question_id integer not null,
  choice text not null check (choice in ('A','B')),
  created_at timestamptz not null default now(),
  unique (room_id, player_id, question_id)
);

create index if not exists votes_room_q_idx on public.votes(room_id, question_id);

-- ----- ASKED QUESTIONS (historique pour ne pas reposer) -------------------
create table if not exists public.asked_questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  question_id integer not null,
  asked_at timestamptz not null default now(),
  unique (room_id, question_id)
);

-- =========================================================================
-- ROW LEVEL SECURITY
-- Pour aller vite et garder l'app simple (jeu de soirée éphémère, pas
-- d'authentification), on autorise lecture + écriture publique. À durcir
-- pour un usage production.
-- =========================================================================
alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.votes enable row level security;
alter table public.asked_questions enable row level security;

drop policy if exists "rooms_all" on public.rooms;
create policy "rooms_all" on public.rooms
  for all using (true) with check (true);

drop policy if exists "players_all" on public.players;
create policy "players_all" on public.players
  for all using (true) with check (true);

drop policy if exists "votes_all" on public.votes;
create policy "votes_all" on public.votes
  for all using (true) with check (true);

drop policy if exists "asked_questions_all" on public.asked_questions;
create policy "asked_questions_all" on public.asked_questions
  for all using (true) with check (true);

-- =========================================================================
-- REALTIME
-- Active la diffusion temps réel sur les tables qui changent pendant la
-- partie.
-- =========================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'votes'
  ) then
    alter publication supabase_realtime add table public.votes;
  end if;
end $$;
