# Supabase - Badaboum

Ce dossier contient deux familles de SQL.

## Base neuve

Utilise `schema.sql` si tu veux repartir de zero.

Important : ce script supprime et recree les tables principales. Il est adapte a une base de dev ou a une reinstallation complete, pas a une base de production avec des parties a conserver.

## Base existante

Les fichiers `*_migration.sql` sont des migrations non destructives historiques. Ils servent a faire evoluer une base deja creee sans tout supprimer.

Ordre conseille pour une base existante ancienne :

1. `majority_minority_migration.sql`
2. `mime_expressions_migration.sql`
3. `jauge_migration.sql`
4. `question_library_migration.sql`
5. `guest_auth_refactor_migration.sql`
6. `admin_library_flow_migration.sql`
7. `avatar_system_migration.sql`

## Convention pour les prochaines migrations

Pour les futures features, cree des fichiers dates :

```text
supabase/migrations/20260509_add_feature_name.sql
```

Chaque migration doit etre :

- idempotente quand c'est possible avec `if not exists`;
- non destructive par defaut;
- accompagnee d'une courte note dans ce README si elle change les roles, RLS ou realtime;
- testee sur une base de dev avant execution sur une base importante.

## Roles et securite

- Les invites peuvent jouer, rejoindre, voter et ajouter des questions live.
- Les objets persistants comme `saved_custom_questions` et `question_packs` restent reserves aux roles `trusted` et `admin` via RLS.
- La cle `service_role` ne doit jamais etre exposee dans le frontend.
