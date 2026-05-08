-- =========================================================================
-- Migration non destructive - UX admin / bibliothèque
--
-- Aligne les policies packs avec le flow où un admin peut gérer tous les
-- packs, tandis qu'un trusted reste limité à ses propres packs.
-- =========================================================================

drop policy if exists "packs_write_trusted" on public.question_packs;
create policy "packs_write_trusted" on public.question_packs
  for all using (
    public.is_trusted_or_admin()
    and (owner_user_id = auth.uid() or public.current_user_role() = 'admin')
  ) with check (
    public.is_trusted_or_admin()
    and (owner_user_id = auth.uid() or public.current_user_role() = 'admin')
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
      and (p.owner_user_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );

