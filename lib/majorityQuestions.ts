// Dataset issu de Majorité.md, partagé par les modes Majorité et Minorité.

export type MajorityCategory =
  | "food"
  | "internet"
  | "party"
  | "gaming"
  | "relationships"
  | "work"
  | "travel"
  | "opinions"
  | "chaos"
  | "rapid";

export interface MajorityCategoryMeta {
  id: MajorityCategory;
  label: string;
  emoji: string;
  description: string;
  adult: boolean;
}

export interface MajorityQuestion {
  id: number;
  category: MajorityCategory;
  text: string;
  options: string[];
}

export const MAJORITY_CATEGORIES: MajorityCategoryMeta[] = [
  { id: "food", label: "Food", emoji: "🍟", adult: false, description: "Fast-food, snacks et débats de table." },
  { id: "internet", label: "Internet", emoji: "📱", adult: false, description: "Apps, mèmes et habitudes en ligne." },
  { id: "party", label: "Soirée", emoji: "🎉", adult: false, description: "Ambiance, invités et chaos collectif." },
  { id: "gaming", label: "Gaming", emoji: "🎮", adult: false, description: "Jeux, ragequit et multiplayer." },
  { id: "relationships", label: "Relations", emoji: "💬", adult: false, description: "Dates, messages et red flags." },
  { id: "work", label: "Études / travail", emoji: "📚", adult: false, description: "Profs, collègues et excuses éclatées." },
  { id: "travel", label: "Voyage", emoji: "✈️", adult: false, description: "Vacances, transports et galères." },
  { id: "opinions", label: "Opinions", emoji: "⚡", adult: false, description: "Petites polémiques du quotidien." },
  { id: "chaos", label: "Chaos", emoji: "🌀", adult: false, description: "Absurde, objets inutiles et pouvoirs nuls." },
  { id: "rapid", label: "Bonus rapides", emoji: "⏱️", adult: false, description: "Questions immédiates pour mode ultra rapide." },
];

export const MAJORITY_QUESTIONS: MajorityQuestion[] = [
  { id: 20001, category: "food", text: "Le meilleur fast-food ?", options: ["McDo", "Burger King", "KFC", "Subway"] },
  { id: 20002, category: "food", text: "Le pire fast-food à 3h du matin ?", options: ["Taco Bell", "Kebab douteux", "Burger froid", "Sandwich triangle"] },
  { id: 20003, category: "food", text: "Le meilleur dessert ?", options: ["Tiramisu", "Fondant chocolat", "Cheesecake", "Crêpes"] },
  { id: 20004, category: "food", text: "Le pire légume ?", options: ["Choux de Bruxelles", "Endives", "Céleri", "Betterave"] },
  { id: 20005, category: "food", text: "Le meilleur snack devant un film ?", options: ["Pop-corn", "Chips", "Pizza", "Bonbons"] },
  { id: 20006, category: "food", text: "Le pire goût de chips ?", options: ["Vinaigre", "Pickles", "Ketchup", "Nature"] },
  { id: 20007, category: "food", text: "Le meilleur soda ?", options: ["Coca", "Ice Tea", "Fanta", "Sprite"] },
  { id: 20008, category: "food", text: "Le pire aliment à sentir ?", options: ["Maroilles", "Surströmming", "Thon chaud", "Œuf dur"] },
  { id: 20009, category: "food", text: "Le meilleur repas de lendemain de soirée ?", options: ["Kebab", "Burger", "Pâtes", "Pizza"] },
  { id: 20010, category: "food", text: "Ce qu'on commande le plus en livraison ?", options: ["Pizza", "Sushi", "Burger", "Tacos"] },
  { id: 20011, category: "food", text: "Le meilleur goût de glace ?", options: ["Vanille", "Chocolat", "Pistache", "Fraise"] },
  { id: 20012, category: "food", text: "Le pire mélange alimentaire ?", options: ["Pizza-ananas", "Frites-glace", "Lait-orange", "Mayo-pâtes"] },
  { id: 20013, category: "food", text: "Le meilleur petit-déjeuner ?", options: ["Viennoiseries", "Pancakes", "Céréales", "Œufs bacon"] },
  { id: 20014, category: "food", text: "Le pire plat de cantine ?", options: ["Poisson pané", "Purée grise", "Haricots mous", "Raviolis froids"] },
  { id: 20015, category: "food", text: "Le meilleur type de pâtes ?", options: ["Carbonara", "Bolognaise", "Pesto", "4 fromages"] },
  { id: 20016, category: "food", text: "Le pire bonbon ?", options: ["Réglisse", "Banane chimique", "Dragibus noir", "Menthe forte"] },
  { id: 20017, category: "food", text: "Ce qu'on pourrait manger tous les jours ?", options: ["Pizza", "Pâtes", "Sushi", "Tacos"] },
  { id: 20018, category: "food", text: "Le meilleur chocolat ?", options: ["Noir", "Lait", "Blanc", "Noisette"] },

  { id: 20101, category: "internet", text: "L'application la plus addictive ?", options: ["TikTok", "Instagram", "YouTube", "X/Twitter"] },
  { id: 20102, category: "internet", text: "Le pire réseau social ?", options: ["Facebook", "Snapchat", "TikTok", "LinkedIn"] },
  { id: 20103, category: "internet", text: "Le pire emoji ?", options: ["😂", "😭", "🤡", "👍"] },
  { id: 20104, category: "internet", text: "L'application la plus ouverte automatiquement ?", options: ["Instagram", "TikTok", "Messages", "YouTube"] },
  { id: 20105, category: "internet", text: "Le pire spam de groupe ?", options: ["?", "Vu", "Sticker random", "Vocal de 3 minutes"] },
  { id: 20106, category: "internet", text: "Le meilleur contenu YouTube ?", options: ["Documentaires", "Gaming", "Podcasts", "True crime"] },
  { id: 20107, category: "internet", text: "Le pire son TikTok ?", options: ["Remix accéléré", "Voix IA", "Techno saturée", "Oh no"] },
  { id: 20108, category: "internet", text: "Ce qu'on regarde tous sans assumer ?", options: ["Télé-réalité", "ASMR", "Drama TikTok", "Mukbang"] },
  { id: 20109, category: "internet", text: "Le réseau social le plus toxique ?", options: ["Twitter/X", "TikTok", "Reddit", "Facebook"] },
  { id: 20110, category: "internet", text: "Le meilleur type de meme ?", options: ["Absurde", "Dark humor", "Animaux", "Références gaming"] },
  { id: 20111, category: "internet", text: "Le pire commentaire internet ?", options: ["Premier", "Ratio", "Qui regarde en 2026 ?", "Fake"] },
  { id: 20112, category: "internet", text: "Ce qu'on fait tous sur internet ?", options: ["Stalker des profils", "Lire les commentaires", "Scroller 2h sans raison", "Oublier pourquoi on a ouvert l'app"] },

  { id: 20201, category: "party", text: "Le pire comportement en soirée ?", options: ["Casser l'ambiance", "Vomir partout", "Monopoliser l'enceinte", "Disparaître"] },
  { id: 20202, category: "party", text: "Le meilleur jeu de soirée ?", options: ["Beer pong", "Loups-garous", "Jungle Speed", "Action vérité"] },
  { id: 20203, category: "party", text: "Celui qui finit toujours trop alcoolisé ?", options: ["Le discret", "Le plus bruyant", "Celui qui mélange tout", "Celui qui boit vite"] },
  { id: 20204, category: "party", text: "Le pire son pour lancer une soirée ?", options: ["Techno agressive", "Musique triste", "Remix bizarre", "Hardstyle à fond"] },
  { id: 20205, category: "party", text: "Ce qui tue immédiatement l'ambiance ?", options: ["Coupure musique", "Dispute", "Police", "Téléphone aux parents"] },
  { id: 20206, category: "party", text: "Le meilleur snack de fin de soirée ?", options: ["Tacos", "Pizza froide", "Nouilles instantanées", "McDo"] },
  { id: 20207, category: "party", text: "Le pire voisin de soirée ?", options: ["Celui qui appelle les flics", "Celui qui regarde par la fenêtre", "Celui qui se plaint tout le temps", "Celui qui rejoint sans invitation"] },
  { id: 20208, category: "party", text: "Le meilleur duo alcool + soft ?", options: ["Vodka Red Bull", "Rhum Coca", "Gin tonic", "Whisky Coca"] },
  { id: 20209, category: "party", text: "Ce qu'on regrette le plus le lendemain ?", options: ["Les messages", "Les stories", "Les dépenses", "Les shots de trop"] },
  { id: 20210, category: "party", text: "Le pire invité ?", options: ["Celui qui juge tout", "Celui qui casse des trucs", "Celui qui dort sur place", "Celui qui drague tout le monde"] },

  { id: 20301, category: "gaming", text: "Le jeu le plus rageant ?", options: ["FIFA", "League of Legends", "Call of Duty", "Mario Kart"] },
  { id: 20302, category: "gaming", text: "Le meilleur jeu multijoueur ?", options: ["Minecraft", "GTA Online", "Fortnite", "Valorant"] },
  { id: 20303, category: "gaming", text: "Le pire teammate ?", options: ["AFK", "Rageux", "Micro ouvert", "Troll"] },
  { id: 20304, category: "gaming", text: "Le jeu qui détruit le plus les amitiés ?", options: ["Mario Party", "Monopoly", "UNO", "LoL"] },
  { id: 20305, category: "gaming", text: "Le meilleur jeu nostalgique ?", options: ["Minecraft", "Wii Sports", "Pokémon", "Mario Kart Wii"] },
  { id: 20306, category: "gaming", text: "Le pire ragequit ?", options: ["Débrancher la console", "Quitter Discord", "Insulter puis partir", "Éteindre le PC"] },
  { id: 20307, category: "gaming", text: "Le meilleur jeu à jouer bourré ?", options: ["Mario Kart", "Gang Beasts", "Fall Guys", "Among Us"] },
  { id: 20308, category: "gaming", text: "Le pire type de gamer ?", options: ["Tryhard toxique", "Smurf", "Camper", "Rageux"] },
  { id: 20309, category: "gaming", text: "Le jeu le plus chronophage ?", options: ["Minecraft", "LoL", "WoW", "GTA RP"] },
  { id: 20310, category: "gaming", text: "Le meilleur boss de jeu vidéo ?", options: ["Dark Souls", "Elden Ring", "Zelda", "God of War"] },

  { id: 20401, category: "relationships", text: "Le pire red flag ?", options: ["Jaloux excessif", "Contrôle le téléphone", "Ne répond jamais", "Ment souvent"] },
  { id: 20402, category: "relationships", text: "Le meilleur green flag ?", options: ["Communication", "Humour", "Gentillesse", "Confiance"] },
  { id: 20403, category: "relationships", text: "Le pire premier date ?", options: ["Malaise total", "Téléphone constant", "Retard énorme", "Silence gênant"] },
  { id: 20404, category: "relationships", text: "Le meilleur lieu pour un date ?", options: ["Restaurant", "Cinéma", "Café", "Balade"] },
  { id: 20405, category: "relationships", text: "Le pire message à recevoir ?", options: ["Faut qu'on parle", "Tu dors ? à 3h", "On reste amis ?", "Vu"] },
  { id: 20406, category: "relationships", text: "Le pire comportement après rupture ?", options: ["Stalker", "Poster des stories tristes", "Revenir bourré", "Supprimer puis rajouter"] },
  { id: 20407, category: "relationships", text: "Le pire profil Tinder ?", options: ["Photos floues", "Bio vide", "Je réponds jamais", "Citation gênante"] },
  { id: 20408, category: "relationships", text: "Le meilleur compliment ?", options: ["Drôle", "Beau/belle", "Intelligent", "Charismatique"] },
  { id: 20409, category: "relationships", text: "Ce qui détruit le plus un couple ?", options: ["Mensonge", "Routine", "Jalousie", "Mauvaise communication"] },
  { id: 20410, category: "relationships", text: "Le pire ghosting ?", options: ["Après plusieurs mois", "Après un date", "Après je t'aime", "Après avoir prévu des vacances"] },

  { id: 20501, category: "work", text: "Le pire prof ?", options: ["Celui qui lit le diapo", "Celui qui humilie", "Celui qui parle trop bas", "Celui qui donne trop de devoirs"] },
  { id: 20502, category: "work", text: "La pire excuse de retard ?", options: ["Réveil cassé", "Bus raté", "Chat malade", "J'ai oublié"] },
  { id: 20503, category: "work", text: "Le pire collègue ?", options: ["Faux sympa", "Bruyant", "Fainéant", "Donneur de leçons"] },
  { id: 20504, category: "work", text: "Le pire jour de la semaine ?", options: ["Lundi", "Mardi", "Jeudi", "Dimanche soir"] },
  { id: 20505, category: "work", text: "La pire matière scolaire ?", options: ["Maths", "Philo", "Histoire", "Physique"] },
  { id: 20506, category: "work", text: "Le meilleur métier de rêve ?", options: ["Streamer", "Entrepreneur", "Pilote", "Voyageur pro"] },
  { id: 20507, category: "work", text: "Ce qu'on oublie toujours avant un examen ?", options: ["Carte étudiante", "Stylo", "Calculatrice", "Réviser un chapitre"] },
  { id: 20508, category: "work", text: "Le pire open-space ?", options: ["Bruyant", "Sans fenêtres", "Trop lumineux", "Trop petit"] },

  { id: 20601, category: "travel", text: "Le pire siège dans un avion ?", options: ["Milieu", "Fond", "Devant toilettes", "Sans hublot"] },
  { id: 20602, category: "travel", text: "Le pire voisin de transport ?", options: ["Celui qui parle fort", "Celui qui mange fort", "Celui qui prend toute la place", "Celui qui sent mauvais"] },
  { id: 20603, category: "travel", text: "Le meilleur type de vacances ?", options: ["Plage", "Roadtrip", "Ville", "Montagne"] },
  { id: 20604, category: "travel", text: "Le pire Airbnb ?", options: ["Sale", "Minuscule", "Bruyant", "Pas conforme aux photos"] },
  { id: 20605, category: "travel", text: "Ce qu'on oublie le plus en voyage ?", options: ["Chargeur", "Brosse à dents", "Passeport", "Sous-vêtements"] },
  { id: 20606, category: "travel", text: "Le meilleur moyen de transport ?", options: ["Avion", "Train", "Voiture", "Van"] },
  { id: 20607, category: "travel", text: "Le pire touriste ?", options: ["Bruyant", "Impoli", "Influenceur", "Celui qui se plaint"] },
  { id: 20608, category: "travel", text: "Le meilleur pays pour manger ?", options: ["Italie", "Japon", "France", "Mexique"] },

  { id: 20701, category: "opinions", text: "L'ananas sur la pizza ?", options: ["Excellent", "Acceptable", "Crime", "Dépend du mood"] },
  { id: 20702, category: "opinions", text: "Dormir avec des chaussettes ?", options: ["Oui", "Non", "Seulement l'hiver", "Psychopathe"] },
  { id: 20703, category: "opinions", text: "Les gens qui applaudissent dans l'avion ?", options: ["Normaux", "Gênants", "Drôles", "Inutiles"] },
  { id: 20704, category: "opinions", text: "Pain au chocolat ou chocolatine ?", options: ["Pain au chocolat", "Chocolatine", "Les deux", "Peu importe"] },
  { id: 20705, category: "opinions", text: "Les vocaux de plus de 2 minutes ?", options: ["Acceptables", "Horribles", "Ça dépend", "Jamais"] },
  { id: 20706, category: "opinions", text: "Le téléphone à table ?", options: ["Normal", "Impoli", "Dépend du contexte", "Tout le monde le fait"] },
  { id: 20707, category: "opinions", text: "Dormir avec la télé ?", options: ["Relaxant", "Impossible", "Bruyant", "Dépend de la fatigue"] },
  { id: 20708, category: "opinions", text: "Les spoilers involontaires ?", options: ["Grave", "Pas si grave", "Drôle", "Impardonnable"] },
  { id: 20709, category: "opinions", text: "Regarder une série déjà vue ?", options: ["Réconfortant", "Perte de temps", "Dépend de la série", "Toujours oui"] },
  { id: 20710, category: "opinions", text: "Les gens qui marchent lentement ?", options: ["Insupportables", "Relax", "Normaux", "Stressants"] },

  { id: 20801, category: "chaos", text: "Le meilleur objet dans une apocalypse ?", options: ["Briquet", "Couteau", "Gourde", "Vélo"] },
  { id: 20802, category: "chaos", text: "Le pire super-pouvoir ?", options: ["Lire les pensées en permanence", "Être invisible mais nu", "Voler très lentement", "Parler aux poissons"] },
  { id: 20803, category: "chaos", text: "Le meilleur talent inutile ?", options: ["Imiter des sons", "Équilibrer des objets", "Siffler fort", "Faire tourner un stylo"] },
  { id: 20804, category: "chaos", text: "Le pire déguisement possible ?", options: ["Bébé géant", "Hot-dog", "Clown triste", "Dinosaure gonflable"] },
  { id: 20805, category: "chaos", text: "Le pire endroit pour rester bloqué ?", options: ["Ascenseur", "Toilettes publiques", "Téléphérique", "IKEA"] },
  { id: 20806, category: "chaos", text: "Le meilleur objet inutile ?", options: ["Mini ventilateur USB", "Lampe RGB", "Katana décoratif", "Casque LED"] },
  { id: 20807, category: "chaos", text: "Le pire pouvoir magique ?", options: ["Voir 5 secondes dans le futur", "Transformer l'eau en jus tiède", "Parler aux moustiques", "Faire pousser l'herbe plus vite"] },
  { id: 20808, category: "chaos", text: "Le pire achat impulsif ?", options: ["Crypto douteuse", "Épée décorative", "Machine à barbe à papa", "NFT"] },

  { id: 20901, category: "rapid", text: "Le meilleur type de météo ?", options: ["Soleil", "Orage", "Neige", "Pluie légère"] },
  { id: 20902, category: "rapid", text: "Le pire réveil du matin ?", options: ["Alarme agressive", "Appel", "Chantier", "Chien qui aboie"] },
  { id: 20903, category: "rapid", text: "Le meilleur animal domestique ?", options: ["Chien", "Chat", "Lapin", "Oiseau"] },
  { id: 20904, category: "rapid", text: "Le pire bruit ?", options: ["Craie tableau", "Bébé qui pleure", "Alarme incendie", "Moustique la nuit"] },
  { id: 20905, category: "rapid", text: "Le meilleur film à revoir ?", options: ["Harry Potter", "Interstellar", "Shrek", "Le Seigneur des Anneaux"] },
  { id: 20906, category: "rapid", text: "Le pire comportement au cinéma ?", options: ["Téléphone lumineux", "Parler fort", "Donner des spoilers", "Manger bruyamment"] },
  { id: 20907, category: "rapid", text: "Le meilleur type de soirée ?", options: ["Chill", "Grosse fête", "Jeux de société", "Bar"] },
  { id: 20908, category: "rapid", text: "Le pire achat inutile ?", options: ["Gadget TikTok", "Lampe RGB", "Objet AliExpress", "Abonnement oublié"] },
  { id: 20909, category: "rapid", text: "Le meilleur feeling ?", options: ["Fin des examens", "Douche après sport", "Lit propre", "Salaire reçu"] },
  { id: 20910, category: "rapid", text: "Le pire feeling ?", options: ["Message faut qu'on parle", "Réveil lundi matin", "Batterie à 1%", "Internet coupé"] },
];
