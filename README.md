# 🎉 GameNight

Application web de jeux de soirée multijoueur en temps réel.
L'hôte crée une salle, les autres rejoignent depuis leur téléphone, puis le groupe choisit un jeu.

Stack : **Next.js 14 (App Router) + TypeScript + Tailwind + Supabase Realtime**.

---

## ✨ Fonctionnalités

- 🎲 **Cinq jeux** : `Tu préfères`, `Qui de nous ?`, `Majorité`, `Minorité`, `Mime les expressions`
- 🧩 **Questions et expressions embarquées** avec thèmes/filtres par jeu
- ⏱️ **Timers configurables** côté serveur (vote + révélation)
- 👑 **Transfert d'hôte** à un autre joueur en cours de partie
- ▶️ **Lecture automatique** optionnelle pour enchaîner les questions
- ✅ **Validation manuelle du vote** avant envoi Supabase
- 🎭 **Ordre de mime automatique** configuré une seule fois par l'hôte
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
> Pour une base déjà installée, exécute plutôt [`supabase/mime_expressions_migration.sql`](supabase/mime_expressions_migration.sql).

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

---

## 🎮 Comment jouer

1. **L'hôte** clique sur *Créer une salle* → reçoit un code (ex : `LOUP-42`).
2. **Les joueurs** ouvrent le site sur leur téléphone, cliquent sur *Rejoindre une salle*, entrent le code et leur prénom.
3. L'hôte choisit un jeu.
4. L'hôte configure le nombre de questions/manches, les durées, la lecture automatique quand elle existe, et les thèmes.
5. L'hôte clique sur **Lancer la partie** → une question aléatoire compatible démarre.
6. Chaque joueur — **y compris l'hôte** — sélectionne son choix puis clique sur **Valider mon choix**.
7. À la révélation, tout le monde voit les résultats adaptés au jeu : pourcentages ou classement des personnes désignées.
8. L'hôte lance la question suivante, ou la lecture automatique s'en charge.
9. À tout moment, l'hôte peut **passer le rôle d'hôte** à un autre joueur via le bouton 👑 Transférer.
10. L'hôte peut terminer la partie à tout moment.

---

## 🗂️ Structure du projet

```
gamenight/
├── app/
│   ├── page.tsx                  # Accueil (créer / rejoindre)
│   ├── host/[code]/page.tsx      # Vue hôte (lobby + contrôle + révélation)
│   ├── play/[code]/page.tsx      # Vue joueur (vote + résultats)
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── supabase.ts               # Client Supabase singleton
│   ├── useRoom.ts                # Hook de synchro temps réel (rooms, players, votes, asked_questions)
│   ├── useCountdown.ts           # Compte à rebours basé sur un timestamp serveur
│   ├── questions.ts              # Questions du jeu Qui pourrait ?
│   ├── whoOfUsQuestions.ts       # Questions du jeu Qui de nous ?
│   ├── mimeExpressions.ts        # Expressions du jeu Mime les expressions
│   ├── mimeGame.ts               # Helpers d'ordre/tours du mode mime
│   ├── gameQuestions.ts          # Définitions multi-jeux + helpers
│   └── utils.ts                  # Code de salle, client_id, durées
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

- **Pas d'authentification** : un `client_id` est généré par navigateur et stocké dans `localStorage`. Suffisant pour un jeu de soirée éphémère.
- **Source de vérité côté serveur** : les timers utilisent un timestamp `started_at` stocké en base. Le client recalcule juste l'affichage. Pas de désynchro entre joueurs.
- **Realtime via Supabase** : on s'abonne aux changements des 4 tables et on recharge l'état. Volume minuscule (~10 joueurs), donc pas besoin de patcher finement.
- **Configuration en base** : le type de jeu, les thèmes, les durées et la lecture automatique sont stockés dans `rooms`.
- **État du mime partagé** : `rooms.mime_game_state` garde l'ordre, le mime courant, l'expression, le timer et la manche.
- **RLS publique** : pour aller vite, les tables sont en lecture/écriture publique. À durcir pour un usage prod (par ex. exiger le code de la salle dans une RPC).

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

---

## 🛠️ Pistes pour la suite

- [ ] **Persister la session joueur** : retrouver sa salle automatiquement après fermeture du navigateur.
- [ ] **Ajouter d'autres jeux** : *Action ou Vérité*, *Loup-Garou*, *Mots impossibles*, etc.
- [ ] **Nettoyage auto** des salles inactives (cron Supabase ou Edge Function).
- [ ] **Custom questions** : laisser l'hôte ajouter ses propres questions à la volée.
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
