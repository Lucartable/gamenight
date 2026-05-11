-- =========================================================================
-- Migration non destructive — Jeu "L'Intrus" (Undercover style)
-- =========================================================================

alter table public.rooms
  add column if not exists intrus_game_state jsonb;

-- Étendre le check sur rooms.game_type (drop puis re-create avec le nouveau game type)
do $$
declare
  cname text;
begin
  for cname in
    select conname from pg_constraint
    where conrelid = 'public.rooms'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%game_type%who_would%'
  loop
    execute format('alter table public.rooms drop constraint %I', cname);
  end loop;
end $$;

alter table public.rooms
  add constraint rooms_game_type_check
  check (game_type is null or game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge','intrus'));

-- Étendre le check sur votes.game_type
do $$
declare
  cname text;
begin
  for cname in
    select conname from pg_constraint
    where conrelid = 'public.votes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%game_type%who_would%'
  loop
    execute format('alter table public.votes drop constraint %I', cname);
  end loop;
end $$;

alter table public.votes
  add constraint votes_game_type_check
  check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge','intrus'));

-- La clause CHECK sur (selected_option vs selected_player_id) doit accepter le cas intrus
do $$
declare
  cname text;
begin
  for cname in
    select conname from pg_constraint
    where conrelid = 'public.votes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%selected_option%selected_player_id%'
  loop
    execute format('alter table public.votes drop constraint %I', cname);
  end loop;
end $$;

alter table public.votes
  add constraint votes_payload_shape_check
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
    or
    (game_type = 'intrus' and selected_option is null and selected_player_id is not null)
  );

-- Étendre le check sur asked_questions.game_type
do $$
declare
  cname text;
begin
  for cname in
    select conname from pg_constraint
    where conrelid = 'public.asked_questions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%game_type%who_would%'
  loop
    execute format('alter table public.asked_questions drop constraint %I', cname);
  end loop;
end $$;

alter table public.asked_questions
  add constraint asked_questions_game_type_check
  check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge','intrus'));

-- Étendre les checks sur custom_questions / saved_custom_questions / question_packs
do $$
declare
  cname text;
  tbl  text;
begin
  for tbl in select unnest(array['custom_questions','saved_custom_questions','question_packs']) loop
    for cname in
      select conname from pg_constraint
      where conrelid = ('public.' || tbl)::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%game_type%who_would%'
    loop
      execute format('alter table public.%I drop constraint %I', tbl, cname);
    end loop;
  end loop;
end $$;

alter table public.custom_questions
  add constraint custom_questions_game_type_check
  check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge','intrus'));

alter table public.saved_custom_questions
  add constraint saved_custom_questions_game_type_check
  check (game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge','intrus'));

alter table public.saved_custom_questions
  add constraint saved_custom_questions_source_game_check
  check (source_game in ('who_would','who_of_us','majority','minority','mime_expressions','jauge','intrus'));

alter table public.question_packs
  add constraint question_packs_game_type_check
  check (game_type is null or game_type in ('who_would','who_of_us','majority','minority','mime_expressions','jauge','intrus'));
