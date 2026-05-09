# 🎉 Badaboum

Application web de jeux de soirée multijoueur en temps réel.
L'hôte crée une salle, les autres rejoignent depuis leur téléphone, puis le groupe choisit un jeu.

Stack : **Next.js 14 (App Router) + TypeScript + Tailwind + Supabase Realtime**.

---

## ✨ Fonctionnalités

- 🎲 **Six jeux** : `Tu préfères`, `Qui de nous ?`, `Majorité`, `Minorité`, `Mime les expressions`, `Jauge`
- 🧩 **Questions et expressions embarquées** avec thèmes/filtres par jeu
- ✍️ **Questions écrites par les joueurs** sur tous les modes, avec mix intelligent garanti
- ⚡ **Mode invité sans compte** : pseudo, avatar/couleur, création ou rejoindre une room instantanément
- 🔐 **Connexion admin/trusted séparée** avec Supabase Auth : `player`, `trusted`, `admin`
- 📚 **Bibliothèque de questions sauvegardées** + packs réservés aux rôles `trusted/admin`
- ⏱️ **Timers configurables** côté serveur (vote + révélation)
- 👑 **Transfert d'hôte** à un autre joueur en cours de partie
- ▶️ **Lecture automatique** optionnelle pour enchaîner les questions
- ✅ **Validation manuelle du vote** avant envoi Supabase
- 🎭 **Ordre de mime automatique** configuré une seule fois par l'hôte
- 🧨 **Bilan de soirée** animé avec awards, heatmap sociale et scoreboard final
- 📱 **Mobile first** : gros boutons, fonctionne sur tous les téléphones
- 🎨 **Thème sombre festif** (néon rose/cyan)
- 🚫 **Aucune question ne se répète** dans la même partie

---

## 🚀 Démarrage rapide

### 1. Installer les dépendances

```bash
npm install
```

### 2. Créer un projet Supabase

1. Va sur [supabase.com](https://supabase.com), crée un nouveau projet (gratuit).
2. Dans **SQL Editor**, copie/colle le contenu de [`supabase/schema.sql`](supabase/schema.sql) et exécute-le. Ça crée les tables, les policies RLS, et active le temps réel sur les tables de jeu.
3. Dans **Project Settings → API**, récupère :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> **Important** : `schema.sql` repart de zéro et supprime les anciennes tables de jeu avant de les recréer. Les salles, joueurs et votes existants seront perdus.
> Pour une base déjà installée, exécute les migrations non destructives nécessaires, puis [`supabase/question_library_migration.sql`](supabase/question_library_migration.sql), [`supabase/guest_auth_refactor_migration.sql`](supabase/guest_auth_refactor_migration.sql) et [`supabase/avatar_system_migration.sql`](supabase/avatar_system_migration.sql).

### Compte admin principal

Le mot de passe admin ne doit jamais être écrit dans le frontend. Pour créer le compte principal, utilise Supabase Auth puis applique le rôle `admin`.

Méthode recommandée, via le script serveur :

```bash
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
ADMIN_EMAIL="verde.luca21@gmail.com" \
ADMIN_PASSWORD="admin123" \
npm run seed:admin
```

`SUPABASE_SERVICE_ROLE_KEY` se trouve dans **Project Settings → API** et doit rester secret : serveur/local uniquement, jamais dans une variable `NEXT_PUBLIC_*`.

Méthode manuelle :

1. Dans **Authentication → Users**, crée `verde.luca21@gmail.com` avec le mot de passe `admin123`.
2. Dans **SQL Editor**, exécute [`supabase/set_admin_role.sql`](supabase/set_admin_role.sql).

Pour autoriser un autre compte à gérer la bibliothèque, connecte-toi une première fois dans l'app, récupère l'UUID dans `auth.users`, puis exécute :

```sql
update public.profiles set role = 'trusted' where id = '<USER_UUID>';
```

### 3. Configurer les variables d'environnement

Crée un fichier `.env.local` à la racine (basé sur `.env.local.example`) :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> **Sur Vercel** : ajoute ces deux variables dans *Project Settings → Environment Variables* puis re-déploie.

### 4. Lancer l'app

```bash
npm run dev
```

Puis ouvre [http://localhost:3000](http://localhost:3000).

Pour tester en multi-appareils sur le même Wi-Fi : remplace `localhost` par l'IP de ta machine (ex : `http://192.168.1.42:3000`) sur les téléphones.

### Tests

```bash
npm run test
npm run lint
npm run build
```

Les tests unitaires couvrent en priorité [`lib/questionPoolEngine.ts`](lib/questionPoolEngine.ts), notamment les modes système/live/sauvegardées et la garantie d'injection des questions joueurs.

---

## 🎮 Comment jouer

1. **L'hôte** clique sur *Jouer en invité*, choisit son pseudo/couleur, puis *Créer une salle* → reçoit un code (ex : `LOUP-42`).
2. **Les joueurs** ouvrent le site sur leur téléphone, cliquent sur *Jouer en invité*, entrent le code et jouent sans compte.
3. L'hôte choisit un jeu.
4. L'hôte configure le nombre de questions/manches, les durées, la lecture automatique quand elle existe, et les thèmes.
5. L'hôte clique sur **Lancer la partie** → une question aléatoire compatible démarre.
6. Chaque joueur — **y compris l'hôte** — sélectionne son choix puis clique sur **Valider mon choix**.
7. À la révélation, tout le monde voit les résultats adaptés au jeu : pourcentages ou classement des personnes désignées.
8. L'hôte lance la question suivante, ou la lecture automatique s'en charge.
9. À tout moment, l'hôte peut **passer le rôle d'hôte** à un autre joueur via le bouton 👑 Transférer.
10. L'hôte peut terminer la partie à tout moment et déclencher le **Bilan de soirée**.

---

## 🗂️ Structure du projet

```
gamenight/
├── app/
│   ├── page.tsx                  # Accueil (créer / rejoindre)
│   ├── animations.css            # Keyframes et classes d'animation partagées
│   ├── game.css                  # Styles communs des écrans de jeu
│   ├── home.css                  # Styles de l'accueil
│   ├── jauge.css                 # Styles du mode Jauge
│   ├── summary.css               # Styles du bilan de soirée
│   ├── ui.css                    # Boutons, cards, inputs, bibliothèque
│   ├── host/[code]/page.tsx      # Vue hôte (lobby + contrôle + révélation)
│   ├── play/[code]/page.tsx      # Vue joueur (vote + résultats)
│   ├── questions/page.tsx        # Bibliothèque trusted/admin
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── endGameSummary.tsx        # Bilan de soirée animé
│   ├── avatarCustomizer.tsx      # Création/personnalisation avatar invité
│   ├── playerAvatar.tsx          # Affichage avatar visuel partout
│   └── jaugeMode.tsx             # UI de vote/reveal du mode Jauge
├── lib/
│   ├── supabase.ts               # Client Supabase singleton
│   ├── avatar.ts                 # Config DiceBear + normalisation
│   ├── guestSession.ts           # Session invité locale : guest_id, pseudo, avatar/couleur
│   ├── useRoom.ts                # Hook de synchro temps réel
│   ├── useProfile.ts             # Supabase Auth + rôle
│   ├── useSavedQuestions.ts      # Bibliothèque personnelle
│   ├── useCountdown.ts           # Compte à rebours basé sur un timestamp serveur
│   ├── questions.ts              # Questions du jeu Qui pourrait ?
│   ├── whoOfUsQuestions.ts       # Questions du jeu Qui de nous ?
│   ├── mimeExpressions.ts        # Expressions du jeu Mime les expressions
│   ├── jaugeQuestions.ts         # Questions du jeu Jauge
│   ├── jaugeGame.ts              # Helpers cible/questions/anonymat du mode Jauge
│   ├── mimeGame.ts               # Helpers d'ordre/tours du mode mime
│   ├── gameEngine.ts             # Contrats communs par jeu
│   ├── endGameSummary.ts         # Moteur de stats sociales universelles
│   ├── endGameSummaryJauge.ts    # Bilan specifique Jauge
│   ├── endGameSummaryMime.ts     # Bilan specifique Mime
│   ├── endGameSummaryOptions.ts  # Stats d'options et moments rares
│   ├── endGameSummaryRelations.ts # Heatmap et insights sociaux
│   ├── endGameSummaryTypes.ts    # Types du bilan de soirée
│   ├── gameQuestions.ts          # Définitions multi-jeux + helpers
│   ├── questionPoolEngine.ts     # Mix système/live/sauvegardées
│   ├── questionPoolTypes.ts      # Types et settings du moteur de questions
│   ├── questionPoolTransform.ts  # Snapshots, payloads, conversion live/saved
│   └── utils.ts                  # Code de salle, client_id, durées
├── docs/
│   ├── architecture.md           # Contrats de jeu et refactors en cours
│   └── qa-checklist.md           # Checklist manuelle par mode
├── types/
│   └── database.ts               # Types Supabase
├── supabase/
│   └── schema.sql                # Schéma complet à exécuter dans Supabase
└── ...
```

---

## 🐛 Bugs corrigés (par rapport à la première version)

- **Vote impossible côté hôte** : la vue `/host/[code]` ne montrait pas les boutons de vote. Maintenant l'hôte vote comme un joueur normal pendant la phase de vote.
- **Erreurs silencieuses sur l'upsert de vote** : un échec côté Supabase ne remontait nulle part. Il y a maintenant un message d'erreur visible et un *vote optimiste* (l'UI montre le vote sans attendre le retour realtime).
- **`asked_questions` pas dans la publication realtime** : la liste des questions déjà posées pouvait ne pas se rafraîchir. Corrigé dans `schema.sql` + `useRoom`.
- **Race au cleanup du channel realtime** : si on quittait la page avant la fin du `init()` async, le channel restait abonné. Refactorisé avec une `useRef` pour annulation propre.
- **Pas de bascule fluide après transfert d'hôte** : maintenant, dès que `room.host_client_id` change, l'ancien hôte est redirigé vers `/play/[code]` et le nouveau vers `/host/[code]`.

---

## 🧠 Choix techniques

- **Invités par défaut** : un `guest_id` est généré par navigateur et stocké localement avec pseudo/avatar/couleur. Il est réutilisé comme `client_id` pour rester compatible avec les rooms existantes.
- **Auth réservée aux outils avancés** : Supabase Auth sert aux rôles et aux opérations persistantes (`trusted/admin`) : sauvegarde, suppression, modération, analytics et packs.
- **Source de vérité côté serveur** : les timers utilisent un timestamp `started_at` stocké en base. Le client recalcule juste l'affichage. Pas de désynchro entre joueurs.
- **Realtime via Supabase** : on s'abonne aux changements des tables de jeu et on recharge l'état. Volume minuscule (~10 joueurs), donc pas besoin de patcher finement.
- **Configuration en base** : le type de jeu, les thèmes, les durées et la lecture automatique sont stockés dans `rooms`.
- **Moteur global de questions** : `questionPoolEngine` construit le plan de partie depuis les questions système, live et sauvegardées, avec déduplication et garantie d'insertion des questions joueurs en mix intelligent.
- **Contrats de jeu partagés** : `gameEngine` décrit les formats de questions/réponses, flows de round/reveal et profils de bilan. `questionPoolEngine` s'appuie dessus pour valider les questions compatibles.
- **État du mime partagé** : `rooms.mime_game_state` garde l'ordre, le mime courant, l'expression, le timer et la manche.
- **État de Jauge partagé** : `rooms.jauge_game_state` garde l'ordre des cibles, la question active, l'anonymat, les questions joueurs et les options de manche. Les notes sont stockées dans `ratings`.
- **Bilan modulaire** : `lib/endGameSummary.ts` calcule scoreboard, awards, moments rares et relations depuis les votes.
- **RLS hybride** : les tables de salle restent ouvertes pour le jeu éphémère, mais la bibliothèque, les packs et la modération sont protégés côté SQL par rôles `trusted/admin`.
- **Anti-spam léger côté SQL** : limite de création de rooms par `guest_id`, limite de questions live par joueur, timestamps d'activité et fonction `cleanup_inactive_rooms()`.

---

## 🎲 Jeux et catégories

### Qui pourrait ?

| Catégorie | Emoji | 18+ | Description | Nombre |
| --- | --- | --- | --- | --- |
| Classique | 🟣 | non | Pour tout le monde, sans tabou | ~80 |
| Hot | 🔥 | **oui** | Spicy, sex-related dilemmas | ~70 |
| Trash | 💀 | **oui** | Sombre, dérangeant, sans filtre | ~60 |
| Insolite | 🤪 | non | Bizarre, drôle, complètement WTF | ~60 |
| Éthique | ⚖️ | non | Dilemmes moraux qui font débattre | ~50 |
| Couple | 💑 | non | Spécial relations, amour, jalousie | ~50 |
| Pop culture | 🎬 | non | Films, séries, jeux vidéo, super-héros | ~30 |

### Qui de nous ?

Les questions viennent de [`lib/whoOfUsQuestions.ts`](lib/whoOfUsQuestions.ts), généré depuis `qui_de_nous.md`.

| Catégorie | 18+ | Description |
| --- | --- | --- |
| Classique | non | Questions faciles pour lancer la soirée |
| Trash | oui | Sans filtre, à jouer avec un groupe partant |
| Hot | oui | Ambiance séduction et révélations |
| +18 | oui | Réservé aux adultes et aux groupes de confiance |
| Insolite | non | Bizarre, absurde et très soirée |
| Brainrot | non | Mèmes, internet et chaos moderne |
| Philosophique | non | Pour débattre sans sortir du jeu |
| Couple | non | Relations, crushs et compatibilités |
| Dark Humor | oui | Humour noir et questions plus piquantes |
| Cringe | non | Gênance, dossiers et souvenirs honteux |
| Random | non | Questions imprévisibles |

### Mime les expressions

Les expressions viennent de [`lib/mimeExpressions.ts`](lib/mimeExpressions.ts), importées depuis `Expression gamenight.rtf`.

| Catégorie | 18+ | Description |
| --- | --- | --- |
| Classique | non | Expressions et proverbes français connus |
| Apéro +18 | oui | Expressions familières, beauf/trash, réservées aux adultes |

L'hôte choisit l'ordre de passage au lancement : ordre d'arrivée, aléatoire ou personnalisé. Ensuite, chaque manche passe automatiquement au joueur suivant, avec retour au début de la liste.
Le réglage **Mode hôte joueur** masque l'expression à l'hôte quand ce n'est pas lui qui mime, afin qu'il puisse deviner avec le groupe.

### Jauge

Les questions viennent de [`lib/jaugeQuestions.ts`](lib/jaugeQuestions.ts), importées depuis `Jauge.rtf`.

Le jeu sélectionne une question et un joueur cible. Tous les autres joueurs donnent une note de 1 à 10, puis le reveal affiche les notes, la moyenne, la distribution et les commentaires automatiques.

Réglages hôte :
- cible aléatoire, ordre automatique ou ordre personnalisé ;
- questions système, questions joueurs live, questions sauvegardées, ou mix intelligent ;
- votes visibles, anonymes pendant la partie, reveal final des auteurs, ou anonymat permanent ;
- mode auto-jauge et mode brutal.

Le bilan de soirée de Jauge calcule les meilleures moyennes, le joueur le plus controversé, les juges généreux/sévères, les notes extrêmes et les relations de notes.

### Questions joueurs globales

Tous les jeux peuvent maintenant utiliser trois sources :

- **Système uniquement** : questions embarquées du jeu.
- **Joueurs uniquement** : questions écrites dans la room.
- **Mix intelligent** : les questions joueurs et sauvegardées activées sont injectées en priorité, puis les questions système complètent la partie.

Exemple : pour une partie de 25 questions avec 15 questions joueurs disponibles, les 15 sont garanties dans le plan, puis 10 questions système complètent le reste avant un shuffle final.

---

## 🛠️ Pistes pour la suite

- [ ] **Persister la session joueur** : retrouver sa salle automatiquement après fermeture du navigateur.
- [ ] **Ajouter d'autres jeux** : *Action ou Vérité*, *Loup-Garou*, *Mots impossibles*, etc.
- [ ] **Nettoyage auto** des salles inactives (cron Supabase ou Edge Function).
- [ ] **Score / leaderboard** sur l'ensemble de la soirée (qui vote comme la majorité, etc.).
- [ ] **Détection d'hôte déconnecté** : transfert auto si l'hôte ne répond plus depuis X secondes.

---

## 📦 Scripts

| Commande         | Effet                          |
| ---------------- | ------------------------------ |
| `npm run dev`    | Lance le serveur de dev        |
| `npm run build`  | Build de production            |
| `npm run start`  | Démarre le build de prod       |
| `npm run lint`   | Lint le code                   |
| `npm run seed:admin` | Crée/met à jour un compte Supabase Auth admin via service-role |
