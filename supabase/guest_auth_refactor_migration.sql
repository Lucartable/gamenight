-- =========================================================================
-- Migration non destructive - Séparation invités / comptes admin-trusted
-- À utiliser si la base existe déjà. Pour une réinstallation complète,
-- exécuter plutôt supabase/schema.sql.
-- =========================================================================

alter table public.rooms
  add column if not exists created_by_guest_id text,
  add column if not exists created_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz;

alter table public.players
  add column if not exists guest_id text,
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists avatar text,
  add column if not exists color text,
  add column if not exists last_seen_at timestamptz not null default now();

update public.rooms
set created_by_guest_id = coalesce(created_by_guest_id, host_client_id),
    last_activity_at = coalesce(last_activity_at, created_at),
    expires_at = coalesce(expires_at, created_at + interval '12 hours')
where created_by_guest_id is null
   or last_activity_at is null
   or expires_at is null;

update public.players
set guest_id = coalesce(guest_id, client_id),
    avatar = coalesce(avatar, upper(left(name, 1))),
    color = coalesce(color, '#ff3ea5'),
    last_seen_at = coalesce(last_seen_at, joined_at)
where guest_id is null
   or avatar is null
   or color is null
   or last_seen_at is null;

create index if not exists rooms_created_by_guest_idx on public.rooms(created_by_guest_id, created_at);
create index if not exists rooms_expires_at_idx on public.rooms(expires_at);
create index if not exists players_guest_id_idx on public.players(guest_id);
create index if not exists players_auth_user_id_idx on public.players(auth_user_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'players_name_length_check') then
    alter table public.players
      add constraint players_name_length_check check (char_length(trim(name)) between 1 and 24);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'players_avatar_length_check') then
    alter table public.players
      add constraint players_avatar_length_check check (avatar is null or char_length(avatar) between 1 and 8);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'players_color_format_check') then
    alter table public.players
      add constraint players_color_format_check check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'custom_questions_text_length_check') then
    alter table public.custom_questions
      add constraint custom_questions_text_length_check check (char_length(trim(question_text)) between 4 and 280);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'custom_questions_payload_object_check') then
    alter table public.custom_questions
      add constraint custom_questions_payload_object_check check (jsonb_typeof(payload) = 'object');
  end if;
end $$;

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

drop trigger if exists rooms_guest_rate_limit on public.rooms;
create trigger rooms_guest_rate_limit
  before insert on public.rooms
  for each row execute function public.enforce_guest_room_limit();

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

drop trigger if exists custom_questions_rate_limit on public.custom_questions;
create trigger custom_questions_rate_limit
  before insert on public.custom_questions
  for each row execute function public.enforce_custom_question_limit();

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

drop trigger if exists rooms_touch_activity on public.rooms;
create trigger rooms_touch_activity
  before update on public.rooms
  for each row execute function public.touch_room_activity_on_room_update();

create or replace function public.touch_room_activity_from_child()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rooms
  set last_activity_at = now()
  where id = new.room_id;
  return new;
end;
$$;

drop trigger if exists players_touch_room_activity on public.players;
create trigger players_touch_room_activity
  after insert or update on public.players
  for each row execute function public.touch_room_activity_from_child();

drop trigger if exists votes_touch_room_activity on public.votes;
create trigger votes_touch_room_activity
  after insert or update on public.votes
  for each row execute function public.touch_room_activity_from_child();

drop trigger if exists ratings_touch_room_activity on public.ratings;
create trigger ratings_touch_room_activity
  after insert or update on public.ratings
  for each row execute function public.touch_room_activity_from_child();

drop trigger if exists custom_questions_touch_room_activity on public.custom_questions;
create trigger custom_questions_touch_room_activity
  after insert or update on public.custom_questions
  for each row execute function public.touch_room_activity_from_child();

drop trigger if exists asked_questions_touch_room_activity on public.asked_questions;
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

alter table public.rooms  replica identity full;
alter table public.players replica identity full;
alter table public.custom_questions replica identity full;
