-- =========================================================================
-- Badaboum - Schéma Supabase complet
-- À exécuter dans l'éditeur SQL Supabase pour repartir sur une base propre.
--
-- ATTENTION : ce script supprime les anciennes tables de jeu avant de les
-- recréer. Les salles, joueurs, votes et historiques existants seront perdus.
-- =========================================================================

drop table if exists public.votes cascade;
drop table if exists public.asked_questions cascade;
drop table if exists public.questions cascade;
drop table if exists public.players cascade;
drop table if exists public.rooms cascade;

-- ----- TYPES LOGIQUES ------------------------------------------------------
-- Les checks textuels gardent le schéma simple côté Supabase JS.
-- game_type :
--   'who_would' = Tu préfères, vote entre deux options
--   'who_of_us' = joueur désigné
--   'majority' = prédire la réponse majoritaire
--   'minority' = viser une minorité valide
--   'mime_expressions' = ordre de passage automatique + expression à mimer

-- ----- ROOMS ---------------------------------------------------------------
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_client_id text not null,
  game_type text
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions')),
  status text not null default 'lobby'
    check (status in ('lobby','question_active','reveal_results','scoreboard','end_game_summary','ended')),
  current_question_id integer,
  question_started_at timestamptz,
  reveal_started_at timestamptz,
  scoreboard_started_at timestamptz,
  total_questions integer not null default 10
    check (total_questions between 1 and 400),
  vote_duration_sec integer not null default 30
    check (vote_duration_sec between 5 and 300),
  reveal_duration_sec integer not null default 15
    check (reveal_duration_sec between 3 and 300),
  scoreboard_duration_sec integer not null default 7
    check (scoreboard_duration_sec between 3 and 60),
  autoplay boolean not null default false,
  hide_scores boolean not null default false,
  scoreboard_frequency text not null default 'round'
    check (scoreboard_frequency in ('round','end')),
  score_target integer
    check (score_target is null or score_target between 1 and 999),
  selected_categories text[] not null default '{}',
  round_question_ids integer[] not null default '{}',
  mime_game_state jsonb,
  created_at timestamptz not null default now()
);

create index rooms_code_idx on public.rooms(code);
create index rooms_game_type_idx on public.rooms(game_type);

-- ----- QUESTIONS -----------------------------------------------------------
-- L'app embarque aujourd'hui les questions dans le code pour rester rapide.
-- Cette table prépare une migration future vers des questions administrables.
create table public.questions (
  id integer primary key,
  game_type text not null
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions')),
  text text,
  option_a text,
  option_b text,
  options jsonb,
  category text not null,
  difficulty text,
  created_at timestamptz not null default now(),
  check (
    (game_type = 'who_would' and option_a is not null and option_b is not null)
    or
    (game_type = 'who_of_us' and text is not null and option_a is null and option_b is null)
    or
    (game_type = 'mime_expressions' and text is not null and option_a is null and option_b is null)
    or
    (
      game_type in ('majority','minority')
      and text is not null
      and options is not null
      and jsonb_typeof(options) = 'array'
      and jsonb_array_length(options) between 2 and 8
    )
  )
);

create index questions_game_category_idx on public.questions(game_type, category);

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
  game_type text not null
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions')),
  voter_player_id uuid not null references public.players(id) on delete cascade,
  question_id integer not null,
  selected_option text,
  selected_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (room_id, game_type, question_id, voter_player_id),
  check (
    (game_type = 'who_would' and selected_option is not null and selected_player_id is null)
    or
    (game_type = 'who_of_us' and selected_option is null and selected_player_id is not null)
    or
    (game_type in ('majority','minority') and selected_option is not null and selected_player_id is null)
    or
    (game_type = 'mime_expressions' and selected_option is null and selected_player_id is null)
  )
);

create index votes_room_game_q_idx on public.votes(room_id, game_type, question_id);
create index votes_voter_idx on public.votes(voter_player_id);
create index votes_selected_player_idx on public.votes(selected_player_id);

-- ----- ASKED QUESTIONS -----------------------------------------------------
create table public.asked_questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  game_type text not null
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions')),
  question_id integer not null,
  asked_at timestamptz not null default now(),
  unique (room_id, game_type, question_id)
);

create index asked_questions_room_game_idx on public.asked_questions(room_id, game_type);

-- =========================================================================
-- ROW LEVEL SECURITY
-- Jeu de soirée éphémère sans authentification : lecture + écriture publique.
-- À durcir si l'app devient publique à grande échelle.
-- =========================================================================
alter table public.rooms enable row level security;
alter table public.questions enable row level security;
alter table public.players enable row level security;
alter table public.votes enable row level security;
alter table public.asked_questions enable row level security;

create policy "rooms_all" on public.rooms
  for all using (true) with check (true);

create policy "questions_all" on public.questions
  for all using (true) with check (true);

create policy "players_all" on public.players
  for all using (true) with check (true);

create policy "votes_all" on public.votes
  for all using (true) with check (true);

create policy "asked_questions_all" on public.asked_questions
  for all using (true) with check (true);

-- =========================================================================
-- REALTIME
-- rooms pilote le flow, players/votes/asked_questions gardent tous les écrans
-- synchronisés. questions est ajouté aussi pour une future édition live.
-- =========================================================================
alter table public.rooms           replica identity full;
alter table public.questions       replica identity full;
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
    alter publication supabase_realtime add table public.questions;
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
