-- =========================================================================
-- GameNight - Schéma Supabase complet pour "Tu préfères ?"
-- À exécuter dans l'éditeur SQL Supabase pour repartir sur une base propre.
--
-- ATTENTION : ce script supprime les anciennes tables de jeu avant de les
-- recréer. Les salles, joueurs, votes et historiques existants seront perdus.
-- =========================================================================

drop table if exists public.votes cascade;
drop table if exists public.asked_questions cascade;
drop table if exists public.players cascade;
drop table if exists public.rooms cascade;

-- ----- ROOMS ---------------------------------------------------------------
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_client_id text not null,
  status text not null default 'lobby'
    check (status in ('lobby','question_active','reveal_results','ended')),
  current_question_id integer,
  question_started_at timestamptz,
  reveal_started_at timestamptz,
  total_questions integer not null default 10
    check (total_questions between 1 and 400),
  vote_duration_sec integer not null default 30
    check (vote_duration_sec between 5 and 300),
  reveal_duration_sec integer not null default 15
    check (reveal_duration_sec between 3 and 300),
  autoplay boolean not null default false,
  created_at timestamptz not null default now()
);

create index rooms_code_idx on public.rooms(code);

-- ----- PLAYERS -------------------------------------------------------------
create table public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  client_id text not null,
  name text not null,
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, client_id)
);

create index players_room_id_idx on public.players(room_id);

-- ----- VOTES ---------------------------------------------------------------
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  question_id integer not null,
  choice text not null check (choice in ('A','B')),
  created_at timestamptz not null default now(),
  unique (room_id, player_id, question_id)
);

create index votes_room_q_idx on public.votes(room_id, question_id);
create index votes_player_idx on public.votes(player_id);

-- ----- ASKED QUESTIONS -----------------------------------------------------
create table public.asked_questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  question_id integer not null,
  asked_at timestamptz not null default now(),
  unique (room_id, question_id)
);

create index asked_questions_room_idx on public.asked_questions(room_id);

-- =========================================================================
-- ROW LEVEL SECURITY
-- Jeu de soirée éphémère sans authentification : lecture + écriture publique.
-- À durcir si l'app devient publique à grande échelle.
-- =========================================================================
alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.votes enable row level security;
alter table public.asked_questions enable row level security;

create policy "rooms_all" on public.rooms
  for all using (true) with check (true);

create policy "players_all" on public.players
  for all using (true) with check (true);

create policy "votes_all" on public.votes
  for all using (true) with check (true);

create policy "asked_questions_all" on public.asked_questions
  for all using (true) with check (true);

-- =========================================================================
-- REALTIME
-- Les updates de rooms pilotent le flow. Les players/votes/asked_questions
-- gardent les clients synchronisés sans dépendre uniquement du polling.
-- =========================================================================
alter table public.rooms           replica identity full;
alter table public.players         replica identity full;
alter table public.votes           replica identity full;
alter table public.asked_questions replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.rooms;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.players;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.votes;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.asked_questions;
  exception when duplicate_object then null;
  end;
end $$;
