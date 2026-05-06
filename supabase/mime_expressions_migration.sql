-- =========================================================================
-- Migration non destructive - Mode Mime les expressions
-- À utiliser si la base existe déjà. Pour une réinstallation complète,
-- exécuter plutôt supabase/schema.sql.
-- =========================================================================

alter table public.rooms
  add column if not exists mime_game_state jsonb;

alter table public.rooms drop constraint if exists rooms_game_type_check;
alter table public.questions drop constraint if exists questions_game_type_check;
alter table public.questions drop constraint if exists questions_check;
alter table public.votes drop constraint if exists votes_game_type_check;
alter table public.votes drop constraint if exists votes_check;
alter table public.asked_questions drop constraint if exists asked_questions_game_type_check;

alter table public.rooms
  add constraint rooms_game_type_check
    check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions'));

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

alter table public.rooms replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.rooms;
  exception when duplicate_object then null;
  end;
end $$;
