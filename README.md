# 🎉 GameNight

Application web de jeux de soirée multijoueur en temps réel.
**Premier jeu : « Tu préfères ? »** — l'hôte crée une salle, les autres rejoignent depuis leur téléphone, et c'est parti.

Stack : **Next.js 14 (App Router) + TypeScript + Tailwind + Supabase Realtime**.

---

## 🚀 Démarrage rapide

### 1. Installer les dépendances

```bash
npm install
```

### 2. Créer un projet Supabase

1. Va sur [supabase.com](https://supabase.com), crée un nouveau projet (gratuit).
2. Dans **SQL Editor**, copie/colle le contenu de [`supabase/schema.sql`](supabase/schema.sql) et exécute-le. Ça crée les tables, les policies RLS, et active le temps réel.
3. Dans **Project Settings → API**, récupère :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configurer les variables d'environnement

Crée un fichier `.env.local` à la racine (basé sur `.env.local.example`) :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

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
3. L'hôte voit les joueurs apparaître en temps réel + une liste de 25 questions.
4. L'hôte clique sur une question → un timer de **30 secondes** démarre pour tout le monde.
5. Chaque joueur voit deux gros boutons (Option A / Option B) et vote.
6. À la fin du timer (ou si l'hôte révèle plus tôt), tout le monde voit qui a voté quoi.
7. L'hôte choisit : **question suivante** ou **mode débat** (2 minutes).
8. L'hôte peut terminer la partie à tout moment.

---

## 🗂️ Structure du projet

```
gamenight/
├── app/
│   ├── page.tsx                  # Accueil (créer / rejoindre)
│   ├── host/[code]/page.tsx      # Vue hôte (contrôle + révélation)
│   ├── play/[code]/page.tsx      # Vue joueur (vote + résultats)
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── supabase.ts               # Client Supabase singleton
│   ├── useRoom.ts                # Hook de synchro temps réel
│   ├── useCountdown.ts           # Compte à rebours
│   ├── questions.ts              # Les 25 questions
│   └── utils.ts                  # Code de salle, client_id, durées
├── types/
│   └── database.ts               # Types Supabase
├── supabase/
│   └── schema.sql                # Schéma à exécuter dans Supabase
└── ...
```

---

## 🧠 Choix techniques

- **Pas d'authentification** : un `client_id` est généré par navigateur et stocké dans `localStorage`. Suffisant pour un jeu de soirée éphémère.
- **Source de vérité côté serveur** : les timers utilisent un timestamp `started_at` stocké en base. Le client recalcule juste l'affichage. Pas de désynchro entre joueurs.
- **Realtime via Supabase** : on s'abonne aux changements des tables `rooms`, `players`, `votes` et on recharge l'état. Volume minuscule (~10 joueurs), donc pas besoin de patcher finement.
- **RLS publique** : pour aller vite, les tables sont en lecture/écriture publique. À durcir pour un usage prod (par ex. exiger le code de la salle dans une RPC).

---

## 🛠️ Pistes pour la suite

- [ ] **Persister la session joueur** : si le navigateur se ferme, retrouver sa salle automatiquement.
- [ ] **Boutons avec animations** au moment de la révélation (compteur qui s'incrémente).
- [ ] **Ajouter d'autres jeux** : *Action ou Vérité*, *Loup-Garou*, *Mots impossibles*, etc.
- [ ] **Nettoyage auto** des salles inactives (cron Supabase ou Edge Function).
- [ ] **Custom questions** : laisser l'hôte ajouter ses propres « Tu préfères ? » à la volée.
- [ ] **Score / leaderboard** sur l'ensemble de la soirée.

---

## 📦 Scripts

| Commande         | Effet                          |
| ---------------- | ------------------------------ |
| `npm run dev`    | Lance le serveur de dev        |
| `npm run build`  | Build de production            |
| `npm run start`  | Démarre le build de prod       |
| `npm run lint`   | Lint le code                   |
