-- =========================================================================
-- Migration non destructive - Mode Jauge
-- À utiliser si la base existe déjà. Pour une réinstallation complète,
-- exécuter plutôt supabase/schema.sql.
-- =========================================================================

alter table public.rooms
  add column if not exists jauge_game_state jsonb,
  add column if not exists round_question_ids integer[] not null default '{}';

create table if not exists public.ratings (
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

create index if not exists ratings_room_q_idx on public.ratings(room_id, question_id);
create index if not exists ratings_voter_idx on public.ratings(voter_player_id);
create index if not exists ratings_target_idx on public.ratings(target_player_id);

alter table public.rooms drop constraint if exists rooms_game_type_check;
alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.questions drop constraint if exists questions_game_type_check;
alter table public.questions drop constraint if exists questions_check;
alter table public.votes drop constraint if exists votes_game_type_check;
alter table public.votes drop constraint if exists votes_check;
alter table public.asked_questions drop constraint if exists asked_questions_game_type_check;

alter table public.rooms
  add constraint rooms_game_type_check
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge')),
  add constraint rooms_status_check
    check (status in ('lobby','question_active','reveal_results','scoreboard','end_game_summary','ended'));

alter table public.questions
  add constraint questions_game_type_check
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge')),
  add constraint questions_check
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
    );

alter table public.votes
  add constraint votes_game_type_check
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge')),
  add constraint votes_check
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
    );

alter table public.asked_questions
  add constraint asked_questions_game_type_check
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge'));

alter table public.ratings enable row level security;

drop policy if exists "ratings_all" on public.ratings;
create policy "ratings_all" on public.ratings
  for all using (true) with check (true);

alter table public.rooms   replica identity full;
alter table public.ratings replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.rooms;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.ratings;
  exception when duplicate_object then null;
  end;
end $$;
