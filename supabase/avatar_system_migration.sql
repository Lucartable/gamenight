-- =========================================================================
-- Migration non destructive - Avatars visuels DiceBear
-- À exécuter sur une base existante avant de déployer le nouveau front.
-- =========================================================================

alter table public.players
  add column if not exists avatar_style text,
  add column if not exists avatar_seed text,
  add column if not exists avatar_options jsonb not null default '{}',
  add column if not exists avatar_color text;

update public.players
set
  avatar_style = coalesce(avatar_style, 'adventurer'),
  avatar_seed = coalesce(avatar_seed, guest_id, client_id, id::text),
  avatar_color = coalesce(avatar_color, color, '#ff3ea5'),
  avatar_options = coalesce(avatar_options, '{}'::jsonb)
where avatar_style is null
   or avatar_seed is null
   or avatar_color is null
   or avatar_options is null;

alter table public.players
  alter column avatar_options set default '{}'::jsonb;

alter table public.players
  alter column avatar_options set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'players_avatar_style_check') then
    alter table public.players
      add constraint players_avatar_style_check
      check (avatar_style is null or avatar_style in ('adventurer','bottts-neutral','lorelei','micah','fun-emoji','personas'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'players_avatar_seed_length_check') then
    alter table public.players
      add constraint players_avatar_seed_length_check
      check (avatar_seed is null or char_length(trim(avatar_seed)) between 1 and 96);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'players_avatar_options_object_check') then
    alter table public.players
      add constraint players_avatar_options_object_check
      check (jsonb_typeof(avatar_options) = 'object');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'players_avatar_color_format_check') then
    alter table public.players
      add constraint players_avatar_color_format_check
      check (avatar_color is null or avatar_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;

alter table public.players replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.players;
  exception when duplicate_object then null;
  end;
end $$;
