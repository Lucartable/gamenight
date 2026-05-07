-- =========================================================================
-- Migration non destructive - Modes Majorité / Minorité
-- À utiliser si la base existe déjà. Pour une réinstallation complète,
-- exécuter plutôt supabase/schema.sql.
-- =========================================================================

alter table public.rooms
  add column if not exists scoreboard_started_at timestamptz,
  add column if not exists scoreboard_duration_sec integer not null default 7,
  add column if not exists hide_scores boolean not null default false,
  add column if not exists scoreboard_frequency text not null default 'round',
  add column if not exists score_target integer,
  add column if not exists mime_game_state jsonb;

alter table public.questions
  add column if not exists options jsonb;

alter table public.rooms drop constraint if exists rooms_game_type_check;
alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms drop constraint if exists rooms_scoreboard_duration_sec_check;
alter table public.rooms drop constraint if exists rooms_scoreboard_frequency_check;
alter table public.rooms drop constraint if exists rooms_score_target_check;

alter table public.questions drop constraint if exists questions_game_type_check;
alter table public.questions drop constraint if exists questions_check;

alter table public.votes drop constraint if exists votes_game_type_check;
alter table public.votes drop constraint if exists votes_selected_option_check;
alter table public.votes drop constraint if exists votes_check;

alter table public.asked_questions drop constraint if exists asked_questions_game_type_check;

alter table public.rooms
  add constraint rooms_game_type_check
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions')),
  add constraint rooms_status_check
    check (status in ('lobby','question_active','reveal_results','scoreboard','end_game_summary','ended')),
  add constraint rooms_scoreboard_duration_sec_check
    check (scoreboard_duration_sec between 3 and 60),
  add constraint rooms_scoreboard_frequency_check
    check (scoreboard_frequency in ('round','end')),
  add constraint rooms_score_target_check
    check (score_target is null or score_target between 1 and 999);

alter table public.questions
  add constraint questions_game_type_check
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions')),
  add constraint questions_check
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
    );

alter table public.votes
  add constraint votes_game_type_check
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions')),
  add constraint votes_check
    check (
      (game_type = 'who_would' and selected_option is not null and selected_player_id is null)
      or
      (game_type = 'who_of_us' and selected_option is null and selected_player_id is not null)
      or
      (game_type in ('majority','minority') and selected_option is not null and selected_player_id is null)
      or
      (game_type = 'mime_expressions' and selected_option is null and selected_player_id is null)
    );

alter table public.asked_questions
  add constraint asked_questions_game_type_check
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions'));

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
