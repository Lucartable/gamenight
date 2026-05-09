-- =========================================================================
-- Badaboum - Schéma Supabase complet
-- À exécuter dans l'éditeur SQL Supabase pour repartir sur une base propre.
--
-- ATTENTION : ce script supprime les anciennes tables de jeu avant de les
-- recréer. Les salles, joueurs, votes et historiques existants seront perdus.
-- =========================================================================

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.current_user_role() cascade;
drop function if exists public.is_trusted_or_admin() cascade;
drop function if exists public.enforce_guest_room_limit() cascade;
drop function if exists public.enforce_custom_question_limit() cascade;
drop function if exists public.touch_room_activity_on_room_update() cascade;
drop function if exists public.touch_room_activity_from_child() cascade;
drop function if exists public.cleanup_inactive_rooms(interval) cascade;

drop table if exists public.ratings cascade;
drop table if exists public.votes cascade;
drop table if exists public.asked_questions cascade;
drop table if exists public.question_pack_items cascade;
drop table if exists public.question_packs cascade;
drop table if exists public.saved_custom_questions cascade;
drop table if exists public.custom_questions cascade;
drop table if exists public.questions cascade;
drop table if exists public.players cascade;
drop table if exists public.rooms cascade;
drop table if exists public.profiles cascade;

-- ----- TYPES LOGIQUES ------------------------------------------------------
-- Les checks textuels gardent le schéma simple côté Supabase JS.
-- game_type :
--   'who_would' = Tu préfères, vote entre deux options
--   'who_of_us' = joueur désigné
--   'majority' = prédire la réponse majoritaire
--   'minority' = viser une minorité valide
--   'mime_expressions' = ordre de passage automatique + expression à mimer
--   'jauge' = noter un joueur cible de 1 à 10

-- ----- ROOMS ---------------------------------------------------------------
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_client_id text not null,
  created_by_guest_id text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  game_type text
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge')),
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
  question_source_settings jsonb,
  current_question_snapshot jsonb,
  mime_game_state jsonb,
  jauge_game_state jsonb,
  last_activity_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index rooms_code_idx on public.rooms(code);
create index rooms_game_type_idx on public.rooms(game_type);
create index rooms_created_by_guest_idx on public.rooms(created_by_guest_id, created_at);
create index rooms_expires_at_idx on public.rooms(expires_at);

create or replace function public.enforce_guest_room_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by_guest_id is not null then
    if (
      select count(*)
      from public.rooms
      where created_by_guest_id = new.created_by_guest_id
      and created_at > now() - interval '1 hour'
    ) >= 8 then
      raise exception 'Limite de création de salles atteinte pour cette session invitée.';
    end if;
  end if;

  new.expires_at := coalesce(new.expires_at, now() + interval '12 hours');
  new.last_activity_at := coalesce(new.last_activity_at, now());
  return new;
end;
$$;

create trigger rooms_guest_rate_limit
  before insert on public.rooms
  for each row execute function public.enforce_guest_room_limit();

-- ----- QUESTIONS -----------------------------------------------------------
-- L'app embarque aujourd'hui les questions dans le code pour rester rapide.
-- Cette table prépare une migration future vers des questions administrables.
create table public.questions (
  id integer primary key,
  game_type text not null
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge')),
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
    (game_type = 'jauge' and text is not null and option_a is null and option_b is null)
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
  guest_id text,
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  avatar text,
  color text,
  avatar_style text,
  avatar_seed text,
  avatar_options jsonb not null default '{}',
  avatar_color text,
  is_host boolean not null default false,
  last_seen_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  unique (room_id, client_id),
  check (char_length(trim(name)) between 1 and 24),
  check (avatar is null or char_length(avatar) between 1 and 8),
  check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  check (avatar_style is null or avatar_style in ('adventurer','bottts-neutral','lorelei','micah','fun-emoji','personas')),
  check (avatar_seed is null or char_length(trim(avatar_seed)) between 1 and 96),
  check (jsonb_typeof(avatar_options) = 'object'),
  check (avatar_color is null or avatar_color ~ '^#[0-9A-Fa-f]{6}$')
);

create index players_room_id_idx on public.players(room_id);
create index players_guest_id_idx on public.players(guest_id);
create index players_auth_user_id_idx on public.players(auth_user_id);

-- ----- VOTES ---------------------------------------------------------------
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  game_type text not null
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge')),
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
    or
    (game_type = 'jauge' and selected_option is null and selected_player_id is null)
  )
);

create index votes_room_game_q_idx on public.votes(room_id, game_type, question_id);
create index votes_voter_idx on public.votes(voter_player_id);
create index votes_selected_player_idx on public.votes(selected_player_id);

-- ----- RATINGS -------------------------------------------------------------
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  game_type text not null default 'jauge'
    check (game_type = 'jauge'),
  voter_player_id uuid not null references public.players(id) on delete cascade,
  target_player_id uuid not null references public.players(id) on delete cascade,
  question_id integer not null,
  rating integer not null
    check (rating between 1 and 10),
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  unique (room_id, question_id, voter_player_id)
);

create index ratings_room_q_idx on public.ratings(room_id, question_id);
create index ratings_voter_idx on public.ratings(voter_player_id);
create index ratings_target_idx on public.ratings(target_player_id);

-- ----- AUTH PROFILES / ROLES ----------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'player'
    check (role in ('player','trusted','admin')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'player')
$$;

create or replace function public.is_trusted_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('trusted','admin')
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'player', coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----- CUSTOM QUESTIONS ----------------------------------------------------
create table public.custom_questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_player_id uuid not null references public.players(id) on delete cascade,
  game_type text not null
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge')),
  local_question_id integer not null,
  question_text text not null,
  category text not null default 'joueurs',
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (room_id, game_type, local_question_id),
  check (char_length(trim(question_text)) between 4 and 280),
  check (jsonb_typeof(payload) = 'object')
);

create index custom_questions_room_game_idx on public.custom_questions(room_id, game_type);
create index custom_questions_author_idx on public.custom_questions(author_player_id);

create or replace function public.enforce_custom_question_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.question_text := trim(regexp_replace(new.question_text, '[[:space:]]+', ' ', 'g'));

  if (
    select count(*)
    from public.custom_questions
    where room_id = new.room_id
      and game_type = new.game_type
      and author_player_id = new.author_player_id
  ) >= 20 then
    raise exception 'Limite de questions live atteinte pour ce joueur.';
  end if;

  return new;
end;
$$;

create trigger custom_questions_rate_limit
  before insert on public.custom_questions
  for each row execute function public.enforce_custom_question_limit();

create table public.saved_custom_questions (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  game_type text not null
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge')),
  local_question_id integer not null,
  question_text text not null,
  category text not null default 'sauvegardees',
  payload jsonb not null default '{}',
  source_game text not null
    check (source_game in ('who_would','who_of_us','majority','minority','mime_expressions','jauge')),
  original_author_id uuid references public.players(id) on delete set null,
  original_room_id uuid references public.rooms(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (host_user_id, local_question_id)
);

create index saved_custom_questions_host_game_idx on public.saved_custom_questions(host_user_id, game_type);
create index saved_custom_questions_text_idx on public.saved_custom_questions using gin (to_tsvector('french', question_text));

create table public.question_packs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  game_type text
    check (game_type is null or game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge')),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_pack_items (
  pack_id uuid not null references public.question_packs(id) on delete cascade,
  saved_question_id uuid not null references public.saved_custom_questions(id) on delete cascade,
  position integer not null default 0,
  primary key (pack_id, saved_question_id)
);

-- ----- ASKED QUESTIONS -----------------------------------------------------
create table public.asked_questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  game_type text not null
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge')),
  question_id integer not null,
  asked_at timestamptz not null default now(),
  unique (room_id, game_type, question_id)
);

create index asked_questions_room_game_idx on public.asked_questions(room_id, game_type);

create or replace function public.touch_room_activity_on_room_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.last_activity_at := now();
  return new;
end;
$$;

create trigger rooms_touch_activity
  before update on public.rooms
  for each row execute function public.touch_room_activity_on_room_update();

create or replace function public.touch_room_activity_from_child()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room_id uuid;
begin
  target_room_id := new.room_id;
  update public.rooms
  set last_activity_at = now()
  where id = target_room_id;
  return new;
end;
$$;

create trigger players_touch_room_activity
  after insert or update on public.players
  for each row execute function public.touch_room_activity_from_child();

create trigger votes_touch_room_activity
  after insert or update on public.votes
  for each row execute function public.touch_room_activity_from_child();

create trigger ratings_touch_room_activity
  after insert or update on public.ratings
  for each row execute function public.touch_room_activity_from_child();

create trigger custom_questions_touch_room_activity
  after insert or update on public.custom_questions
  for each row execute function public.touch_room_activity_from_child();

create trigger asked_questions_touch_room_activity
  after insert or update on public.asked_questions
  for each row execute function public.touch_room_activity_from_child();

create or replace function public.cleanup_inactive_rooms(max_age interval default interval '12 hours')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.rooms
  where coalesce(expires_at, last_activity_at + max_age, created_at + max_age) < now()
     or last_activity_at < now() - max_age;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- =========================================================================
-- ROW LEVEL SECURITY
-- Jeu de soirée éphémère : rooms/players/votes restent ouverts aux invités.
-- Les objets persistants (bibliothèque, packs, modération) sont protégés par
-- Supabase Auth + rôles trusted/admin.
-- =========================================================================
alter table public.rooms enable row level security;
alter table public.questions enable row level security;
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.votes enable row level security;
alter table public.ratings enable row level security;
alter table public.custom_questions enable row level security;
alter table public.saved_custom_questions enable row level security;
alter table public.question_packs enable row level security;
alter table public.question_pack_items enable row level security;
alter table public.asked_questions enable row level security;

create policy "rooms_all" on public.rooms
  for all using (true) with check (true);

create policy "questions_all" on public.questions
  for all using (true) with check (true);

create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.current_user_role() = 'admin');

create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles_admin_all" on public.profiles
  for all using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

create policy "players_all" on public.players
  for all using (true) with check (true);

create policy "votes_all" on public.votes
  for all using (true) with check (true);

create policy "ratings_all" on public.ratings
  for all using (true) with check (true);

create policy "custom_questions_room_all" on public.custom_questions
  for all using (true) with check (true);

create policy "saved_questions_select_trusted" on public.saved_custom_questions
  for select using (
    public.is_trusted_or_admin()
    and (host_user_id = auth.uid() or public.current_user_role() = 'admin')
  );

create policy "saved_questions_insert_trusted" on public.saved_custom_questions
  for insert with check (
    public.is_trusted_or_admin()
    and host_user_id = auth.uid()
  );

create policy "saved_questions_update_trusted" on public.saved_custom_questions
  for update using (
    public.is_trusted_or_admin()
    and (host_user_id = auth.uid() or public.current_user_role() = 'admin')
  ) with check (
    public.is_trusted_or_admin()
    and (host_user_id = auth.uid() or public.current_user_role() = 'admin')
  );

create policy "saved_questions_delete_trusted" on public.saved_custom_questions
  for delete using (
    public.is_trusted_or_admin()
    and (host_user_id = auth.uid() or public.current_user_role() = 'admin')
  );

create policy "packs_select" on public.question_packs
  for select using (
    is_public
    or (public.is_trusted_or_admin() and (owner_user_id = auth.uid() or public.current_user_role() = 'admin'))
  );

create policy "packs_write_trusted" on public.question_packs
  for all using (
    public.is_trusted_or_admin() and (owner_user_id = auth.uid() or public.current_user_role() = 'admin')
  ) with check (
    public.is_trusted_or_admin() and (owner_user_id = auth.uid() or public.current_user_role() = 'admin')
  );

create policy "pack_items_select" on public.question_pack_items
  for select using (
    exists (
      select 1 from public.question_packs p
      where p.id = pack_id
      and (p.is_public or (public.is_trusted_or_admin() and (p.owner_user_id = auth.uid() or public.current_user_role() = 'admin')))
    )
  );

create policy "pack_items_write_trusted" on public.question_pack_items
  for all using (
    exists (
      select 1 from public.question_packs p
      where p.id = pack_id
      and public.is_trusted_or_admin()
      and (p.owner_user_id = auth.uid() or public.current_user_role() = 'admin')
    )
  ) with check (
    exists (
      select 1 from public.question_packs p
      where p.id = pack_id
      and public.is_trusted_or_admin()
      and (p.owner_user_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );

create policy "asked_questions_all" on public.asked_questions
  for all using (true) with check (true);

-- =========================================================================
-- REALTIME
-- rooms pilote le flow, players/votes/asked_questions gardent tous les écrans
-- synchronisés. questions est ajouté aussi pour une future édition live.
-- =========================================================================
alter table public.rooms           replica identity full;
alter table public.questions       replica identity full;
alter table public.profiles        replica identity full;
alter table public.players         replica identity full;
alter table public.votes           replica identity full;
alter table public.ratings         replica identity full;
alter table public.custom_questions replica identity full;
alter table public.saved_custom_questions replica identity full;
alter table public.question_packs replica identity full;
alter table public.question_pack_items replica identity full;
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
    alter publication supabase_realtime add table public.profiles;
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
    alter publication supabase_realtime add table public.ratings;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.custom_questions;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.saved_custom_questions;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.question_packs;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.question_pack_items;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.asked_questions;
  exception when duplicate_object then null;
  end;
end $$;
