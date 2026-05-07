-- =========================================================================
-- Migration non destructive - Bibliothèque globale de questions + rôles
-- À utiliser si la base existe déjà. Pour une réinstallation complète,
-- exécuter plutôt supabase/schema.sql.
--
-- Après exécution, promouvoir manuellement les comptes autorisés :
-- update public.profiles set role = 'trusted' where id = '<USER_UUID>';
-- =========================================================================

alter table public.rooms
  add column if not exists question_source_settings jsonb,
  add column if not exists current_question_snapshot jsonb;

-- ----- AUTH PROFILES / ROLES ----------------------------------------------
create table if not exists public.profiles (
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

insert into public.profiles (id, role, display_name)
select id, 'player', coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

-- ----- QUESTIONS JOUEURS / SAUVEGARDÉES ----------------------------------
create table if not exists public.custom_questions (
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
  unique (room_id, game_type, local_question_id)
);

create index if not exists custom_questions_room_game_idx on public.custom_questions(room_id, game_type);
create index if not exists custom_questions_author_idx on public.custom_questions(author_player_id);

create table if not exists public.saved_custom_questions (
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

create index if not exists saved_custom_questions_host_game_idx on public.saved_custom_questions(host_user_id, game_type);
create index if not exists saved_custom_questions_text_idx on public.saved_custom_questions using gin (to_tsvector('french', question_text));

create table if not exists public.question_packs (
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

create table if not exists public.question_pack_items (
  pack_id uuid not null references public.question_packs(id) on delete cascade,
  saved_question_id uuid not null references public.saved_custom_questions(id) on delete cascade,
  position integer not null default 0,
  primary key (pack_id, saved_question_id)
);

-- ----- RLS ----------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.custom_questions enable row level security;
alter table public.saved_custom_questions enable row level security;
alter table public.question_packs enable row level security;
alter table public.question_pack_items enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.current_user_role() = 'admin');

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop policy if exists "custom_questions_room_all" on public.custom_questions;
create policy "custom_questions_room_all" on public.custom_questions
  for all using (true) with check (true);

drop policy if exists "saved_questions_select_trusted" on public.saved_custom_questions;
create policy "saved_questions_select_trusted" on public.saved_custom_questions
  for select using (
    public.is_trusted_or_admin()
    and (host_user_id = auth.uid() or public.current_user_role() = 'admin')
  );

drop policy if exists "saved_questions_insert_trusted" on public.saved_custom_questions;
create policy "saved_questions_insert_trusted" on public.saved_custom_questions
  for insert with check (
    public.is_trusted_or_admin()
    and host_user_id = auth.uid()
  );

drop policy if exists "saved_questions_update_trusted" on public.saved_custom_questions;
create policy "saved_questions_update_trusted" on public.saved_custom_questions
  for update using (
    public.is_trusted_or_admin()
    and (host_user_id = auth.uid() or public.current_user_role() = 'admin')
  ) with check (
    public.is_trusted_or_admin()
    and (host_user_id = auth.uid() or public.current_user_role() = 'admin')
  );

drop policy if exists "saved_questions_delete_trusted" on public.saved_custom_questions;
create policy "saved_questions_delete_trusted" on public.saved_custom_questions
  for delete using (
    public.is_trusted_or_admin()
    and (host_user_id = auth.uid() or public.current_user_role() = 'admin')
  );

drop policy if exists "packs_select" on public.question_packs;
create policy "packs_select" on public.question_packs
  for select using (
    is_public
    or (public.is_trusted_or_admin() and (owner_user_id = auth.uid() or public.current_user_role() = 'admin'))
  );

drop policy if exists "packs_write_trusted" on public.question_packs;
create policy "packs_write_trusted" on public.question_packs
  for all using (
    public.is_trusted_or_admin() and (owner_user_id = auth.uid() or public.current_user_role() = 'admin')
  ) with check (
    public.is_trusted_or_admin() and owner_user_id = auth.uid()
  );

drop policy if exists "pack_items_select" on public.question_pack_items;
create policy "pack_items_select" on public.question_pack_items
  for select using (
    exists (
      select 1 from public.question_packs p
      where p.id = pack_id
      and (p.is_public or (public.is_trusted_or_admin() and (p.owner_user_id = auth.uid() or public.current_user_role() = 'admin')))
    )
  );

drop policy if exists "pack_items_write_trusted" on public.question_pack_items;
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
      and p.owner_user_id = auth.uid()
    )
  );

-- ----- REALTIME ------------------------------------------------------------
alter table public.rooms replica identity full;
alter table public.profiles replica identity full;
alter table public.custom_questions replica identity full;
alter table public.saved_custom_questions replica identity full;
alter table public.question_packs replica identity full;
alter table public.question_pack_items replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.rooms;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.profiles;
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
end $$;
