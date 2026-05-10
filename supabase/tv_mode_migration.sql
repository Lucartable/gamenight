-- =========================================================================
-- Migration non destructive — Mode TV
-- Permet à un appareil de servir d'écran principal (Kahoot/Jackbox style).
-- =========================================================================

alter table public.rooms
  add column if not exists host_mode text not null default 'classic';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rooms_host_mode_check') then
    alter table public.rooms
      add constraint rooms_host_mode_check
      check (host_mode in ('classic', 'tv'));
  end if;
end $$;

create index if not exists rooms_host_mode_idx on public.rooms(host_mode);
