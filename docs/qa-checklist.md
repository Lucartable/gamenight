# Checklist QA Badaboum

Utilise cette checklist avant de livrer une modification qui touche aux jeux, questions ou flows Supabase.

## Socle commun

- Invite non connecte : creer une room, rejoindre une room, voter, revenir au lobby.
- Admin/trusted connecte : creer une room, jouer comme joueur normal, acceder a `/questions`, sauvegarder une question en partie.
- Questions live : l'hote et les joueurs peuvent chacun soumettre leurs questions quand l'option est active.
- Questions sauvegardees : visibles uniquement trusted/admin, reutilisables dans la config.
- Mix intelligent : les questions live doivent etre garanties avant le remplissage systeme.
- Retour lobby : disponible depuis le bilan et sans bloquer les joueurs.
- Mobile portrait : boutons lisibles, pas de texte coupe, pas de hover/glow qui deborde.

## Qui pourrait ?

- Systeme uniquement.
- Joueurs uniquement avec `optionA` et `optionB`.
- Mix systeme + joueurs.
- Sauvegardees uniquement.
- Rejet clair si une question joueur n'a pas ses deux options.

## Qui de nous ?

- Systeme uniquement.
- Joueurs uniquement avec texte simple.
- Mix systeme + joueurs.
- Sauvegardees uniquement.
- Heatmap finale avec votes nominaux.

## Majorite

- Systeme uniquement.
- Joueurs uniquement avec au moins 2 options.
- Mix systeme + joueurs.
- Sauvegardees uniquement.
- Score de majorite et streaks corrects.

## Minorite

- Systeme uniquement.
- Joueurs uniquement avec au moins 2 options.
- Mix systeme + joueurs.
- Sauvegardees uniquement.
- Options sans vote gerees proprement.

## Mime les expressions

- Configuration ordre arrivee, aleatoire, personnalise.
- L'hote peut ajouter ses expressions si questions joueurs est actif.
- Passage automatique du mime.
- Relancer, reveler, manche suivante, finir.
- Bilan adapte au mime, sans stats de votes absurdes.

## Jauge

- Systeme uniquement.
- Joueurs uniquement.
- Mix systeme + joueurs.
- Sauvegardees uniquement.
- Ordre cible aleatoire, arrivee, personnalise.
- Anonymat visible, round anonyme, reveal final, permanent.
- Reveal moyenne + distribution + commentaires.

## Debug admin

- Se connecter admin/trusted.
- Ouvrir une room host.
- Verifier le panneau `Debug admin` : etat room, question courante, pool restant, joueurs, votes, notes, diagnostics QuestionPoolEngine.
