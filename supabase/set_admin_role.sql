-- =========================================================================
-- Badaboum - Promotion du compte principal en admin
--
-- À exécuter APRÈS avoir créé le compte dans Supabase Auth.
-- Ce script ne crée pas le mot de passe : il garde Supabase Auth responsable
-- de l'authentification et ne touche qu'au rôle applicatif.
-- =========================================================================

insert into public.profiles (id, role, display_name)
select id, 'admin', 'verde.luca21'
from auth.users
where lower(email) = lower('verde.luca21@gmail.com')
on conflict (id) do update
set role = 'admin',
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    updated_at = now();

