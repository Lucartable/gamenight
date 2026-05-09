# Architecture Badaboum

## Game Engine Contracts

Le fichier `lib/gameEngine.ts` centralise un contrat par mode de jeu :

- configuration supportee;
- format de question;
- format de reponse;
- flow de manche;
- flow de reveal;
- profil de bilan;
- validation de question.

Aujourd'hui, `QuestionPoolEngine` utilise deja ce contrat pour valider les questions systeme, live et sauvegardees. Les prochains refactors peuvent progressivement brancher les ecrans de jeu dessus pour eviter que chaque mode recree sa propre logique.

## QuestionPoolEngine

`lib/questionPoolEngine.ts` reste la porte d'entree pour construire un pool de questions.

Garanties attendues :

- `system_only` ignore live/saved;
- `players_only` ignore system/saved;
- `saved_only` ignore system/live;
- `smart_mix` garantit les questions live activees puis complete avec systeme;
- `all_mix` garantit live + sauvegardees puis complete avec systeme;
- les formats incompatibles sont rejetes avant lancement.

Les tests unitaires dans `tests/questionPoolEngine.test.ts` couvrent ces garanties.

## Decoupage en cours

Les premiers fichiers extraits :

- `app/animations.css` : keyframes et classes d'animation partagees;
- `app/game.css`, `app/home.css`, `app/jauge.css`, `app/summary.css`, `app/ui.css` : styles decoupes par domaine;
- `lib/endGameSummaryTypes.ts` : types du bilan;
- `lib/endGameSummaryLabels.ts` : profils, titres et libelles du bilan;
- `lib/endGameSummaryUtils.ts` : helpers purs de stats;
- `lib/endGameSummaryJauge.ts` : bilan specifique du mode Jauge;
- `lib/endGameSummaryMime.ts` : bilan specifique du mode Mime;
- `lib/endGameSummaryOptions.ts` : stats d'options et moments rares generiques;
- `lib/endGameSummaryRelations.ts` : heatmap et insights sociaux;
- `lib/whoOfUsCategories.ts` : categories du mode Qui de nous;
- `lib/gameEngine.ts` : contrats communs des jeux.
- `lib/questionPoolTypes.ts` : types et settings du moteur de questions;
- `lib/questionPoolTransform.ts` : conversion snapshots, payloads, questions live/sauvegardees.

Prochaine etape utile : extraire les spotlights generiques du bilan (`social_vote`, `duel`, `prediction`) pour alleger encore `lib/endGameSummary.ts`.
