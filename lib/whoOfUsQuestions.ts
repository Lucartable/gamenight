// Généré depuis le fichier source qui_de_nous.md.

export type WhoOfUsCategory = "classique" | "trash" | "hot" | "adult" | "insolite" | "brainrot" | "philo" | "couple" | "dark" | "cringe" | "random";

export interface WhoOfUsCategoryMeta {
  id: WhoOfUsCategory;
  label: string;
  emoji: string;
  description: string;
  adult: boolean;
}

export interface WhoOfUsQuestion {
  id: number;
  category: WhoOfUsCategory;
  text: string;
}

export const WHO_OF_US_CATEGORIES: WhoOfUsCategoryMeta[] = [
  {
    "id": "classique",
    "label": "Classique",
    "emoji": "😄",
    "adult": false,
    "description": "Questions faciles pour lancer la soirée."
  },
  {
    "id": "trash",
    "label": "Trash",
    "emoji": "🗑️",
    "adult": true,
    "description": "Sans filtre, à jouer avec un groupe partant."
  },
  {
    "id": "hot",
    "label": "Hot",
    "emoji": "🔥",
    "adult": true,
    "description": "Ambiance séduction et révélations."
  },
  {
    "id": "adult",
    "label": "+18",
    "emoji": "🔞",
    "adult": true,
    "description": "Réservé aux adultes et aux groupes de confiance."
  },
  {
    "id": "insolite",
    "label": "Insolite",
    "emoji": "🦄",
    "adult": false,
    "description": "Bizarre, absurde et très soirée."
  },
  {
    "id": "brainrot",
    "label": "Brainrot",
    "emoji": "🧠",
    "adult": false,
    "description": "Mèmes, internet et chaos moderne."
  },
  {
    "id": "philo",
    "label": "Philosophique",
    "emoji": "🤔",
    "adult": false,
    "description": "Pour débattre sans sortir du jeu."
  },
  {
    "id": "couple",
    "label": "Couple",
    "emoji": "💑",
    "adult": false,
    "description": "Relations, crushs et compatibilités."
  },
  {
    "id": "dark",
    "label": "Dark Humor",
    "emoji": "💀",
    "adult": true,
    "description": "Humour noir et questions plus piquantes."
  },
  {
    "id": "cringe",
    "label": "Cringe",
    "emoji": "😬",
    "adult": false,
    "description": "Gênance, dossiers et souvenirs honteux."
  },
  {
    "id": "random",
    "label": "Random",
    "emoji": "🎲",
    "adult": false,
    "description": "N’importe quoi, mais en mieux."
  }
];

export const WHO_OF_US_QUESTIONS: WhoOfUsQuestion[] = [
  {
    "id": 10001,
    "category": "classique",
    "text": "Qui de nous oublie le plus souvent les anniversaires ?"
  },
  {
    "id": 10002,
    "category": "classique",
    "text": "Qui de nous arrive toujours en retard ?"
  },
  {
    "id": 10003,
    "category": "classique",
    "text": "Qui de nous mange le plus vite ?"
  },
  {
    "id": 10004,
    "category": "classique",
    "text": "Qui de nous est le plus flemmard au quotidien ?"
  },
  {
    "id": 10005,
    "category": "classique",
    "text": "Qui de nous se plaint le plus du froid ?"
  },
  {
    "id": 10006,
    "category": "classique",
    "text": "Qui de nous est le plus dépensier ?"
  },
  {
    "id": 10007,
    "category": "classique",
    "text": "Qui de nous dort le plus longtemps le week-end ?"
  },
  {
    "id": 10008,
    "category": "classique",
    "text": "Qui de nous a le plus de désordre dans sa chambre ?"
  },
  {
    "id": 10009,
    "category": "classique",
    "text": "Qui de nous a le plus peur des araignées ?"
  },
  {
    "id": 10010,
    "category": "classique",
    "text": "Qui de nous est le plus accro à son téléphone ?"
  },
  {
    "id": 10011,
    "category": "classique",
    "text": "Qui de nous cuisine le mieux ?"
  },
  {
    "id": 10012,
    "category": "classique",
    "text": "Qui de nous a le sens de l'orientation le plus catastrophique ?"
  },
  {
    "id": 10013,
    "category": "classique",
    "text": "Qui de nous pleure le plus devant les films ?"
  },
  {
    "id": 10014,
    "category": "classique",
    "text": "Qui de nous est le plus têtu ?"
  },
  {
    "id": 10015,
    "category": "classique",
    "text": "Qui de nous est le premier à s'endormir en soirée ?"
  },
  {
    "id": 10016,
    "category": "classique",
    "text": "Qui de nous aurait le plus de chances de survivre à une apocalypse zombie ?"
  },
  {
    "id": 10017,
    "category": "classique",
    "text": "Qui de nous ferait le meilleur parent ?"
  },
  {
    "id": 10018,
    "category": "classique",
    "text": "Qui de nous serait le premier millionnaire ?"
  },
  {
    "id": 10019,
    "category": "classique",
    "text": "Qui de nous est le plus mauvais menteur ?"
  },
  {
    "id": 10020,
    "category": "classique",
    "text": "Qui de nous serait le plus célèbre dans 10 ans ?"
  },
  {
    "id": 10021,
    "category": "classique",
    "text": "Qui de nous a le plus mauvais sens du style ?"
  },
  {
    "id": 10022,
    "category": "classique",
    "text": "Qui de nous est le plus jaloux ?"
  },
  {
    "id": 10023,
    "category": "classique",
    "text": "Qui de nous perd le plus facilement patience ?"
  },
  {
    "id": 10024,
    "category": "classique",
    "text": "Qui de nous est le plus généreux ?"
  },
  {
    "id": 10025,
    "category": "classique",
    "text": "Qui de nous chante le plus faux sous la douche ?"
  },
  {
    "id": 10026,
    "category": "classique",
    "text": "Qui de nous est le plus accro au café ?"
  },
  {
    "id": 10027,
    "category": "classique",
    "text": "Qui de nous est le plus difficile à réveiller le matin ?"
  },
  {
    "id": 10028,
    "category": "classique",
    "text": "Qui de nous a le plus peur des piqûres ?"
  },
  {
    "id": 10029,
    "category": "classique",
    "text": "Qui de nous serait le meilleur acteur dans une série ?"
  },
  {
    "id": 10030,
    "category": "classique",
    "text": "Qui de nous est le plus perfectionniste ?"
  },
  {
    "id": 10031,
    "category": "classique",
    "text": "Qui de nous passe le plus de temps devant un miroir ?"
  },
  {
    "id": 10032,
    "category": "classique",
    "text": "Qui de nous mange le plus de fast-food en cachette ?"
  },
  {
    "id": 10033,
    "category": "classique",
    "text": "Qui de nous aurait le plus de mal à vivre sans internet ?"
  },
  {
    "id": 10034,
    "category": "classique",
    "text": "Qui de nous gagnerait un concours de karaoké ?"
  },
  {
    "id": 10035,
    "category": "classique",
    "text": "Qui de nous est le plus bavard ?"
  },
  {
    "id": 10036,
    "category": "classique",
    "text": "Qui de nous est le plus optimiste ?"
  },
  {
    "id": 10037,
    "category": "classique",
    "text": "Qui de nous serait le pire dans une émission de télé-réalité ?"
  },
  {
    "id": 10038,
    "category": "classique",
    "text": "Qui de nous a le plus peur du dentiste ?"
  },
  {
    "id": 10039,
    "category": "classique",
    "text": "Qui de nous est le plus romantique ?"
  },
  {
    "id": 10040,
    "category": "classique",
    "text": "Qui de nous ferait le meilleur politicien ?"
  },
  {
    "id": 10041,
    "category": "classique",
    "text": "Qui de nous est le plus courageux en situation de stress ?"
  },
  {
    "id": 10042,
    "category": "classique",
    "text": "Qui de nous serait le premier à craquer à un régime ?"
  },
  {
    "id": 10043,
    "category": "classique",
    "text": "Qui de nous est le plus dépendant affectif ?"
  },
  {
    "id": 10044,
    "category": "classique",
    "text": "Qui de nous a le plus de chance dans la vie ?"
  },
  {
    "id": 10045,
    "category": "classique",
    "text": "Qui de nous est le plus sensible aux critiques ?"
  },
  {
    "id": 10046,
    "category": "classique",
    "text": "Qui de nous serait le meilleur coach de vie ?"
  },
  {
    "id": 10047,
    "category": "classique",
    "text": "Qui de nous est le plus susceptible de pleurer à un mariage ?"
  },
  {
    "id": 10048,
    "category": "classique",
    "text": "Qui de nous est le plus compétitif sans s'en rendre compte ?"
  },
  {
    "id": 10049,
    "category": "classique",
    "text": "Qui de nous est le moins organisé pour ses finances ?"
  },
  {
    "id": 10050,
    "category": "classique",
    "text": "Qui de nous serait le plus vite perdu sur une île déserte ?"
  },
  {
    "id": 10051,
    "category": "classique",
    "text": "Qui de nous fait le plus de projets qu'il ne termine jamais ?"
  },
  {
    "id": 10052,
    "category": "classique",
    "text": "Qui de nous est le plus susceptible de garder une rancune des années ?"
  },
  {
    "id": 10053,
    "category": "classique",
    "text": "Qui de nous est le premier à demander pardon après une dispute ?"
  },
  {
    "id": 10054,
    "category": "classique",
    "text": "Qui de nous est le plus susceptible d'adopter un chien impulsivement ?"
  },
  {
    "id": 10055,
    "category": "classique",
    "text": "Qui de nous a les plus belles valeurs humaines ?"
  },
  {
    "id": 10056,
    "category": "classique",
    "text": "Qui de nous serait le plus déprimé si les réseaux sociaux disparaissaient ?"
  },
  {
    "id": 10057,
    "category": "classique",
    "text": "Qui de nous passe le plus de temps à procrastiner ?"
  },
  {
    "id": 10058,
    "category": "classique",
    "text": "Qui de nous est le plus susceptible de rater un vol ?"
  },
  {
    "id": 10059,
    "category": "classique",
    "text": "Qui de nous est le meilleur pour garder un secret ?"
  },
  {
    "id": 10060,
    "category": "classique",
    "text": "Qui de nous est le plus susceptible de faire du bénévolat ?"
  },
  {
    "id": 10061,
    "category": "trash",
    "text": "Qui de nous a déjà mangé quelque chose tombé par terre sans hésiter ?"
  },
  {
    "id": 10062,
    "category": "trash",
    "text": "Qui de nous a déjà recyclé un cadeau reçu pour l'offrir à quelqu'un d'autre ?"
  },
  {
    "id": 10063,
    "category": "trash",
    "text": "Qui de nous sent le plus souvent mauvais des pieds ?"
  },
  {
    "id": 10064,
    "category": "trash",
    "text": "Qui de nous a le plus de poils aux endroits surprenants ?"
  },
  {
    "id": 10065,
    "category": "trash",
    "text": "Qui de nous a déjà réutilisé des sous-vêtements portés à l'envers ?"
  },
  {
    "id": 10066,
    "category": "trash",
    "text": "Qui de nous a le frigo le plus dégoûtant ?"
  },
  {
    "id": 10067,
    "category": "trash",
    "text": "Qui de nous rotote le plus fort sans se gêner ?"
  },
  {
    "id": 10068,
    "category": "trash",
    "text": "Qui de nous a déjà uriné dans une piscine et l'a assumé ?"
  },
  {
    "id": 10069,
    "category": "trash",
    "text": "Qui de nous a les ongles les plus douteux ?"
  },
  {
    "id": 10070,
    "category": "trash",
    "text": "Qui de nous a déjà fouillé dans les poches d'un vieux manteau pour trouver de l'argent ?"
  },
  {
    "id": 10071,
    "category": "trash",
    "text": "Qui de nous a le plus de bordel sous son lit ?"
  },
  {
    "id": 10072,
    "category": "trash",
    "text": "Qui de nous mange de la nourriture périmée sans s'en inquiéter ?"
  },
  {
    "id": 10073,
    "category": "trash",
    "text": "Qui de nous a déjà passé plus de 3 jours sans se laver les cheveux ?"
  },
  {
    "id": 10074,
    "category": "trash",
    "text": "Qui de nous fait pipi sous la douche en pensant que c'est normal ?"
  },
  {
    "id": 10075,
    "category": "trash",
    "text": "Qui de nous a le plus de moisissures dans sa salle de bain ?"
  },
  {
    "id": 10076,
    "category": "trash",
    "text": "Qui de nous a déjà utilisé la brosse à dents d'un autre sans demander ?"
  },
  {
    "id": 10077,
    "category": "trash",
    "text": "Qui de nous a le plus de notifications non lues sur son téléphone ?"
  },
  {
    "id": 10078,
    "category": "trash",
    "text": "Qui de nous a déjà mangé directement dans la casserole pour éviter la vaisselle ?"
  },
  {
    "id": 10079,
    "category": "trash",
    "text": "Qui de nous a le plus de vêtements sales empilés dans un coin ?"
  },
  {
    "id": 10080,
    "category": "trash",
    "text": "Qui de nous serait l'odeur la plus forte dans un vestiaire de sport ?"
  },
  {
    "id": 10081,
    "category": "trash",
    "text": "Qui de nous a déjà dormi avec les mêmes draps pendant plus d'un mois ?"
  },
  {
    "id": 10082,
    "category": "trash",
    "text": "Qui de nous a fouillé dans la poubelle pour retrouver quelque chose ?"
  },
  {
    "id": 10083,
    "category": "trash",
    "text": "Qui de nous aurait le mode de vie le plus \"poubelle\" si personne ne le regardait ?"
  },
  {
    "id": 10084,
    "category": "trash",
    "text": "Qui de nous est le plus susceptible de manger les restes directement dans le Tupperware dans le bus ?"
  },
  {
    "id": 10085,
    "category": "trash",
    "text": "Qui de nous a déjà pété en public et regardé ailleurs innocemment ?"
  },
  {
    "id": 10086,
    "category": "trash",
    "text": "Qui de nous a le moins changé ses draps depuis le début de l'année ?"
  },
  {
    "id": 10087,
    "category": "trash",
    "text": "Qui de nous est le plus susceptible de ne jamais nettoyer son clavier d'ordi ?"
  },
  {
    "id": 10088,
    "category": "trash",
    "text": "Qui de nous boit du lait à la bouteille directement dans le frigo ?"
  },
  {
    "id": 10089,
    "category": "trash",
    "text": "Qui de nous lèche la cuillère et la remet dans le pot de Nutella ?"
  },
  {
    "id": 10090,
    "category": "trash",
    "text": "Qui de nous gratte son assiette jusqu'à la dernière molécule de nourriture ?"
  },
  {
    "id": 10091,
    "category": "trash",
    "text": "Qui de nous a déjà senti ses propres chaussettes pour voir si elles étaient encore mettables ?"
  },
  {
    "id": 10092,
    "category": "trash",
    "text": "Qui de nous est le plus susceptible de réutiliser une serviette de bain pendant une semaine ?"
  },
  {
    "id": 10093,
    "category": "trash",
    "text": "Qui de nous a le bureau le plus catastrophique ?"
  },
  {
    "id": 10094,
    "category": "trash",
    "text": "Qui de nous mange le plus souvent debout au-dessus de l'évier ?"
  },
  {
    "id": 10095,
    "category": "trash",
    "text": "Qui de nous aurait survécu le moins longtemps en période médiévale à cause de ses habitudes d'hygiène ?"
  },
  {
    "id": 10096,
    "category": "trash",
    "text": "Qui de nous confond poubelle de recyclage et poubelle normale sans s'en excuser ?"
  },
  {
    "id": 10097,
    "category": "trash",
    "text": "Qui de nous a déjà recouvert une tache sur ses vêtements avec du parfum au lieu de les laver ?"
  },
  {
    "id": 10098,
    "category": "trash",
    "text": "Qui de nous passe le plus de temps aux toilettes avec son téléphone ?"
  },
  {
    "id": 10099,
    "category": "trash",
    "text": "Qui de nous a le froc le plus troué en ce moment ?"
  },
  {
    "id": 10100,
    "category": "trash",
    "text": "Qui de nous a mangé les chips du fond du sachet avec les doigts ?"
  },
  {
    "id": 10101,
    "category": "trash",
    "text": "Qui de nous est le plus susceptible de mâcher de la vieille gomme qu'il a trouvée dans sa poche ?"
  },
  {
    "id": 10102,
    "category": "trash",
    "text": "Qui de nous a les chaussures les plus déglinguées dans son placard ?"
  },
  {
    "id": 10103,
    "category": "trash",
    "text": "Qui de nous est le plus susceptible de prendre les photos de quelqu'un d'autre dans l'album commun sans prévenir ?"
  },
  {
    "id": 10104,
    "category": "trash",
    "text": "Qui de nous a déjà porté des chaussures mouillées toute la journée sans se plaindre ?"
  },
  {
    "id": 10105,
    "category": "trash",
    "text": "Qui de nous serait capable de manger un sandwich écrasé dans son sac depuis le matin ?"
  },
  {
    "id": 10106,
    "category": "trash",
    "text": "Qui de nous se ronge le plus les ongles ?"
  },
  {
    "id": 10107,
    "category": "trash",
    "text": "Qui de nous a le plus de saletés dans sa voiture ?"
  },
  {
    "id": 10108,
    "category": "trash",
    "text": "Qui de nous est le plus susceptible de sortir en pyjama faire les courses ?"
  },
  {
    "id": 10109,
    "category": "hot",
    "text": "Qui de nous est le/la plus séduisant(e) dans le groupe ?"
  },
  {
    "id": 10110,
    "category": "hot",
    "text": "Qui de nous embrasse le mieux selon les rumeurs ?"
  },
  {
    "id": 10111,
    "category": "hot",
    "text": "Qui de nous a le plus de succès sur les apps de rencontre ?"
  },
  {
    "id": 10112,
    "category": "hot",
    "text": "Qui de nous envoie les messages les plus osés ?"
  },
  {
    "id": 10113,
    "category": "hot",
    "text": "Qui de nous a le fantasme le plus inattendu ?"
  },
  {
    "id": 10114,
    "category": "hot",
    "text": "Qui de nous serait le/la meilleur(e) danseur/danseuse de pole dance ?"
  },
  {
    "id": 10115,
    "category": "hot",
    "text": "Qui de nous a eu le plus de partenaires en une seule année ?"
  },
  {
    "id": 10116,
    "category": "hot",
    "text": "Qui de nous serait le/la plus à l'aise dans une scène de film romantique ?"
  },
  {
    "id": 10117,
    "category": "hot",
    "text": "Qui de nous prend les selfies les plus suggestifs ?"
  },
  {
    "id": 10118,
    "category": "hot",
    "text": "Qui de nous a déjà envoyé un message à la mauvaise personne dans un moment de chaleur ?"
  },
  {
    "id": 10119,
    "category": "hot",
    "text": "Qui de nous serait le/la plus tentant(e) dans une robe/un costume de soirée ?"
  },
  {
    "id": 10120,
    "category": "hot",
    "text": "Qui de nous est le plus susceptible de faire le premier pas ?"
  },
  {
    "id": 10121,
    "category": "hot",
    "text": "Qui de nous a le regard le plus envoûtant ?"
  },
  {
    "id": 10122,
    "category": "hot",
    "text": "Qui de nous flirte le plus sans s'en rendre compte ?"
  },
  {
    "id": 10123,
    "category": "hot",
    "text": "Qui de nous serait le meilleur dans un jeu de séduction ?"
  },
  {
    "id": 10124,
    "category": "hot",
    "text": "Qui de nous a le sourire le plus craquant ?"
  },
  {
    "id": 10125,
    "category": "hot",
    "text": "Qui de nous s'habille le plus souvent pour séduire ?"
  },
  {
    "id": 10126,
    "category": "hot",
    "text": "Qui de nous est le plus dégourdi pour les massages ?"
  },
  {
    "id": 10127,
    "category": "hot",
    "text": "Qui de nous a eu le coup de foudre le plus fulgurant de sa vie ?"
  },
  {
    "id": 10128,
    "category": "hot",
    "text": "Qui de nous ose le plus dans une soirée avec une personne qui lui plaît ?"
  },
  {
    "id": 10129,
    "category": "hot",
    "text": "Qui de nous a la voix la plus envoûtante au téléphone ?"
  },
  {
    "id": 10130,
    "category": "hot",
    "text": "Qui de nous serait acteur/actrice dans un film romantique ?"
  },
  {
    "id": 10131,
    "category": "hot",
    "text": "Qui de nous a les lèvres les plus parfaites pour un baiser ?"
  },
  {
    "id": 10132,
    "category": "hot",
    "text": "Qui de nous serait le plus irrésistible sur une plage ?"
  },
  {
    "id": 10133,
    "category": "hot",
    "text": "Qui de nous dégagerait le plus de magnétisme dans une salle ?"
  },
  {
    "id": 10134,
    "category": "hot",
    "text": "Qui de nous a déjà été dragué(e) par quelqu'un de connu ?"
  },
  {
    "id": 10135,
    "category": "hot",
    "text": "Qui de nous a la plus belle façon de dire \"je t'aime\" ?"
  },
  {
    "id": 10136,
    "category": "hot",
    "text": "Qui de nous serait le plus difficile à résister en soirée ?"
  },
  {
    "id": 10137,
    "category": "hot",
    "text": "Qui de nous est le plus à l'aise pour parler de ses désirs ?"
  },
  {
    "id": 10138,
    "category": "hot",
    "text": "Qui de nous serait le meilleur/la meilleure pour improviser un rendez-vous romantique ?"
  },
  {
    "id": 10139,
    "category": "adult",
    "text": "Qui de nous a eu l'expérience la plus mémorable dont il/elle ne parlera jamais à ses parents ?"
  },
  {
    "id": 10140,
    "category": "adult",
    "text": "Qui de nous a déjà pratiqué le sexting avec la mauvaise personne ?"
  },
  {
    "id": 10141,
    "category": "adult",
    "text": "Qui de nous est le/la plus susceptible d'avoir un crush sur son/sa colocataire ?"
  },
  {
    "id": 10142,
    "category": "adult",
    "text": "Qui de nous a déjà simulé pour éviter une conversation gênante après ?"
  },
  {
    "id": 10143,
    "category": "adult",
    "text": "Qui de nous a le plus de recherches compromettantes dans l'historique de son navigateur ?"
  },
  {
    "id": 10144,
    "category": "adult",
    "text": "Qui de nous a déjà été surpris(e) dans une situation embarrassante ?"
  },
  {
    "id": 10145,
    "category": "adult",
    "text": "Qui de nous est le plus susceptible d'avoir une collection de trucs que les autres ne savent pas ?"
  },
  {
    "id": 10146,
    "category": "adult",
    "text": "Qui de nous a déjà eu une relation avec quelqu'un du groupe ou d'un proche ?"
  },
  {
    "id": 10147,
    "category": "adult",
    "text": "Qui de nous a le fantasme le plus inavouable de ce groupe ?"
  },
  {
    "id": 10148,
    "category": "adult",
    "text": "Qui de nous a déjà été en couple ouvert ou serait tenté(e) de l'essayer ?"
  },
  {
    "id": 10149,
    "category": "adult",
    "text": "Qui de nous a eu la situation la plus cringe après une nuit ?"
  },
  {
    "id": 10150,
    "category": "adult",
    "text": "Qui de nous est le plus susceptible d'avoir regardé quelque chose qu'il/elle regrette ?"
  },
  {
    "id": 10151,
    "category": "adult",
    "text": "Qui de nous serait le plus déstabilisé(e) si quelqu'un flirtait ouvertement avec lui/elle devant tout le groupe ?"
  },
  {
    "id": 10152,
    "category": "adult",
    "text": "Qui de nous a déjà eu une aventure lors d'un voyage qu'il/elle n'a jamais racontée ?"
  },
  {
    "id": 10153,
    "category": "adult",
    "text": "Qui de nous est le plus susceptible d'avoir des échanges avec quelqu'un de marié(e) ?"
  },
  {
    "id": 10154,
    "category": "adult",
    "text": "Qui de nous a eu la rencontre la plus chaotique sur une app de dating ?"
  },
  {
    "id": 10155,
    "category": "adult",
    "text": "Qui de nous a déjà eu une relation avec quelqu'un de beaucoup plus vieux/jeune ?"
  },
  {
    "id": 10156,
    "category": "adult",
    "text": "Qui de nous est le plus susceptible d'avoir un mot de passe sur son téléphone pour des raisons très spécifiques ?"
  },
  {
    "id": 10157,
    "category": "adult",
    "text": "Qui de nous a le record du plus de dates en une semaine ?"
  },
  {
    "id": 10158,
    "category": "adult",
    "text": "Qui de nous a eu l'expérience la plus bizarre lors d'un blind date ?"
  },
  {
    "id": 10159,
    "category": "adult",
    "text": "Qui de nous serait le plus à l'aise pour jouer à un jeu de vérité ou défi très adulte ?"
  },
  {
    "id": 10160,
    "category": "adult",
    "text": "Qui de nous a déjà été tenté(e) d'embrasser quelqu'un dans ce groupe ?"
  },
  {
    "id": 10161,
    "category": "adult",
    "text": "Qui de nous est le plus susceptible d'avoir un dossier caché sur son téléphone ?"
  },
  {
    "id": 10162,
    "category": "adult",
    "text": "Qui de nous a déjà reçu (ou envoyé) des photos compromettantes à la mauvaise personne ?"
  },
  {
    "id": 10163,
    "category": "adult",
    "text": "Qui de nous est le plus libertin de cœur dans le groupe ?"
  },
  {
    "id": 10164,
    "category": "adult",
    "text": "Qui de nous a eu la nuit la plus folle dont il/elle a honte d'admettre les détails ?"
  },
  {
    "id": 10165,
    "category": "adult",
    "text": "Qui de nous est le plus susceptible d'avoir eu une aventure en voyage qu'il/elle n'a racontée qu'à une seule personne ?"
  },
  {
    "id": 10166,
    "category": "adult",
    "text": "Qui de nous est le plus à l'aise à parler de ses expériences intimes devant tout le monde ?"
  },
  {
    "id": 10167,
    "category": "adult",
    "text": "Qui de nous a le score le plus impressionnant sur Tinder/Bumble/Hinge ?"
  },
  {
    "id": 10168,
    "category": "adult",
    "text": "Qui de nous a eu la plus grosse galère post-one-night-stand ?"
  },
  {
    "id": 10169,
    "category": "insolite",
    "text": "Qui de nous serait le plus susceptible de parler à une plante comme à un ami ?"
  },
  {
    "id": 10170,
    "category": "insolite",
    "text": "Qui de nous aurait survécu le plus longtemps à l'ère préhistorique ?"
  },
  {
    "id": 10171,
    "category": "insolite",
    "text": "Qui de nous serait le plus efficace pour négocier avec des extraterrestres ?"
  },
  {
    "id": 10172,
    "category": "insolite",
    "text": "Qui de nous est le plus susceptible d'avoir une théorie du complot secrète qu'il croit vraiment ?"
  },
  {
    "id": 10173,
    "category": "insolite",
    "text": "Qui de nous serait le meilleur mime professionnel ?"
  },
  {
    "id": 10174,
    "category": "insolite",
    "text": "Qui de nous a eu le rêve le plus bizarre de toute sa vie ?"
  },
  {
    "id": 10175,
    "category": "insolite",
    "text": "Qui de nous est le plus susceptible de nommer son Wi-Fi avec quelque chose d'étrange ?"
  },
  {
    "id": 10176,
    "category": "insolite",
    "text": "Qui de nous aurait le personnage Sims le plus chaotique ?"
  },
  {
    "id": 10177,
    "category": "insolite",
    "text": "Qui de nous serait capable de manger de la glace en hiver en plein air sans broncher ?"
  },
  {
    "id": 10178,
    "category": "insolite",
    "text": "Qui de nous serait le plus à l'aise pour habiter dans une maison hantée ?"
  },
  {
    "id": 10179,
    "category": "insolite",
    "text": "Qui de nous est le plus susceptible de croire aux fantômes et aux OVNIs ?"
  },
  {
    "id": 10180,
    "category": "insolite",
    "text": "Qui de nous serait le meilleur shaman tribal ?"
  },
  {
    "id": 10181,
    "category": "insolite",
    "text": "Qui de nous a les habitudes nocturnes les plus bizarres ?"
  },
  {
    "id": 10182,
    "category": "insolite",
    "text": "Qui de nous est le plus susceptible d'avoir une peur irrationnelle complètement inattendue ?"
  },
  {
    "id": 10183,
    "category": "insolite",
    "text": "Qui de nous serait le plus débrouillard abandonné dans une forêt avec juste un couteau suisse ?"
  },
  {
    "id": 10184,
    "category": "insolite",
    "text": "Qui de nous a le nom le plus drôle pour ses peluches/objets personnels ?"
  },
  {
    "id": 10185,
    "category": "insolite",
    "text": "Qui de nous est le plus susceptible de parler tout seul dans la rue sans s'en rendre compte ?"
  },
  {
    "id": 10186,
    "category": "insolite",
    "text": "Qui de nous aurait le rituel superstitieux le plus élaboré avant un examen ?"
  },
  {
    "id": 10187,
    "category": "insolite",
    "text": "Qui de nous serait le plus susceptible d'adopter un raton laveur comme animal de compagnie ?"
  },
  {
    "id": 10188,
    "category": "insolite",
    "text": "Qui de nous a le talent caché le plus inattendu et inutile ?"
  },
  {
    "id": 10189,
    "category": "insolite",
    "text": "Qui de nous est le plus susceptible de collectionner des objets complètement improbables ?"
  },
  {
    "id": 10190,
    "category": "insolite",
    "text": "Qui de nous serait le meilleur dans un concours de regards fixés ?"
  },
  {
    "id": 10191,
    "category": "insolite",
    "text": "Qui de nous aurait le plus de mal à expliquer ce qu'il fait dans la vie à un enfant de 5 ans ?"
  },
  {
    "id": 10192,
    "category": "insolite",
    "text": "Qui de nous serait le plus susceptible de rejoindre une secte par accident ?"
  },
  {
    "id": 10193,
    "category": "insolite",
    "text": "Qui de nous est le plus susceptible d'inventer une langue secrète avec ses proches ?"
  },
  {
    "id": 10194,
    "category": "insolite",
    "text": "Qui de nous a l'imagination la plus débordante au point d'inventer des histoires folles ?"
  },
  {
    "id": 10195,
    "category": "insolite",
    "text": "Qui de nous serait le plus capable de devenir détective privé ?"
  },
  {
    "id": 10196,
    "category": "insolite",
    "text": "Qui de nous est le plus susceptible d'avoir une discussion philosophique avec son chat ou son chien ?"
  },
  {
    "id": 10197,
    "category": "insolite",
    "text": "Qui de nous serait le champion de lancer de chaussettes de précision ?"
  },
  {
    "id": 10198,
    "category": "insolite",
    "text": "Qui de nous est le plus susceptible de finir archiviste d'internet à plein temps ?"
  },
  {
    "id": 10199,
    "category": "insolite",
    "text": "Qui de nous est le plus susceptible de créer une religion basée sur ses passe-temps ?"
  },
  {
    "id": 10200,
    "category": "insolite",
    "text": "Qui de nous serait le meilleur comptable des étoiles dans le ciel ?"
  },
  {
    "id": 10201,
    "category": "insolite",
    "text": "Qui de nous est le plus susceptible d'avoir une conversation sérieuse avec un pigeon ?"
  },
  {
    "id": 10202,
    "category": "insolite",
    "text": "Qui de nous aurait le plus de facilité à vivre sans argent pendant un an ?"
  },
  {
    "id": 10203,
    "category": "insolite",
    "text": "Qui de nous est le plus susceptible de dormir dans un cercueil pour voir l'effet que ça fait ?"
  },
  {
    "id": 10204,
    "category": "insolite",
    "text": "Qui de nous serait le champion du monde de Pierre-Papier-Ciseaux ?"
  },
  {
    "id": 10205,
    "category": "insolite",
    "text": "Qui de nous est le plus susceptible d'avoir un alter ego secret avec un prénom bizarre ?"
  },
  {
    "id": 10206,
    "category": "insolite",
    "text": "Qui de nous serait le plus efficace en tant que personnage de jeu vidéo RPG ?"
  },
  {
    "id": 10207,
    "category": "brainrot",
    "text": "Qui de nous dit le plus souvent \"no cap\" dans la vraie vie ?"
  },
  {
    "id": 10208,
    "category": "brainrot",
    "text": "Qui de nous envoie le plus de mèmes à 3h du matin ?"
  },
  {
    "id": 10209,
    "category": "brainrot",
    "text": "Qui de nous est le plus sigma dans le groupe ?"
  },
  {
    "id": 10210,
    "category": "brainrot",
    "text": "Qui de nous est le plus susceptible d'avoir un compte TikTok secret ?"
  },
  {
    "id": 10211,
    "category": "brainrot",
    "text": "Qui de nous ferait le Skibidi Toilet le plus convaincant ?"
  },
  {
    "id": 10212,
    "category": "brainrot",
    "text": "Qui de nous dit \"slay\" et le pense vraiment ?"
  },
  {
    "id": 10213,
    "category": "brainrot",
    "text": "Qui de nous est le plus susceptible d'utiliser \"based\" dans une conversation normale ?"
  },
  {
    "id": 10214,
    "category": "brainrot",
    "text": "Qui de nous est le plus likely to go full goblin mode dès que personne ne regarde ?"
  },
  {
    "id": 10215,
    "category": "brainrot",
    "text": "Qui de nous passerait le plus de temps à doomscroller sans bouger pendant des heures ?"
  },
  {
    "id": 10216,
    "category": "brainrot",
    "text": "Qui de nous est en mode \"delulu\" le plus souvent par rapport à ses objectifs de vie ?"
  },
  {
    "id": 10217,
    "category": "brainrot",
    "text": "Qui de nous est le plus susceptible de faire une vidéo \"POV : je suis...\" sans ironie ?"
  },
  {
    "id": 10218,
    "category": "brainrot",
    "text": "Qui de nous a le brain le plus rot à cause d'internet ?"
  },
  {
    "id": 10219,
    "category": "brainrot",
    "text": "Qui de nous utilise le plus les sons TikTok dans ses conversations quotidiennes ?"
  },
  {
    "id": 10220,
    "category": "brainrot",
    "text": "Qui de nous a le ratio le plus dévastateur de temps passé sur les réseaux vs productivité réelle ?"
  },
  {
    "id": 10221,
    "category": "brainrot",
    "text": "Qui de nous est le plus susceptible d'appeler quelque chose \"mid\" alors que c'est bien ?"
  },
  {
    "id": 10222,
    "category": "brainrot",
    "text": "Qui de nous a le plus de \"lore\" personnel incompréhensible pour les gens extérieurs au groupe ?"
  },
  {
    "id": 10223,
    "category": "brainrot",
    "text": "Qui de nous est le plus susceptible de commenter \"ratio + L + tu pues\" en vrai ?"
  },
  {
    "id": 10224,
    "category": "brainrot",
    "text": "Qui de nous est le plus likely to bestie quelqu'un qu'il connaît depuis 10 minutes ?"
  },
  {
    "id": 10225,
    "category": "brainrot",
    "text": "Qui de nous a les références les plus outdated de l'internet ?"
  },
  {
    "id": 10226,
    "category": "brainrot",
    "text": "Qui de nous est le plus susceptible de faire un \"villain arc\" après une mauvaise journée ?"
  },
  {
    "id": 10227,
    "category": "brainrot",
    "text": "Qui de nous est le principal character de sa propre vie et le sait ?"
  },
  {
    "id": 10228,
    "category": "brainrot",
    "text": "Qui de nous est le plus en mode \"vibe check failed\" quand quelqu'un parle de sujets sérieux ?"
  },
  {
    "id": 10229,
    "category": "brainrot",
    "text": "Qui de nous a la plus longue liste de \"trucs que je ferai plus tard\" qui ne se fait jamais ?"
  },
  {
    "id": 10230,
    "category": "brainrot",
    "text": "Qui de nous est le plus susceptible d'avoir une \"era\" en ce moment ?"
  },
  {
    "id": 10231,
    "category": "brainrot",
    "text": "Qui de nous est le plus likely to fall off après son glow up ?"
  },
  {
    "id": 10232,
    "category": "brainrot",
    "text": "Qui de nous a le discours le plus \"pick me\" sans s'en rendre compte ?"
  },
  {
    "id": 10233,
    "category": "brainrot",
    "text": "Qui de nous est le plus en mode NPC dans les réunions ennuyeuses ?"
  },
  {
    "id": 10234,
    "category": "brainrot",
    "text": "Qui de nous est le plus capable de perdre 2 heures sur un rabbit hole Wikipedia ?"
  },
  {
    "id": 10235,
    "category": "brainrot",
    "text": "Qui de nous est le plus susceptible d'avoir une red flag énorme qu'il/elle appelle \"quirky\" ?"
  },
  {
    "id": 10236,
    "category": "brainrot",
    "text": "Qui de nous est le plus likely to slay l'entretien d'embauche en parlant comme sur Twitter ?"
  },
  {
    "id": 10237,
    "category": "brainrot",
    "text": "Qui de nous fait le plus \"understood the assignment\" dans les situations sociales ?"
  },
  {
    "id": 10238,
    "category": "brainrot",
    "text": "Qui de nous est le plus likely to be \"mother/father\" de son groupe sans s'en rendre compte ?"
  },
  {
    "id": 10239,
    "category": "philo",
    "text": "Qui de nous réfléchit le plus profondément au sens de sa vie ?"
  },
  {
    "id": 10240,
    "category": "philo",
    "text": "Qui de nous a la vision du monde la plus différente des autres dans le groupe ?"
  },
  {
    "id": 10241,
    "category": "philo",
    "text": "Qui de nous serait le plus capable de changer radicalement de vie du jour au lendemain ?"
  },
  {
    "id": 10242,
    "category": "philo",
    "text": "Qui de nous s'adapte le mieux au chaos et à l'incertitude ?"
  },
  {
    "id": 10243,
    "category": "philo",
    "text": "Qui de nous a la plus grande capacité d'empathie réelle ?"
  },
  {
    "id": 10244,
    "category": "philo",
    "text": "Qui de nous est le plus susceptible de remettre en question tout ce qu'il croyait vrai ?"
  },
  {
    "id": 10245,
    "category": "philo",
    "text": "Qui de nous aurait le plus de facilité à accepter sa propre mort ?"
  },
  {
    "id": 10246,
    "category": "philo",
    "text": "Qui de nous a la peur de l'échec la plus paralysante ?"
  },
  {
    "id": 10247,
    "category": "philo",
    "text": "Qui de nous est le plus susceptible d'avoir une crise existentielle dans un supermarché ?"
  },
  {
    "id": 10248,
    "category": "philo",
    "text": "Qui de nous a la relation la plus complexe avec ses propres émotions ?"
  },
  {
    "id": 10249,
    "category": "philo",
    "text": "Qui de nous serait le plus capable de vivre sans aucun but précis et d'en être heureux ?"
  },
  {
    "id": 10250,
    "category": "philo",
    "text": "Qui de nous a le rapport à l'argent le plus sain psychologiquement ?"
  },
  {
    "id": 10251,
    "category": "philo",
    "text": "Qui de nous est le plus susceptible de passer des nuits blanches à penser à des \"et si\" ?"
  },
  {
    "id": 10252,
    "category": "philo",
    "text": "Qui de nous a la capacité d'auto-critique la plus poussée ?"
  },
  {
    "id": 10253,
    "category": "philo",
    "text": "Qui de nous serait le plus à l'aise avec la solitude totale pendant 1 mois ?"
  },
  {
    "id": 10254,
    "category": "philo",
    "text": "Qui de nous a la vision la plus originale du bonheur ?"
  },
  {
    "id": 10255,
    "category": "philo",
    "text": "Qui de nous est le plus susceptible de tenir un journal intime philosophique ?"
  },
  {
    "id": 10256,
    "category": "philo",
    "text": "Qui de nous pardonnerait le plus facilement une trahison majeure ?"
  },
  {
    "id": 10257,
    "category": "philo",
    "text": "Qui de nous a la peur du jugement des autres la plus puissante ?"
  },
  {
    "id": 10258,
    "category": "philo",
    "text": "Qui de nous est le plus capable de distinguer ses vrais désirs de ceux imposés par la société ?"
  },
  {
    "id": 10259,
    "category": "philo",
    "text": "Qui de nous est le plus susceptible de changer d'avis sur des convictions profondes après une discussion ?"
  },
  {
    "id": 10260,
    "category": "philo",
    "text": "Qui de nous a la conception du temps la plus particulière ?"
  },
  {
    "id": 10261,
    "category": "philo",
    "text": "Qui de nous serait le plus à l'aise pour vivre dans un monde sans règles sociales ?"
  },
  {
    "id": 10262,
    "category": "philo",
    "text": "Qui de nous a la relation la plus saine avec ses regrets ?"
  },
  {
    "id": 10263,
    "category": "philo",
    "text": "Qui de nous est le plus capable de faire le deuil d'une version passée de lui-même ?"
  },
  {
    "id": 10264,
    "category": "couple",
    "text": "Qui de nous serait le/la plus possessif(ve) dans une relation ?"
  },
  {
    "id": 10265,
    "category": "couple",
    "text": "Qui de nous enverrait le plus de messages en une journée à son/sa partenaire ?"
  },
  {
    "id": 10266,
    "category": "couple",
    "text": "Qui de nous oublierait le plus souvent les anniversaires de couple ?"
  },
  {
    "id": 10267,
    "category": "couple",
    "text": "Qui de nous ferait la tête le plus longtemps après une dispute ?"
  },
  {
    "id": 10268,
    "category": "couple",
    "text": "Qui de nous est le plus susceptible de stalker le compte de l'ex de son/sa partenaire ?"
  },
  {
    "id": 10269,
    "category": "couple",
    "text": "Qui de nous serait le plus épuisant à gérer dans une relation ?"
  },
  {
    "id": 10270,
    "category": "couple",
    "text": "Qui de nous ferait le/la meilleur(e) partenaire à long terme ?"
  },
  {
    "id": 10271,
    "category": "couple",
    "text": "Qui de nous tomberait amoureux(se) le plus vite ?"
  },
  {
    "id": 10272,
    "category": "couple",
    "text": "Qui de nous souffrirait le plus d'une rupture ?"
  },
  {
    "id": 10273,
    "category": "couple",
    "text": "Qui de nous est le plus susceptible de regretter un ex à 2h du matin ?"
  },
  {
    "id": 10274,
    "category": "couple",
    "text": "Qui de nous enverrait le plus de \"tu penses à moi ?\" la nuit ?"
  },
  {
    "id": 10275,
    "category": "couple",
    "text": "Qui de nous serait le plus jaloux(se) sans raison valable ?"
  },
  {
    "id": 10276,
    "category": "couple",
    "text": "Qui de nous ferait le plus de scènes dans un lieu public ?"
  },
  {
    "id": 10277,
    "category": "couple",
    "text": "Qui de nous aurait le plus de mal à présenter son/sa partenaire à ses parents ?"
  },
  {
    "id": 10278,
    "category": "couple",
    "text": "Qui de nous est le plus susceptible de lire les messages de l'autre en douce ?"
  },
  {
    "id": 10279,
    "category": "couple",
    "text": "Qui de nous serait le plus \"love bombing\" au début d'une relation ?"
  },
  {
    "id": 10280,
    "category": "couple",
    "text": "Qui de nous tomberait plus souvent amoureux(se) de quelqu'un de complètement incompatible ?"
  },
  {
    "id": 10281,
    "category": "couple",
    "text": "Qui de nous ferait le plus d'efforts pour surprendre son/sa partenaire ?"
  },
  {
    "id": 10282,
    "category": "couple",
    "text": "Qui de nous est le plus attachant(e) mais aussi le/la plus difficile à aimer au quotidien ?"
  },
  {
    "id": 10283,
    "category": "couple",
    "text": "Qui de nous serait le plus susceptible de sortir gagnant(e) d'une négociation de couple sur où partir en vacances ?"
  },
  {
    "id": 10284,
    "category": "couple",
    "text": "Qui de nous serait le plus compliqué à vivre sous le même toit ?"
  },
  {
    "id": 10285,
    "category": "couple",
    "text": "Qui de nous a le plus de red flags que l'amour ferait ignorer ?"
  },
  {
    "id": 10286,
    "category": "couple",
    "text": "Qui de nous enverrait le plus de \"je t'aime\" au mauvais moment ?"
  },
  {
    "id": 10287,
    "category": "couple",
    "text": "Qui de nous est le plus susceptible de tomber amoureux(se) d'un(e) ami(e) en secret ?"
  },
  {
    "id": 10288,
    "category": "couple",
    "text": "Qui de nous est le plus susceptible de faire une déclaration d'amour désastreuse mais touchante ?"
  },
  {
    "id": 10289,
    "category": "couple",
    "text": "Qui de nous est le plus susceptible de pleurer lors d'une rupture même si c'est lui/elle qui rompt ?"
  },
  {
    "id": 10290,
    "category": "couple",
    "text": "Qui de nous a le cœur artichaut le plus prononcé ?"
  },
  {
    "id": 10291,
    "category": "dark",
    "text": "Qui de nous serait le plus susceptible d'être une menace pour la société si les lois disparaissaient ?"
  },
  {
    "id": 10292,
    "category": "dark",
    "text": "Qui de nous serait le premier à vendre ses organes si l'argent manquait vraiment ?"
  },
  {
    "id": 10293,
    "category": "dark",
    "text": "Qui de nous deviendrait le/la plus gros/se criminel(le) si le monde s'effondrait ?"
  },
  {
    "id": 10294,
    "category": "dark",
    "text": "Qui de nous aurait le cri de guerre le plus ridicule dans une bagarre ?"
  },
  {
    "id": 10295,
    "category": "dark",
    "text": "Qui de nous est le plus susceptible de rejoindre un gang par erreur ?"
  },
  {
    "id": 10296,
    "category": "dark",
    "text": "Qui de nous aurait le plan de vengeance le plus élaboré pour un rien ?"
  },
  {
    "id": 10297,
    "category": "dark",
    "text": "Qui de nous serait éliminé en premier dans une dystopie à la Hunger Games ?"
  },
  {
    "id": 10298,
    "category": "dark",
    "text": "Qui de nous aurait le biais de survie le plus dangereux ?"
  },
  {
    "id": 10299,
    "category": "dark",
    "text": "Qui de nous serait le dernier debout dans un monde post-apocalyptique... et uniquement grâce à sa lâcheté ?"
  },
  {
    "id": 10300,
    "category": "dark",
    "text": "Qui de nous est le plus susceptible d'avoir un plan pour un faux décès et une nouvelle vie ailleurs ?"
  },
  {
    "id": 10301,
    "category": "dark",
    "text": "Qui de nous serait le plus susceptible de devenir un ennemi dans un jeu vidéo si les personnages avaient nos personnalités ?"
  },
  {
    "id": 10302,
    "category": "dark",
    "text": "Qui de nous serait le plus manipulateur(trice) dans un scénario de survie ?"
  },
  {
    "id": 10303,
    "category": "dark",
    "text": "Qui de nous a les pensées les plus sombres lors d'un vol en avion avec des turbulences ?"
  },
  {
    "id": 10304,
    "category": "dark",
    "text": "Qui de nous a le sens de l'humour noir le plus développé et l'assume le moins ?"
  },
  {
    "id": 10305,
    "category": "dark",
    "text": "Qui de nous aurait le discours de fin de monde le plus inspirant... ou le plus catastrophique ?"
  },
  {
    "id": 10306,
    "category": "dark",
    "text": "Qui de nous est le plus susceptible de devenir vilain dans une histoire à cause d'une injustice mineure ?"
  },
  {
    "id": 10307,
    "category": "dark",
    "text": "Qui de nous serait le plus capable de garder le moral dans une catastrophe totale ?"
  },
  {
    "id": 10308,
    "category": "dark",
    "text": "Qui de nous a déjà eu une pensée incongrûment drôle lors d'un moment grave ?"
  },
  {
    "id": 10309,
    "category": "dark",
    "text": "Qui de nous est le plus susceptible d'écrire ses mémoires sous le titre \"Comment j'ai tout raté avec style\" ?"
  },
  {
    "id": 10310,
    "category": "dark",
    "text": "Qui de nous aurait le plus haut score dans un jeu de survie sans scrupules moraux ?"
  },
  {
    "id": 10311,
    "category": "dark",
    "text": "Qui de nous serait le plus à l'aise pour faire un toast d'enterrement qui fait rire et pleurer en même temps ?"
  },
  {
    "id": 10312,
    "category": "dark",
    "text": "Qui de nous est le plus susceptible d'aller en enfer selon sa propre religion ou morale ?"
  },
  {
    "id": 10313,
    "category": "cringe",
    "text": "Qui de nous est le plus susceptible d'avoir une phase emo cachée dans son passé ?"
  },
  {
    "id": 10314,
    "category": "cringe",
    "text": "Qui de nous a eu le pseudo internet le plus honteux ?"
  },
  {
    "id": 10315,
    "category": "cringe",
    "text": "Qui de nous a eu la phase de mode la plus catastrophique ?"
  },
  {
    "id": 10316,
    "category": "cringe",
    "text": "Qui de nous a encore des photos de lui/elle sur un forum des années 2000 ?"
  },
  {
    "id": 10317,
    "category": "cringe",
    "text": "Qui de nous était le plus bizarre au collège ?"
  },
  {
    "id": 10318,
    "category": "cringe",
    "text": "Qui de nous a essayé le plus de trends inutiles sur les réseaux ?"
  },
  {
    "id": 10319,
    "category": "cringe",
    "text": "Qui de nous a eu la pire séquence dans un exposé scolaire ?"
  },
  {
    "id": 10320,
    "category": "cringe",
    "text": "Qui de nous a eu la déclaration d'amour la plus gênante de toute l'histoire ?"
  },
  {
    "id": 10321,
    "category": "cringe",
    "text": "Qui de nous est le plus susceptible d'avoir fait du fan-fiction sur ses artistes préférés ?"
  },
  {
    "id": 10322,
    "category": "cringe",
    "text": "Qui de nous a eu la coloration de cheveux ou la coupe la plus regrettable ?"
  },
  {
    "id": 10323,
    "category": "cringe",
    "text": "Qui de nous a le journal intime le plus honteux s'il existe encore ?"
  },
  {
    "id": 10324,
    "category": "cringe",
    "text": "Qui de nous était le plus en mode \"je suis différent des autres\" au lycée ?"
  },
  {
    "id": 10325,
    "category": "cringe",
    "text": "Qui de nous a créé un compte \"musique\" ou \"humour\" qui a complètement flop ?"
  },
  {
    "id": 10326,
    "category": "cringe",
    "text": "Qui de nous a eu la phase de citations philosophiques en bio Instagram ?"
  },
  {
    "id": 10327,
    "category": "cringe",
    "text": "Qui de nous a eu une situation où il/elle a voulu changer de ville après tellement c'était gênant ?"
  },
  {
    "id": 10328,
    "category": "cringe",
    "text": "Qui de nous a eu la tentative de drague la plus catastrophique ?"
  },
  {
    "id": 10329,
    "category": "cringe",
    "text": "Qui de nous a eu la danse la plus embarrassante filmée dans sa vie ?"
  },
  {
    "id": 10330,
    "category": "cringe",
    "text": "Qui de nous a eu le moment où il/elle s'est fait recalé(e) de la façon la plus humiliante ?"
  },
  {
    "id": 10331,
    "category": "cringe",
    "text": "Qui de nous a le plus de publications Instagram qu'il/elle a supprimées ?"
  },
  {
    "id": 10332,
    "category": "cringe",
    "text": "Qui de nous est le plus susceptible de ne JAMAIS regarder ses vieilles photos par honte ?"
  },
  {
    "id": 10333,
    "category": "cringe",
    "text": "Qui de nous a eu la conversation la plus gênante avec ses parents sur des sujets sensibles ?"
  },
  {
    "id": 10334,
    "category": "cringe",
    "text": "Qui de nous est le plus susceptible d'avoir essayé une tendance musicale qui ne lui correspondait absolument pas ?"
  },
  {
    "id": 10335,
    "category": "cringe",
    "text": "Qui de nous a fait le salut militaire à son prof par erreur ?"
  },
  {
    "id": 10336,
    "category": "cringe",
    "text": "Qui de nous a répondu \"toi aussi\" quand le serveur disait \"bon appétit\" ?"
  },
  {
    "id": 10337,
    "category": "cringe",
    "text": "Qui de nous est le plus susceptible d'appeler son prof \"maman\" ou \"papa\" accidentellement ?"
  },
  {
    "id": 10338,
    "category": "random",
    "text": "Qui de nous gagnerait une course contre une autruche ?"
  },
  {
    "id": 10339,
    "category": "random",
    "text": "Qui de nous serait le plus efficace comme personnage de dessin animé ?"
  },
  {
    "id": 10340,
    "category": "random",
    "text": "Qui de nous aurait la maison la plus absurde si l'argent était infini ?"
  },
  {
    "id": 10341,
    "category": "random",
    "text": "Qui de nous serait le plus utile dans un film de super-héros... comme sidekick ?"
  },
  {
    "id": 10342,
    "category": "random",
    "text": "Qui de nous choisirait le super-pouvoir le plus inutile ?"
  },
  {
    "id": 10343,
    "category": "random",
    "text": "Qui de nous serait le champion de la pétanque mondiale ?"
  },
  {
    "id": 10344,
    "category": "random",
    "text": "Qui de nous deviendrait dictateur d'un pays absurdement petit ?"
  },
  {
    "id": 10345,
    "category": "random",
    "text": "Qui de nous ouvrirait le restaurant le plus bizarre du monde ?"
  },
  {
    "id": 10346,
    "category": "random",
    "text": "Qui de nous serait le plus choqué de se retrouver dans les années 50 ?"
  },
  {
    "id": 10347,
    "category": "random",
    "text": "Qui de nous inventerait le gadget le plus inutile qui se vend super bien ?"
  },
  {
    "id": 10348,
    "category": "random",
    "text": "Qui de nous serait le plus efficace comme personnage de jeu mobile gratuit ?"
  },
  {
    "id": 10349,
    "category": "random",
    "text": "Qui de nous deviendrait la vedette d'un documentaire sur les gens étranges ?"
  },
  {
    "id": 10350,
    "category": "random",
    "text": "Qui de nous serait le plus capable de manger un burger entier en un seul morceau ?"
  },
  {
    "id": 10351,
    "category": "random",
    "text": "Qui de nous serait le plus adapté pour vivre dans les années 80 ?"
  },
  {
    "id": 10352,
    "category": "random",
    "text": "Qui de nous remporterait un championnat de sieste ?"
  },
  {
    "id": 10353,
    "category": "random",
    "text": "Qui de nous réinventerait le pain de mie et gagnerait un million ?"
  },
  {
    "id": 10354,
    "category": "random",
    "text": "Qui de nous est le plus susceptible de claquer toute sa fortune en billets de loto ?"
  },
  {
    "id": 10355,
    "category": "random",
    "text": "Qui de nous deviendrait le/la meilleur(e) présentateur(trice) météo du monde ?"
  },
  {
    "id": 10356,
    "category": "random",
    "text": "Qui de nous serait le plus efficace pour trier des bonbons par couleur à toute vitesse ?"
  },
  {
    "id": 10357,
    "category": "random",
    "text": "Qui de nous survivrait le plus longtemps dans un film de survie sous-marine ?"
  },
  {
    "id": 10358,
    "category": "random",
    "text": "Qui de nous gagnerait un concours de grimaces professionnel ?"
  },
  {
    "id": 10359,
    "category": "random",
    "text": "Qui de nous serait le plus difficile à convaincre de changer de coupe de cheveux ?"
  },
  {
    "id": 10360,
    "category": "random",
    "text": "Qui de nous est le plus susceptible de collectionner des boules à neige ?"
  },
  {
    "id": 10361,
    "category": "random",
    "text": "Qui de nous deviendrait le YouTubeur le plus bizarre mais le plus suivi ?"
  },
  {
    "id": 10362,
    "category": "random",
    "text": "Qui de nous serait le mieux placé pour être coach de développement personnel totalement douteux ?"
  },
  {
    "id": 10363,
    "category": "random",
    "text": "Qui de nous est le plus likely to apparaître dans une pub télévisée sans l'avoir prévu ?"
  },
  {
    "id": 10364,
    "category": "random",
    "text": "Qui de nous serait le plus à l'aise dans un concours de déguisement ?"
  },
  {
    "id": 10365,
    "category": "random",
    "text": "Qui de nous deviendrait consultant en \"vibes\" si ce métier existait officiellement ?"
  }
];
