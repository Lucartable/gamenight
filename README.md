# 🎉 GameNight

Application web de jeux de soirée multijoueur en temps réel.
**Premier jeu : « Tu préfères ? »** — l'hôte crée une salle, les autres rejoignent depuis leur téléphone, et c'est parti.

Stack : **Next.js 14 (App Router) + TypeScript + Tailwind + Supabase Realtime**.

---

## ✨ Fonctionnalités

- 🎲 **400+ questions** réparties en **7 catégories** : Classique, Hot 🔥 (18+), Trash 💀, Insolite 🤪, Éthique ⚖️, Couple 💑, Pop culture 🎬
- ⏱️ **Timer synchronisé** côté serveur (pas de désynchro entre joueurs)
- 👑 **Transfert d'hôte** à un autre joueur en cours de partie
- 🔥 **Mode débat** de 2 minutes après la révélation
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
2. Dans **SQL Editor**, copie/colle le contenu de [`supabase/schema.sql`](supabase/schema.sql) et exécute-le. Ça crée les tables, les policies RLS, et active le temps réel sur les 4 tables (`rooms`, `players`, `votes`, `asked_questions`).
3. Dans **Project Settings → API**, récupère :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> **Tu as déjà un projet déployé ?** Re-exécute `schema.sql` (il est idempotent) — la nouvelle version ajoute `asked_questions` à la publication realtime, ce qui élimine un cas où la liste des questions posées ne se mettait pas à jour côté hôte.

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

## 🎮 Comment jouer à « Tu préfères ? »

1. **L'hôte** clique sur *Créer une salle* → reçoit un code (ex : `LOUP-42`).
2. **Les joueurs** ouvrent le site sur leur téléphone, cliquent sur *Rejoindre une salle*, entrent le code et leur prénom.
3. L'hôte choisit les **ambiances** (catégories) qu'il veut jouer.
4. L'hôte clique sur **🎲 Question aléatoire** (ou pioche manuellement dans la liste) → un timer de **30 secondes** démarre pour tout le monde.
5. Chaque joueur — **y compris l'hôte** — voit deux gros boutons (Option A / Option B) et vote.
6. À la fin du timer (ou si l'hôte révèle plus tôt), tout le monde voit qui a voté quoi.
7. L'hôte choisit : **question suivante** ou **mode débat** (2 minutes).
8. À tout moment, l'hôte peut **passer le rôle d'hôte** à un autre joueur via le bouton 👑 Transférer.
9. L'hôte peut terminer la partie à tout moment.

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
│   ├── questions.ts              # 400+ questions catégorisées + helpers
│   └── utils.ts                  # Code de salle, client_id, durées, persistance des cats
├── types/
│   └── database.ts               # Types Supabase
├── supabase/
│   └── schema.sql                # Schéma à exécuter dans Supabase (idempotent)
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
- **Catégories en localStorage** : la sélection de catégories de l'hôte est stockée par salle dans `localStorage` — pas de migration DB nécessaire, et préservée si l'hôte rafraîchit sa page.
- **RLS publique** : pour aller vite, les tables sont en lecture/écriture publique. À durcir pour un usage prod (par ex. exiger le code de la salle dans une RPC).

---

## 🎲 Catégories de questions

| Catégorie | Emoji | 18+ | Description | Nombre |
| --- | --- | --- | --- | --- |
| Classique | 🟣 | non | Pour tout le monde, sans tabou | ~80 |
| Hot | 🔥 | **oui** | Spicy, sex-related dilemmas | ~70 |
| Trash | 💀 | **oui** | Sombre, dérangeant, sans filtre | ~60 |
| Insolite | 🤪 | non | Bizarre, drôle, complètement WTF | ~60 |
| Éthique | ⚖️ | non | Dilemmes moraux qui font débattre | ~50 |
| Couple | 💑 | non | Spécial relations, amour, jalousie | ~50 |
| Pop culture | 🎬 | non | Films, séries, jeux vidéo, super-héros | ~30 |

---

## 🛠️ Pistes pour la suite

- [ ] **Persister la session joueur** : retrouver sa salle automatiquement après fermeture du navigateur.
- [ ] **Ajouter d'autres jeux** : *Action ou Vérité*, *Loup-Garou*, *Mots impossibles*, etc.
- [ ] **Nettoyage auto** des salles inactives (cron Supabase ou Edge Function).
- [ ] **Custom questions** : laisser l'hôte ajouter ses propres « Tu préfères ? » à la volée.
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
